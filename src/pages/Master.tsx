
import React, { useState, useMemo } from 'react';
import { useDB } from '../context/useDB';
import { User } from '../types';
import {
    Settings, Layout, Bell, Shield, Globe, Database,
    User as UserIcon, ToggleLeft, ToggleRight, Save, Lock, ChevronRight, Mail, Clock,
    Link as LinkIcon, Key, Plus, Trash2, RefreshCw, AlertCircle, ChevronDown, Layers, Check, X, HelpCircle
} from 'lucide-react';

export const Master: React.FC = () => {
    const { db, updateDB, updateUser, createNewUser, deleteUser, forceSync, loading, inscriptions, notify } = useDB();
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

    const handleSaveUser = async () => {
        if (!selectedUser?.user || !selectedUser?.name || !selectedUser?.pass) return notify('error', 'Erro', 'Preencha todos os campos obrigatórios.');

        if (isCreatingNewUser) {
            const success = await createNewUser(selectedUser);
            if (!success) return;
        } else {
            await updateUser(selectedUser);
            notify('success', 'Usuário Atualizado');
        }
        setUserModalOpen(false);
    };

    const handleDeleteUser = async () => {
        console.log("Tentando excluir usuário:", selectedUser);
        if (!selectedUser) return;

        if (!selectedUser.id) {
            console.warn("Usuário sem ID encontrado. Tentando exclusão por email/login...");
            // Fallback para usuários antigos/locais sem ID
            if (confirm(`Excluir usuário local ${selectedUser.name} (sem ID vinculado)?`)) {
                // Remove localmente usando o campo 'user' (email/login)
                updateDB({ users: db.users.filter(u => u.user !== selectedUser.user) });
                setUserModalOpen(false);
                notify('success', 'Usuário Local Removido');
            }
            return;
        }

        if (confirm(`Excluir ${selectedUser.name}?`)) {
            try {
                await deleteUser(selectedUser.id);
                setUserModalOpen(false);
                notify('success', 'Usuário Removido');
            } catch (error) {
                console.error("Erro ao excluir:", error);
                notify('error', 'Erro ao excluir usuário');
            }
        }
    };

    const availableGenerations = useMemo(() => {
        if (!db.config.groupCol) return [];
        return Array.from(new Set(inscriptions.map(r => String(r[db.config.groupCol!] || '').trim()).filter(Boolean))).sort();
    }, [inscriptions, db.config.groupCol]);

    return (
        <div className="flex h-full gap-8 text-[var(--text-dim)] animate-in fade-in" style={{ color: 'var(--text-dim)' }}>
            {/* SIDEBAR MENU */}
            <div className="w-64 flex-shrink-0 bg-[var(--input-bg)] border-r border-[var(--border-subtle)] flex flex-col py-6">
                <h3 className="text-xl font-black italic text-[var(--text-main)] px-6 mb-8 tracking-tighter">CONFIGURAÇÕES</h3>
                <nav className="space-y-1 px-3">
                    {[
                        { id: 'geral', label: 'Sistema & Integração', icon: Settings },
                        { id: 'layout', label: 'Layout & Dados', icon: Layout },
                        { id: 'usuarios', label: 'Controle de Acesso', icon: UserIcon },
                        { id: 'suporte', label: 'Config. Suporte', icon: HelpCircle }
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'text-[var(--text-muted)] hover:bg-[var(--card-bg)] hover:text-[var(--text-main)]'}`}>
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
                            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-6 border-b border-[var(--border-subtle)] pb-2">Conexão de Dados</h4>
                            <div className="bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-6">
                                <div className="grid gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 block">Link da Planilha (CSV Público)</label>
                                        <div className="flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl p-3 focus-within:border-emerald-500 transition-colors">
                                            <Database className="w-4 h-4 text-emerald-500" />
                                            <input type="text" value={db.config.sheetUrl} onChange={e => updateConfig('sheetUrl', e.target.value)} className="bg-transparent w-full text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]" placeholder="https://docs.google.com/..." />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 block">URL do Script (Apps Script)</label>
                                        <div className="flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl p-3 focus-within:border-amber-500 transition-colors">
                                            <LinkIcon className="w-4 h-4 text-amber-500" />
                                            <input type="text" value={db.config.scriptUrl} onChange={e => updateConfig('scriptUrl', e.target.value)} className="bg-transparent w-full text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]" placeholder="https://script.google.com/..." />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 block">ID da Aba de Logs (gid)</label>
                                        <div className="flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl p-3 focus-within:border-purple-500 transition-colors">
                                            <Layers className="w-4 h-4 text-purple-500" />
                                            <input type="text" value={db.config.logsGid || ''} onChange={e => updateConfig('logsGid', e.target.value)} className="bg-transparent w-full text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]" placeholder="Ex: 12345678" />
                                        </div>
                                        <p className="text-[10px] text-[var(--text-muted)] mt-1">Visível na URL da planilha (#gid=...)</p>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
                                    <button onClick={() => forceSync()} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all active:scale-95">
                                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Sincronizando...' : 'Sincronizar Agora'}
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-6 border-b border-[var(--border-subtle)] pb-2">Segurança de Dados</h4>
                            <div className="bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div>
                                    <h5 className="text-sm font-bold text-[var(--text-main)] mb-2">Backup & Restauração</h5>
                                    <p className="text-[10px] text-[var(--text-muted)] max-w-sm">
                                        Como o Nexus roda localmente, é essencial salvar backups frequentes.
                                        Ao limpar o cache do navegador, os dados podem ser perdidos.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => {
                                        const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `nexus_backup_${new Date().toISOString().slice(0, 10)}.json`;
                                        a.click();
                                        notify('success', 'Backup Gerado', 'Arquivo salvo com sucesso.');
                                    }} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 transition-all">
                                        <Save className="w-4 h-4" /> Baixar Backup
                                    </button>
                                    <div className="relative">
                                        <input type="file" accept=".json" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                try {
                                                    const parsed = JSON.parse(ev.target?.result as string);
                                                    if (confirm('ATENÇÃO: Isso irá substituir todos os dados atuais pelos do backup. Continuar?')) {
                                                        updateDB(parsed);
                                                        notify('success', 'Backup Restaurado', 'O sistema será recarregado.');
                                                        setTimeout(() => window.location.reload(), 1500);
                                                    }
                                                } catch (err) {
                                                    notify('error', 'Arquivo Inválido', 'Não foi possível ler o backup.');
                                                }
                                            };
                                            reader.readAsText(file);
                                        }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20">
                                            <RefreshCw className="w-4 h-4" /> Restaurar Dados
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-6 border-b border-[var(--border-subtle)] pb-2">Preferências</h4>
                            <div className="bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center justify-between p-4 bg-[var(--input-bg)] rounded-xl border border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Bell className="w-5 h-5" /></div>
                                        <div><p className="text-sm font-bold text-[var(--text-main)]">Notificações</p><p className="text-[10px] text-[var(--text-muted)]">Alertas por e-mail</p></div>
                                    </div>
                                    <button onClick={() => updateConfig('notifications', { ...db.config.notifications, email: !db.config.notifications?.email })} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                                        {db.config.notifications?.email ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8" />}
                                    </button>
                                </div>
                                <div className="p-4 bg-[var(--input-bg)] rounded-xl border border-[var(--border-subtle)]">
                                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-2">E-mail Remetente</label>
                                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-[var(--text-muted)]" /><input type="text" value={db.config.senderEmail} onChange={e => updateConfig('senderEmail', e.target.value)} className="bg-transparent w-full text-sm text-[var(--text-main)] outline-none font-medium" /></div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'layout' && (
                    <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-4">
                        <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-2xl flex items-start gap-4">
                            <Layout className="w-6 h-6 text-blue-400 mt-1" />
                            <div>
                                <h4 className="text-lg font-bold text-white">Personalização de Campos</h4>
                                <p className="text-sm text-blue-200/70 mt-1">Defina quais colunas da planilha são visíveis e permissões de edição.</p>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            <div className="bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl p-6">
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-4 block">Agrupamento Principal (Ex: Turma)</label>
                                <select value={db.config.groupCol || ''} onChange={e => updateConfig('groupCol', e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl p-4 text-sm text-[var(--text-main)] font-bold outline-none focus:border-blue-500">
                                    <option value="">Nenhum (Lista Plana)</option>
                                    {db.headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>

                            <div className="bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl p-6">
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-4 block">Colunas Visíveis na Tabela</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {db.headers.map(col => (
                                        <button key={col} onClick={() => toggleColumn(col)} className={`p-3 rounded-xl border text-xs font-bold uppercase text-left transition-all ${db.config.displayCols.includes(col) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[var(--input-bg)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-slate-500 hover:text-[var(--text-main)]'}`}>
                                            {col}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-black/20 border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Lock className="w-4 h-4 text-amber-500" />
                                    <label className="text-xs font-bold text-slate-400 uppercase">Permissões de Edição (Por Perfil)</label>
                                </div>

                                <div className="grid gap-6">
                                    {['suporte', 'comum'].map(role => (
                                        <div key={role} className="space-y-3">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5 pb-1">Perfil: {role}</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {db.headers.map(col => {
                                                    const perms = db.config.editPermissions?.[role as 'suporte' | 'comum'] || [];
                                                    const isEditable = perms.includes(col);
                                                    return (
                                                        <button
                                                            key={col}
                                                            onClick={() => {
                                                                const newPerms = isEditable
                                                                    ? perms.filter(p => p !== col)
                                                                    : [...perms, col];
                                                                updateConfig('editPermissions', { ...db.config.editPermissions, [role]: newPerms });
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${isEditable ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-[var(--input-bg)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--card-bg)]'}`}
                                                        >
                                                            {isEditable ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 opacity-50" />}
                                                            {col}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-4 italic">* Usuários ADMIN/MASTER têm permissão total de edição por padrão.</p>
                            </div>

                        </div>
                    </div>
                )}

                {activeTab === 'usuarios' && (
                    <div className="max-w-5xl space-y-6 animate-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-subtle)]">
                            <div>
                                <h4 className="text-lg font-bold text-[var(--text-main)]">Gerenciamento de Equipe</h4>
                                <p className="text-xs text-[var(--text-muted)] mt-1">{db.users.length} usuários cadastrados</p>
                            </div>
                            <button onClick={() => { setSelectedUser({ user: '', pass: '', name: '', role: 'comum', generation: null, active: true }); setIsCreatingNewUser(true); setUserModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs shadow-lg transition-all flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Novo Usuário
                            </button>
                        </div>

                        <div className="grid gap-3">
                            {db.users.map(u => (
                                <div key={u.user} onClick={() => { setSelectedUser(u); setIsCreatingNewUser(false); setUserModalOpen(true); }} className="bg-[var(--card-bg)] hover:bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-bold text-white border border-[var(--border-subtle)]">
                                            {u.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[var(--text-main)]">{u.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${u.role === 'master' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border-subtle)]'}`}>{u.role}</span>
                                                {u.generation && <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{u.generation}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'suporte' && (
                    <div className="max-w-4xl space-y-10 animate-in slide-in-from-bottom-4">
                        <section>
                            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-6 border-b border-[var(--border-subtle)] pb-2">Categorias e Campos</h4>
                            <div className="bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl p-6">
                                <div className="flex gap-4 mb-8 items-end">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 block">Nome da Categoria</label>
                                        <input id="newCatName" type="text" className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-main)] outline-none focus:border-blue-500 text-xs" placeholder="Ex: Alteração de Dados" />
                                    </div>
                                    <div className="flex-[2]">
                                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 block">Campos Obrigatórios (separados por vírgula)</label>
                                        <input id="newCatFields" type="text" className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-main)] outline-none focus:border-blue-500 text-xs" placeholder="Ex: CPF, Novo Nome, Telefone" />
                                    </div>
                                    <button onClick={() => {
                                        const nameEl = document.getElementById('newCatName') as HTMLInputElement;
                                        const fieldsEl = document.getElementById('newCatFields') as HTMLInputElement;
                                        const name = nameEl.value;
                                        const fields = fieldsEl.value.split(',').map(s => s.trim()).filter(Boolean);

                                        if (!name) return notify('error', 'Nome Obrigatório');

                                        const newCat = { id: `cat-${Date.now()}`, name, requiredFields: fields };
                                        const currentCats = db.config.ticketCategories || [];
                                        updateConfig('ticketCategories', [...currentCats, newCat]);

                                        nameEl.value = '';
                                        fieldsEl.value = '';
                                        notify('success', 'Categoria Adicionada');
                                    }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs flex items-center gap-2 transition-all">
                                        <Plus className="w-4 h-4" /> Adicionar
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {(db.config.ticketCategories || []).length === 0 && <p className="text-slate-500 text-xs italic">Nenhuma categoria configurada.</p>}
                                    {(db.config.ticketCategories || []).map(cat => (
                                        <div key={cat.id} className="flex justify-between items-center bg-[var(--input-bg)] border border-[var(--border-subtle)] p-4 rounded-xl group hover:border-blue-500/30 transition-colors">
                                            <div>
                                                <h5 className="font-bold text-[var(--text-main)] text-sm">{cat.name}</h5>
                                                {cat.requiredFields.length > 0 && (
                                                    <div className="flex gap-2 mt-2 flex-wrap">
                                                        {cat.requiredFields.map(f => (
                                                            <span key={f} className="text-[10px] bg-[var(--card-bg)] px-2 py-1 rounded text-[var(--text-dim)] uppercase font-bold border border-[var(--border-subtle)]">{f}</span>
                                                        ))}
                                                    </div>
                                                )}
                                                {cat.requiredFields.length === 0 && <span className="text-[10px] text-[var(--text-muted)] italic mt-1 block">Sem campos extras</span>}
                                            </div>
                                            <button onClick={() => {
                                                if (confirm('Excluir esta categoria?')) {
                                                    updateConfig('ticketCategories', (db.config.ticketCategories || []).filter(c => c.id !== cat.id));
                                                }
                                            }} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>

            {/* MODAL USUARIO */}
            {userModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-[var(--surface-color)] w-full max-w-lg rounded-3xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-[var(--border-subtle)] flex justify-between items-start bg-[var(--surface-color)]/50">
                            <div>
                                <h3 className="text-xl font-bold text-[var(--text-main)]">{isCreatingNewUser ? 'Criar Acesso' : 'Editar Usuário'}</h3>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Gerencie permissões e dados de login.</p>
                            </div>
                            <button onClick={() => setUserModalOpen(false)} className="bg-[var(--card-bg)] hover:bg-[var(--surface-color)] p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border-subtle)]"><ChevronDown className="w-5 h-5" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Nome</label><input type="text" value={selectedUser.name} onChange={e => setSelectedUser({ ...selectedUser, name: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-[var(--text-main)] outline-none focus:border-blue-500 mt-1" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">E-mail de Acesso (Login)</label><input type="email" disabled={!isCreatingNewUser} value={selectedUser.user} onChange={e => setSelectedUser({ ...selectedUser, user: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-[var(--text-main)] outline-none focus:border-blue-500 mt-1 disabled:opacity-50" placeholder="usuario@exemplo.com" /></div>
                                    <div><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Senha</label><input type="text" value={selectedUser.pass} onChange={e => setSelectedUser({ ...selectedUser, pass: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-[var(--text-main)] outline-none focus:border-blue-500 mt-1" /></div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 block">Nível de Acesso</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['master', 'suporte', 'comum'].map(r => (
                                        <button key={r} onClick={() => setSelectedUser({ ...selectedUser, role: r as any })} className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${selectedUser.role === r ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[var(--input-bg)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--card-bg)]'}`}>{r}</button>
                                    ))}
                                </div>
                            </div>

                            {selectedUser.role === 'comum' && (
                                <div className="bg-[var(--input-bg)] p-4 rounded-xl border border-[var(--border-subtle)]">
                                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2 block flex items-center gap-2"><Layers className="w-3 h-3" /> Restrição de Grupo</label>
                                    <select value={selectedUser.generation || ''} onChange={e => setSelectedUser({ ...selectedUser, generation: e.target.value || null })} className="w-full bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-lg p-2 text-sm text-[var(--text-main)] outline-none">
                                        <option value="">Acesso Total</option>
                                        {availableGenerations.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <button onClick={() => setSelectedUser({ ...selectedUser, active: !selectedUser.active })} className={`text-xs font-bold uppercase flex items-center gap-2 ${selectedUser.active ? 'text-emerald-500' : 'text-red-500'}`}>
                                    <Shield className="w-4 h-4" /> {selectedUser.active ? 'Acesso Ativo' : 'Bloqueado'}
                                </button>
                                <div className="flex gap-3">
                                    {!isCreatingNewUser && <button onClick={handleDeleteUser} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>}
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
