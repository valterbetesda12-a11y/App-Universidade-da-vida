
import React, { useState, useMemo } from 'react';
import { useDB } from '../context/DBContext';
import { User } from '../types';
import { 
  Settings, Layout, Bell, Shield, Globe, Database, 
  User as UserIcon, ToggleLeft, ToggleRight, Save, Lock, ChevronRight, Mail, Clock,
  Link as LinkIcon, Key, Plus, Trash2, RefreshCw, AlertCircle, ChevronDown, Layers
} from 'lucide-react';

export const Master: React.FC = () => {
  const { db, updateDB, updateUser, forceSync, loading, inscriptions, notify } = useDB();
  const [activeTab, setActiveTab] = useState<'geral' | 'layout' | 'usuarios'>('geral');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [isCreatingNewUser, setIsCreatingNewUser] = useState(false);

  const updateConfig = (key: string, value: any) => {
      updateDB({ config: { ...db.config, [key]: value } });
      notify('info', 'Configuração Atualizada', 'As alterações foram salvas localmente.');
  };

  const toggleColumn = (col: string) => {
      const current = db.config.displayCols || [];
      const updated = current.includes(col) ? current.filter(c => c !== col) : [...current, col];
      updateConfig('displayCols', updated);
  };

  const updateStatusColor = (type: string, key: string, value: string) => {
      const currentColors = db.config.statusColors || { approved: { bg: '#dcfce7', text: '#166534' }, pending: { bg: '#fef9c3', text: '#854d0e' }, vip: { bg: '#f3e8ff', text: '#6b21a8' } };
      updateConfig('statusColors', { ...currentColors, [type]: { ...(currentColors as any)[type], [key]: value } });
  };

  const handleSaveUser = () => {
      if (!selectedUser?.user || !selectedUser?.name || !selectedUser?.pass) return notify('error', 'Erro', 'Preencha todos os campos obrigatórios.');
      
      if (isCreatingNewUser) {
          if (db.users.some(u => u.user === selectedUser.user)) return notify('error', 'Duplicidade', 'Login já existe.');
          updateDB({ users: [...db.users, selectedUser] });
          notify('success', 'Usuário Criado');
      } else {
          updateUser(selectedUser);
          notify('success', 'Usuário Atualizado');
      }
      setUserModalOpen(false);
  };

  const handleDeleteUser = () => {
      if (!selectedUser) return;
      if (confirm(`Excluir ${selectedUser.name}?`)) {
          updateDB({ users: db.users.filter(u => u.user !== selectedUser.user) });
          setUserModalOpen(false);
          notify('success', 'Usuário Removido');
      }
  };

  const availableGenerations = useMemo(() => {
      if (!db.config.groupCol) return [];
      return Array.from(new Set(inscriptions.map(r => String(r[db.config.groupCol!] || '').trim()).filter(Boolean))).sort();
  }, [inscriptions, db.config.groupCol]);

  return (
    <div className="flex h-full gap-8 bg-[#0f172a] text-slate-200 animate-in fade-in">
      {/* SIDEBAR MENU */}
      <div className="w-64 flex-shrink-0 bg-[#1e293b] border-r border-white/5 flex flex-col py-6">
        <h3 className="text-xl font-black italic text-white px-6 mb-8 tracking-tighter">CONFIGURAÇÕES</h3>
        <nav className="space-y-1 px-3">
            {[
                { id: 'geral', label: 'Sistema & Integração', icon: Settings },
                { id: 'layout', label: 'Layout & Dados', icon: Layout },
                { id: 'usuarios', label: 'Controle de Acesso', icon: UserIcon }
            ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                    <item.icon className="w-4 h-4" /> {item.label}
                </button>
            ))}
        </nav>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        
        {activeTab === 'geral' && (
            <div className="max-w-4xl space-y-10 animate-in slide-in-from-bottom-4">
                <section>
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Conexão de Dados</h4>
                    <div className="bg-[#1e293b] border border-white/5 rounded-2xl p-6 space-y-6">
                        <div className="grid gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Link da Planilha (CSV Público)</label>
                                <div className="flex items-center gap-2 bg-[#0f172a] border border-slate-700 rounded-xl p-3 focus-within:border-emerald-500 transition-colors">
                                    <Database className="w-4 h-4 text-emerald-500"/>
                                    <input type="text" value={db.config.sheetUrl} onChange={e => updateConfig('sheetUrl', e.target.value)} className="bg-transparent w-full text-sm text-white outline-none placeholder:text-slate-600" placeholder="https://docs.google.com/..."/>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">URL do Script (Apps Script)</label>
                                <div className="flex items-center gap-2 bg-[#0f172a] border border-slate-700 rounded-xl p-3 focus-within:border-amber-500 transition-colors">
                                    <LinkIcon className="w-4 h-4 text-amber-500"/>
                                    <input type="text" value={db.config.scriptUrl} onChange={e => updateConfig('scriptUrl', e.target.value)} className="bg-transparent w-full text-sm text-white outline-none placeholder:text-slate-600" placeholder="https://script.google.com/..."/>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2 border-t border-white/5">
                            <button onClick={() => forceSync()} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all active:scale-95">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/> {loading ? 'Sincronizando...' : 'Sincronizar Agora'}
                            </button>
                        </div>
                    </div>
                </section>

                <section>
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Preferências</h4>
                    <div className="bg-[#1e293b] border border-white/5 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between p-4 bg-[#0f172a] rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Bell className="w-5 h-5"/></div>
                                <div><p className="text-sm font-bold text-white">Notificações</p><p className="text-[10px] text-slate-500">Alertas por e-mail</p></div>
                            </div>
                            <button onClick={() => updateConfig('notifications', { ...db.config.notifications, email: !db.config.notifications?.email })} className="text-slate-400 hover:text-white">
                                {db.config.notifications?.email ? <ToggleRight className="w-8 h-8 text-emerald-500"/> : <ToggleLeft className="w-8 h-8"/>}
                            </button>
                        </div>
                        <div className="p-4 bg-[#0f172a] rounded-xl border border-white/5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">E-mail Remetente</label>
                            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-500"/><input type="text" value={db.config.senderEmail} onChange={e => updateConfig('senderEmail', e.target.value)} className="bg-transparent w-full text-sm text-white outline-none font-medium"/></div>
                        </div>
                    </div>
                </section>
            </div>
        )}

        {activeTab === 'layout' && (
            <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-4">
                <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-2xl flex items-start gap-4">
                    <Layout className="w-6 h-6 text-blue-400 mt-1"/>
                    <div>
                        <h4 className="text-lg font-bold text-white">Personalização de Campos</h4>
                        <p className="text-sm text-blue-200/70 mt-1">Defina quais colunas da planilha são visíveis e como os dados são agrupados.</p>
                    </div>
                </div>

                <div className="grid gap-6">
                    <div className="bg-[#1e293b] border border-white/5 rounded-2xl p-6">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-4 block">Agrupamento Principal (Ex: Turma)</label>
                        <select value={db.config.groupCol || ''} onChange={e => updateConfig('groupCol', e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-sm text-white font-bold outline-none focus:border-blue-500">
                            <option value="">Nenhum (Lista Plana)</option>
                            {db.headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>

                    <div className="bg-[#1e293b] border border-white/5 rounded-2xl p-6">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-4 block">Colunas Visíveis</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {db.headers.map(col => (
                                <button key={col} onClick={() => toggleColumn(col)} className={`p-3 rounded-xl border text-xs font-bold uppercase text-left transition-all ${db.config.displayCols.includes(col) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#0f172a] border-slate-800 text-slate-500 hover:border-slate-600'}`}>
                                    {col}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'usuarios' && (
            <div className="max-w-5xl space-y-6 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center bg-[#1e293b] p-6 rounded-2xl border border-white/5">
                    <div>
                        <h4 className="text-lg font-bold text-white">Gerenciamento de Equipe</h4>
                        <p className="text-xs text-slate-400 mt-1">{db.users.length} usuários cadastrados</p>
                    </div>
                    <button onClick={() => { setSelectedUser({ user: '', pass: '', name: '', role: 'comum', generation: null, active: true }); setIsCreatingNewUser(true); setUserModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs shadow-lg transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4"/> Novo Usuário
                    </button>
                </div>

                <div className="grid gap-3">
                    {db.users.map(u => (
                        <div key={u.user} onClick={() => { setSelectedUser(u); setIsCreatingNewUser(false); setUserModalOpen(true); }} className="bg-[#1e293b] hover:bg-[#253045] border border-white/5 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-bold text-white border border-white/10">
                                    {u.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{u.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${u.role === 'master' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>{u.role}</span>
                                        {u.generation && <span className="text-[10px] text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded border border-blue-900/30">{u.generation}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors"/>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* MODAL USUARIO */}
      {userModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-[#1e293b] w-full max-w-lg rounded-3xl shadow-2xl border border-white/10 overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                  <div className="p-8 border-b border-white/10 flex justify-between items-start bg-[#0f172a]">
                      <div>
                          <h3 className="text-xl font-bold text-white">{isCreatingNewUser ? 'Criar Acesso' : 'Editar Usuário'}</h3>
                          <p className="text-xs text-slate-400 mt-1">Gerencie permissões e dados de login.</p>
                      </div>
                      <button onClick={() => setUserModalOpen(false)} className="bg-white/5 hover:bg-white/10 p-2 rounded-full text-slate-400 hover:text-white transition-colors"><ChevronDown className="w-5 h-5"/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="space-y-4">
                          <div><label className="text-[10px] font-bold text-slate-500 uppercase">Nome</label><input type="text" value={selectedUser.name} onChange={e => setSelectedUser({...selectedUser, name: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500 mt-1"/></div>
                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Login</label><input type="text" disabled={!isCreatingNewUser} value={selectedUser.user} onChange={e => setSelectedUser({...selectedUser, user: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500 mt-1 disabled:opacity-50"/></div>
                              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Senha</label><input type="text" value={selectedUser.pass} onChange={e => setSelectedUser({...selectedUser, pass: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500 mt-1"/></div>
                          </div>
                      </div>
                      
                      <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Nível de Acesso</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['master', 'suporte', 'comum'].map(r => (
                                  <button key={r} onClick={() => setSelectedUser({...selectedUser, role: r as any})} className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${selectedUser.role === r ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{r}</button>
                              ))}
                          </div>
                      </div>

                      {selectedUser.role === 'comum' && (
                          <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700">
                              <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2"><Layers className="w-3 h-3"/> Restrição de Grupo</label>
                              <select value={selectedUser.generation || ''} onChange={e => setSelectedUser({...selectedUser, generation: e.target.value || null})} className="w-full bg-[#1e293b] border border-slate-600 rounded-lg p-2 text-sm text-white outline-none">
                                  <option value="">Acesso Total</option>
                                  {availableGenerations.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                          </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <button onClick={() => setSelectedUser({...selectedUser, active: !selectedUser.active})} className={`text-xs font-bold uppercase flex items-center gap-2 ${selectedUser.active ? 'text-emerald-500' : 'text-red-500'}`}>
                              <Shield className="w-4 h-4"/> {selectedUser.active ? 'Acesso Ativo' : 'Bloqueado'}
                          </button>
                          <div className="flex gap-3">
                              {!isCreatingNewUser && <button onClick={handleDeleteUser} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>}
                              <button onClick={handleSaveUser} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold uppercase text-xs shadow-lg transition-all">Salvar</button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
