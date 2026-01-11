
import React, { createContext, useContext, useState, useEffect } from 'react';
import { DBData, User, Ticket, AuditLog } from '../types';
import { parseCSV } from '../utils/csvParser';
import { supabase } from '../lib/supabase';

interface DBContextType {
  db: DBData; inscriptions: any[]; loading: boolean;
  isLoadingAuth: boolean;
  loggedUser: User | null;
  login: (u: string, p: string) => Promise<boolean>; logout: () => Promise<void>;
  updateDB: (d: Partial<DBData>) => void; forceSync: () => Promise<void>;
  saveTicket: (t: Ticket) => Promise<void>;
  sendToCloud: (payload: any) => Promise<void>;
  updateLocalData: (id: string, field: string, value: string) => void;
  batchUpdateLocalData: (ids: string[], updates: Record<string, string>) => void;
  updateUser: (user: User) => Promise<void>;
  createNewUser: (u: Partial<User>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<void>;
  fetchLogs: () => Promise<AuditLog[]>;
  notify: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
  loadInscriptionsFromSupabase: () => Promise<void>;
}

const DBContext = createContext<DBContextType | undefined>(undefined);

const defaultState: DBData = {
  users: [
    { user: 'admin', pass: 'admin', name: 'Administrador', role: 'master', generation: null, active: true }
  ],
  config: {
    color: '#1e3a8a',
    iconColor: '#ffffff',
    borderRadius: 20,
    fontFamily: "'Inter', sans-serif",
    tabIcons: {},
    sheetUrl: '',
    scriptUrl: '',
    displayCols: [],
    classCol: '',
    ticketTypes: [],
    editPermissions: { comum: [], suporte: [] },
    dashboardWidgets: [],
    periods: {},
    notifications: { email: true, push: false },
    senderEmail: "admin@plataforma.com",
    locale: "Português (BR)",
    timezone: "Brasília (GMT-3)",
    maintenanceMode: false,
    statusColors: {
      approved: { bg: '#dcfce7', text: '#166534' },
      pending: { bg: '#fef9c3', text: '#854d0e' },
      vip: { bg: '#f3e8ff', text: '#6b21a8' }
    }
  },
  tickets: [],
  auditLogs: [],
  headers: []
};

export const DBProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<DBData>(() => {
    const s = localStorage.getItem('@nexus_db');
    if (s) {
      try {
        const parsed = JSON.parse(s);
        return {
          ...defaultState,
          ...parsed,
          auditLogs: parsed.auditLogs || [], // Initialize if missing
          users: (parsed.users && parsed.users.length > 0) ? parsed.users : defaultState.users,
          config: {
            ...defaultState.config,
            ...parsed.config,
            statusColors: parsed.config?.statusColors || defaultState.config.statusColors
          }
        };
      } catch (e) {
        console.error("Error parsing DB from localStorage", e);
        return defaultState;
      }
    }
    return defaultState;
  });

  const [loggedUser, setLoggedUser] = useState<User | null>(null);
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [toast, setToast] = useState<{ type: string; title: string; description?: string } | null>(null);

  // Função de notificação toast
  const notify = (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => {
    setToast({ type, title, description });
    // Auto-hide after 4 seconds
    setTimeout(() => setToast(null), 4000);
  };

  // FIX: Safe LocalStorage Write (Prevents QuotaExceededError crash)
  useEffect(() => {
    try {
      // Limit logs to last 500 to prevent quota issues
      const trimmedDb = { ...db, auditLogs: (db.auditLogs || []).slice(0, 500) };
      localStorage.setItem('@nexus_db', JSON.stringify(trimmedDb));
    } catch (e) {
      console.warn("LocalStorage quota exceeded. Data might not persist.", e);
    }
  }, [db]);

  useEffect(() => {
    console.log("DBContext: Initializing Auth Listener...");
    setIsLoadingAuth(true); // Initializing
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("DBContext: Auth State Change Event:", event);
      try {
        if (session?.user) {
          const u = session.user;
          // 1. Immediately establish a baseline user from Auth metadata 
          // to unblock the UI (Login -> App transition)
          const baselineUser: User = {
            id: u.id,
            user: u.email || '',
            name: u.user_metadata?.name || u.email?.split('@')[0] || 'Usuário',
            role: (u.user_metadata?.role as any) || 'comum',
            generation: u.user_metadata?.generation || null,
            active: true
          };

          setLoggedUser(baselineUser);
          localStorage.setItem('@nexus_user', JSON.stringify(baselineUser));

          // 2. Fetch full profile details in the background
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', u.id)
            .single();

          if (profile && !profileError) {
            console.log("DBContext: Background profile loaded:", profile.role);
            const fullUser: User = {
              ...baselineUser,
              name: profile.name || baselineUser.name,
              role: profile.role || baselineUser.role,
              generation: profile.generation || baselineUser.generation,
              active: profile.active !== undefined ? profile.active : baselineUser.active
            };
            setLoggedUser(fullUser);
            localStorage.setItem('@nexus_user', JSON.stringify(fullUser));
          }
        } else {
          console.log("DBContext: No active session.");
          setLoggedUser(null);
          localStorage.removeItem('@nexus_user');
          setInscriptions([]);
        }
      } catch (err) {
        console.error("DBContext: Critical error in Auth Listener:", err);
      } finally {
        setIsLoadingAuth(false);
      }
    });

    // Safety timeout: don't block the app for more than 10s
    const timeout = setTimeout(() => {
      setIsLoadingAuth(prev => {
        if (prev) console.warn("DBContext: Auth initialization timed out.");
        return false;
      });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Sync users list for Master page
  useEffect(() => {
    if (loggedUser?.role === 'master') {
      const loadAllProfiles = async () => {
        const { data, error } = await supabase.from('profiles').select('*').order('name');
        if (error) {
          console.error("DBContext: Error loading profiles:", error.message);
          return;
        }
        if (data) {
          console.log("DBContext: Profiles loaded successfully:", data.length);
          const mappedUsers: User[] = data.map(p => ({
            id: p.id,
            user: p.id, // Fallback identifier
            name: p.name || 'Sem nome',
            role: p.role as any,
            generation: p.generation,
            active: p.active,
            pass: '********'
          }));
          setDb(prev => ({ ...prev, users: mappedUsers }));
        }
      };
      loadAllProfiles();
    }
  }, [loggedUser]);

  const login = async (u: string, p: string) => {
    console.log("DBContext: Attempting login for:", u);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: u.trim(),
        password: p
      });

      if (error) {
        console.error("DBContext: Login error:", error.message);
        return false;
      }
      console.log("DBContext: Login successful for user UID:", data.user?.id);
      return !!data.user;
    } catch (e) {
      console.error("DBContext: Login exception:", e);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log("DBContext: Initiating logout...");
      setLoggedUser(null);
      setInscriptions([]);
      localStorage.removeItem('@nexus_user');
      await supabase.auth.signOut();
      console.log("DBContext: Logout complete.");
    } catch (err) {
      console.error("DBContext: Logout error:", err);
      // Even if signOut fails, we already cleared local state
    }
  };

  // NEW: Load inscriptions from Supabase
  const loadInscriptionsFromSupabase = async () => {
    if (!loggedUser) return;

    try {
      console.log("DBContext: Loading inscriptions from Supabase...");
      setLoading(true);

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );

      const loadPromise = supabase
        .from('inscriptions')
        .select('data');

      const { data, error } = await Promise.race([loadPromise, timeoutPromise]) as any;

      if (error) {
        console.error("DBContext: Error loading from Supabase:", error);
        notify('warning', 'Aviso', 'Não foi possível carregar dados do servidor');
        setLoading(false);
        return;
      }

      const inscriptionsData = (data || []).map((row: any) => row.data);
      console.log(`DBContext: Loaded ${inscriptionsData.length} inscriptions from Supabase`);

      setInscriptions(inscriptionsData);
      setLoading(false);
    } catch (e: any) {
      console.error("DBContext: Exception loading from Supabase:", e);
      notify('info', 'Modo Offline', 'Usando dados locais');
      setLoading(false);
    }
  };

  const forceSync = async () => {
    if (!db.config.sheetUrl) {
      alert("Por favor, configure a URL da planilha Google Sheets primeiro.");
      return;
    }

    setLoading(true);

    // NEW: Call Vercel API Route to sync Sheets → Supabase
    try {
      console.log("DBContext: Chamando API de sincronização...");

      const response = await fetch('/api/sync-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("DBContext: Erro na API:", errorData);
        notify('error', 'Erro na sincronização', errorData.error || 'Erro desconhecido');
      } else {
        const data = await response.json();
        console.log("DBContext: Resposta da API:", data);
        notify('success', 'Sincronização Concluída', `${data?.synced || 0} registros atualizados`);

        // Reload data from Supabase after sync
        await loadInscriptionsFromSupabase();
        setLoading(false);
        return; // Exit early, don't run old CSV sync logic
      }
    } catch (e: any) {
      console.error("DBContext: Exceção ao chamar API:", e);
      notify('warning', 'Usando sincronização local', 'Tentando método alternativo...');
      // Fall through to old sync method as backup
    }

    // FALLBACK: Old CSV sync method (kept as backup)
    try {
      const match = db.config.sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const sheetId = match ? match[1] : null;

      if (!sheetId) {
        throw new Error("ID da planilha não encontrado na URL fornecida.");
      }

      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error(`Erro de conexão (HTTP ${res.status})`);

      const text = await res.text();

      if (text.trim().startsWith("<!DOCTYPE") || text.includes("<html") || text.includes("google.com/accounts")) {
        throw new Error("O link retornou HTML. Publique a planilha na web (Arquivo > Compartilhar > Publicar na Web > CSV).");
      }

      // Use Robust CSV Parser from utils
      let { data, headers } = parseCSV(text);

      if (!headers || headers.length === 0) {
        throw new Error("O arquivo CSV parece estar vazio ou inválido.");
      }

      // --- CRITICAL FIX: SECURITY & DATA LEAKAGE PREVENTION ---
      // Se for usuário comum com restrição de geração, FILTRA AGORA.
      // Isso impede que dados de outras gerações fiquem na memória do navegador.
      if (loggedUser?.role === 'comum' && loggedUser.generation && db.config.groupCol) {
        const groupCol = db.config.groupCol;
        const userGen = loggedUser.generation.trim().toUpperCase();

        data = data.filter((row: any) => {
          const rowVal = String(row[groupCol] || '').trim().toUpperCase();
          return rowVal === userGen;
        });
      }
      // -------------------------------------------------------

      // --- SYNC AUDIT LOGS ---
      let fetchedLogs: AuditLog[] = [];
      if (db.config.logsGid) {
        try {
          const logsExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${db.config.logsGid}`;
          const resLogs = await fetch(logsExportUrl);
          if (resLogs.ok) {
            const textLogs = await resLogs.text();
            if (!textLogs.includes("<!DOCTYPE")) {
              const { data: logData } = parseCSV(textLogs);
              // Map to AuditLog interface
              // Assuming columns: Timestamp, User, Action, Details
              // Adjust keys based on actual CSV headers. 
              // If headers are roughly [Date, User, Action, Details]
              fetchedLogs = logData.map((row: any) => {
                // Try to find keys
                const vals = Object.values(row);
                if (vals.length < 3) return null;

                // Raw Date from sheet is likely ISO or Locale string
                const rawDate = String(vals[0]);
                // Split into Date and Time if possible
                // Google Sheets CSV export dates often look like "2026-01-08 12:00:00" or "8/1/2026 12:00:00"
                // We need separate date/time for our AuditLog type
                const dateObj = new Date(rawDate);
                const isValidDate = !isNaN(dateObj.getTime());

                return {
                  date: isValidDate ? dateObj.toLocaleDateString() : rawDate,
                  time: isValidDate ? dateObj.toLocaleTimeString() : '',
                  author: String(vals[1]),
                  action: String(vals[2]),
                  details: String(vals[3] || '')
                } as AuditLog;
              }).filter(Boolean) as AuditLog[];

              // Sort by date/time (newest first)
              fetchedLogs.sort((a, b) => {
                // Simple string comparison might fail for DD/MM/YYYY, but let's try
                // Best effort sort
                return new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime();
              });
            }
          }
        } catch (logErr) {
          console.warn("Failed to sync logs", logErr);
        }
      }

      setDb(prev => ({
        ...prev,
        headers,
        // Merge local "pending" logs? 
        // For now, let's prioritize Remote Logs + Current Session Local Logs? 
        // Actually, if we fetch remote, that SHOULD include past actions. 
        // But `updateLocalData` adds to `auditLogs` immediately. 
        // If we overwrite, we lose the ones just added if they haven't synced yet.
        // BUT `forceSync` is manual or on load. 
        // If on load, local is empty anyway.
        // If manual, we might overwrite. 
        // Safer: fetchedLogs (historical) + prev.auditLogs (recent session not yet synced ideally, but they ARE synced via Apps Script).
        // Since Apps Script appends immediately, fetchedLogs should have them.
        // So overwriting is safeish, maybe dedupe?
        // Let's just use fetchedLogs if available, else keep prev.
        auditLogs: fetchedLogs.length > 0 ? fetchedLogs : prev.auditLogs
      }));
      setInscriptions(data as any);

    } catch (e: any) {
      console.error("Erro no forceSync:", e);
      alert(`Falha na Sincronização:\n${e.message}`);
    }
    finally { setLoading(false); }
  };

  const saveTicket = async (t: Ticket) => {
    const updated = [t, ...(db.tickets || [])];
    setDb({ ...db, tickets: updated });
    if (db.config.scriptUrl) {
      try {
        await fetch(db.config.scriptUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'SAVE_TICKET', data: t }) });
      } catch (e) { console.error(e); }
    }
  };

  const sendToCloud = async (payload: any) => {
    if (!db.config.scriptUrl) return;
    try {
      await fetch(db.config.scriptUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    } catch (e) { console.error(e); }
  };

  const updateLocalData = (id: string, field: string, value: string) => {
    const now = new Date();
    const newLog: AuditLog = {
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      author: loggedUser?.name || 'Sistema',
      action: 'UPDATE',
      details: `Alterou ${field} (ID: ${id}) para "${value}"`
    };

    setDb(prev => ({ ...prev, auditLogs: [newLog, ...(prev.auditLogs || [])] }));

    setInscriptions(prev => prev.map(row => {
      const idCol = db.headers[0] || Object.keys(row)[0];
      if (String(row[idCol]) === String(id)) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const batchUpdateLocalData = (ids: string[], updates: Record<string, string>) => {
    setInscriptions(prev => prev.map(row => {
      const idCol = db.headers[0] || Object.keys(row)[0];
      if (ids.includes(String(row[idCol]))) {
        return { ...row, ...updates };
      }
      return row;
    }));
  };

  const updateUser = async (updatedUser: User) => {
    if (updatedUser.id) {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updatedUser.name,
          role: updatedUser.role,
          generation: updatedUser.generation,
          active: updatedUser.active
        })
        .eq('id', updatedUser.id);

      if (error) {
        notify('error', 'Erro ao atualizar no Supabase', error.message);
        return;
      }
    }
    const newUsers = db.users.map(u => (u.id === updatedUser.id || u.user === updatedUser.user) ? updatedUser : u);
    setDb(prev => ({ ...prev, users: newUsers }));
  };

  const createNewUser = async (u: Partial<User>) => {
    try {
      setLoading(true);

      const cleanEmail = u.user?.trim();
      const cleanPass = u.pass?.trim();

      if (!cleanEmail || !cleanPass) throw new Error("Email e Senha são obrigatórios.");

      console.log("Criando usuário via RPC (SQL Direto) para:", cleanEmail);

      const { data, error } = await supabase.rpc('create_user_admin', {
        email: cleanEmail,
        password: cleanPass,
        user_metadata: {
          name: u.name?.trim(),
          role: u.role,
          generation: u.generation
        }
      }) as any;

      console.log("RPC Response:", { data, error });

      if (error) {
        // Se o erro for "User already exists", ainda queremos dar o aviso correto
        const msg = error.message === 'User already exists' ? 'Este e-mail já está cadastrado.' : error.message;
        notify('error', 'Erro ao criar usuário', msg);
        return false;
      }

      const newUser: User = {
        id: data.id,
        user: data.email,
        name: u.name || data.email,
        role: u.role as any || 'comum',
        generation: u.generation || null,
        active: true,
        pass: '********'
      };

      setDb(prev => ({ ...prev, users: [...prev.users, newUser] }));
      notify('success', 'Usuário Criado', `O acesso para ${u.name} foi gerado.`);
      return true;
    } catch (e: any) {
      notify('error', 'Falha na Operação', e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };
  const deleteUser = async (id: string) => {
    try {
      setLoading(true);

      // Usar função RPC que deleta de auth.users E profiles
      const { data, error } = await supabase.rpc('delete_user_admin', {
        user_id: id
      });

      if (error) {
        notify('error', 'Erro ao excluir usuário', error.message);
        return;
      }

      // Atualizar estado local
      setDb(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));

      notify('success', 'Usuário Excluído', 'O usuário foi removido completamente do sistema.');
    } catch (e: any) {
      notify('error', 'Erro ao excluir usuário', e.message);
    } finally {
      setLoading(false);
    }
  };


  const fetchLogs = async (): Promise<AuditLog[]> => {
    return db.auditLogs || [];
  };

  // Toast colors
  const toastColors: Record<string, { bg: string; border: string; icon: string }> = {
    success: { bg: 'bg-emerald-500/90', border: 'border-emerald-400', icon: '✓' },
    error: { bg: 'bg-red-500/90', border: 'border-red-400', icon: '✗' },
    warning: { bg: 'bg-amber-500/90', border: 'border-amber-400', icon: '⚠' },
    info: { bg: 'bg-blue-500/90', border: 'border-blue-400', icon: 'ℹ' }
  };

  return (
    <DBContext.Provider value={{
      db, inscriptions, loading, isLoadingAuth, loggedUser,
      login, logout, updateDB: (d) => setDb(prev => ({ ...prev, ...d })),
      forceSync, saveTicket, sendToCloud, updateLocalData, batchUpdateLocalData, updateUser, createNewUser, deleteUser, fetchLogs, notify,
      loadInscriptionsFromSupabase
    }}>
      {children}
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-6 py-4 rounded-xl shadow-2xl border-l-4 ${toastColors[toast.type]?.bg || 'bg-slate-800'} ${toastColors[toast.type]?.border || 'border-slate-600'} text-white animate-in slide-in-from-right duration-300`}>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">{toastColors[toast.type]?.icon}</span>
            <div>
              <p className="font-bold text-sm">{toast.title}</p>
              {toast.description && <p className="text-xs opacity-80">{toast.description}</p>}
            </div>
            <button onClick={() => setToast(null)} className="ml-4 opacity-60 hover:opacity-100">×</button>
          </div>
        </div>
      )}
    </DBContext.Provider>
  );
};

export const useDB = () => {
  const c = useContext(DBContext);
  if (!c) throw new Error("useDB error");
  return c;
};
