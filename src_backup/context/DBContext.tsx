
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DBData, User, Ticket, AuditLog } from '../types';
import { parseCSV } from '../utils/csvParser';

interface ToastMsg {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  desc?: string;
}

interface DBContextType {
  db: DBData; inscriptions: any[]; loading: boolean; 
  loggedUser: User | null;
  login: (u: string, p: string) => boolean; logout: () => void;
  updateDB: (d: Partial<DBData>) => void; forceSync: () => Promise<void>;
  saveTicket: (t: Ticket) => Promise<void>;
  sendToCloud: (payload: any) => Promise<void>;
  updateLocalData: (id: string, field: string, value: string) => void;
  batchUpdateLocalData: (ids: string[], updates: Record<string, string>) => void;
  updateUser: (user: User) => void;
  fetchLogs: () => Promise<AuditLog[]>;
  notify: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
  toasts: ToastMsg[];
  dismissToast: (id: string) => void;
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

  const [loggedUser, setLoggedUser] = useState<User | null>(() => {
    const u = localStorage.getItem('@nexus_user');
    return u ? JSON.parse(u) : null;
  });
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // TOAST SYSTEM
  const notify = useCallback((type: 'success' | 'error' | 'info', title: string, desc?: string) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id, type, title, desc }]);
      setTimeout(() => dismissToast(id), 5000);
  }, []);

  const dismissToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => { 
      try {
        localStorage.setItem('@nexus_db', JSON.stringify(db)); 
      } catch (e) {
        console.warn("LocalStorage quota exceeded. Data might not persist.", e);
        notify('error', 'Armazenamento Cheio', 'Não foi possível salvar as configurações localmente.');
      }
  }, [db, notify]);

  const login = (u: string, p: string) => {
    const user = db.users?.find(x => x.user.toLowerCase() === u.trim().toLowerCase() && x.pass === p);
    if (user) { 
        if (user.active === false) return false;
        setLoggedUser(user); 
        localStorage.setItem('@nexus_user', JSON.stringify(user)); 
        notify('success', `Bem-vindo, ${user.name}!`);
        return true; 
    }
    return false;
  };

  const logout = () => { 
      setLoggedUser(null); 
      setInscriptions([]); 
      localStorage.removeItem('@nexus_user'); 
      notify('info', 'Sessão encerrada');
  };

  const forceSync = async () => {
    if (!db.config.sheetUrl) {
      notify('error', 'Configuração Ausente', 'Configure a URL da planilha Google Sheets.');
      return;
    }
    
    setLoading(true);
    try {
      const match = db.config.sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const sheetId = match ? match[1] : null;

      if (!sheetId) throw new Error("ID da planilha não encontrado.");

      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      
      const text = await res.text();

      if (text.trim().startsWith("<!DOCTYPE") || text.includes("<html")) {
        throw new Error("Link inválido. Publique a planilha na Web como CSV.");
      }

      let { data, headers } = parseCSV(text);
      
      if (!headers || headers.length === 0) throw new Error("Arquivo CSV vazio ou inválido.");

      if (loggedUser?.role === 'comum' && loggedUser.generation && db.config.groupCol) {
          const groupCol = db.config.groupCol;
          const userGen = loggedUser.generation.trim().toUpperCase();
          data = data.filter((row: any) => {
              const rowVal = String(row[groupCol] || '').trim().toUpperCase();
              return rowVal === userGen;
          });
      }

      setDb(prev => ({ ...prev, headers }));
      setInscriptions(data as any);
      notify('success', 'Sincronização Concluída', `${data.length} registros atualizados.`);
      
    } catch (e: any) { 
        console.error("Sync Error:", e);
        notify('error', 'Falha na Sincronização', e.message);
    }
    finally { setLoading(false); }
  };

  const saveTicket = async (t: Ticket) => {
    const updated = [t, ...(db.tickets || [])];
    setDb({ ...db, tickets: updated });
    notify('success', 'Ticket Criado', `Protocolo #${t.protocol}`);
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

  const updateUser = (updatedUser: User) => {
      const newUsers = db.users.map(u => u.user === updatedUser.user ? updatedUser : u);
      setDb(prev => ({ ...prev, users: newUsers }));
  };

  const fetchLogs = async (): Promise<AuditLog[]> => { return []; };

  return (
    <DBContext.Provider value={{ 
      db, inscriptions, loading, loggedUser, 
      login, logout, updateDB: (d) => setDb(prev => ({...prev, ...d})), 
      forceSync, saveTicket, sendToCloud, updateLocalData, batchUpdateLocalData, updateUser, fetchLogs,
      notify, toasts, dismissToast
    }}>
      {children}
    </DBContext.Provider>
  );
};

export const useDB = () => {
  const c = useContext(DBContext);
  if (!c) throw new Error("useDB error");
  return c;
};
