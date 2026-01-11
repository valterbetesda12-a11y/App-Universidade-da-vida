
import React, { useState, useMemo } from 'react';
import { useDB } from '../context/useDB';
import { Ticket } from '../types';
import { Send, Search, ChevronRight, HelpCircle, CheckCircle, ArrowLeft, Plus, XCircle, Clock, AlertCircle } from 'lucide-react';

export const Support: React.FC = () => {
  const { db, updateDB, loggedUser, notify } = useDB();
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDENTE' | 'RESOLVIDO'>('PENDENTE');
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);

  // New Ticket State
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');

  const isSupportOrMaster = loggedUser?.role === 'master' || loggedUser?.role === 'suporte';

  // Derived Categories
  const categories = useMemo(() => db.config.ticketCategories || [], [db.config.ticketCategories]);

  // Filter Tickets
  const filteredTickets = useMemo(() => {
    let list = db.tickets || [];

    // 1. Permission (Role & Generation)
    if (!isSupportOrMaster) {
      // Comum: Only Own
      list = list.filter(t => t.userLogin === loggedUser?.user);
    } else {
      // Master/Support: Global OR Generation Restricted
      if (loggedUser?.generation) {
        list = list.filter(t => t.generation === loggedUser.generation);
      }
    }

    // 2. Status Tab
    if (activeTab === 'PENDENTE') {
      list = list.filter(t => t.status !== 'RESOLVIDO' && t.status !== 'CANCELADO');
    } else {
      list = list.filter(t => t.status === 'RESOLVIDO' || t.status === 'CANCELADO');
    }

    // 3. Category Filter
    if (filterCategoryId) {
      list = list.filter(t => t.categoryId === filterCategoryId);
    }

    // 4. Text Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(t =>
        t.protocol.toLowerCase().includes(lower) ||
        t.name.toLowerCase().includes(lower) ||
        (t.category || '').toLowerCase().includes(lower) ||
        (t.userLogin || '').toLowerCase().includes(lower)
      );
    }

    return list;
  }, [db.tickets, activeTab, isSupportOrMaster, loggedUser, searchTerm, filterCategoryId]);

  const handleCreateTicket = () => {
    if (!ticketSubject || !selectedCatId || !ticketMessage) return notify('error', 'Preencha todos os campos');

    const category = categories.find(c => c.id === selectedCatId);
    if (!category) return;

    // Validate dynamic fields
    for (const field of category.requiredFields) {
      if (!dynamicFields[field]) return notify('error', `Campo Obrigatório: ${field}`);
    }

    const protocol = `TICKET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`;
    const deadlineDate = new Date();
    deadlineDate.setHours(deadlineDate.getHours() + 72); // 72h Deadline

    const newTicket: Ticket = {
      protocol,
      name: ticketSubject,
      category: category.name,
      categoryId: category.id,
      generation: loggedUser?.generation || '',
      details: ticketMessage, // Initial description
      status: 'PENDENTE',
      userLogin: loggedUser?.user || 'anon',
      createdAt: new Date().toISOString(),
      deadlineAt: deadlineDate.toISOString(),
      formFields: dynamicFields,
      messages: [
        { role: 'user', sender: loggedUser?.name || 'Usuário', text: ticketMessage, date: new Date().toLocaleString() }
      ]
    };

    updateDB({ tickets: [newTicket, ...db.tickets] });
    notify('success', 'Ticket Criado', `Protocolo: ${protocol}`);
    setIsNewTicketModalOpen(false);

    // Reset form
    setTicketSubject('');
    setTicketMessage('');
    setDynamicFields({});
    setSelectedCatId('');

    if (!isSupportOrMaster) {
      setActiveTab('PENDENTE');
      setViewTicket(newTicket);
    }
  };

  const handleAction = (action: 'reply' | 'resolve' | 'cancel') => {
    if (!viewTicket) return;

    let updatedStatus: any = viewTicket.status;
    let newMessageObj = null;

    if (action === 'reply' && !replyText.trim()) return notify('error', 'Digite uma resposta');

    if (action === 'cancel') {
      if (!confirm('Deseja cancelar este ticket?')) return;
      updatedStatus = 'CANCELADO';
    }
    if (action === 'resolve') {
      if (!confirm('Marcar como resolvido?')) return;
      updatedStatus = 'RESOLVIDO';
    }

    const msgs = [...(viewTicket.messages || [])];

    if (action === 'reply') {
      newMessageObj = {
        sender: loggedUser?.name || 'Suporte',
        role: isSupportOrMaster ? 'support' : 'user',
        text: replyText,
        date: new Date().toLocaleString()
      };
      msgs.push(newMessageObj as any);
      if (isSupportOrMaster) updatedStatus = 'RESPONDIDO'; // Or keep PENDENTE? Let's use RESPONDIDO implies support replied.
      // User reply -> PENDENTE
      if (!isSupportOrMaster) updatedStatus = 'PENDENTE';
    }

    const updatedTicket = { ...viewTicket, status: updatedStatus, messages: msgs, respondedBy: isSupportOrMaster ? loggedUser?.name : viewTicket.respondedBy };

    const newTickets = db.tickets.map(t => t.protocol === viewTicket.protocol ? updatedTicket : t);
    updateDB({ tickets: newTickets });

    if (action === 'reply') setReplyText('');
    setViewTicket(updatedTicket); // Update local view
    notify('success', 'Atualizado com sucesso');
  };

  const getDeadlineStatus = (dateStr?: string) => {
    if (!dateStr) return null;
    const deadline = new Date(dateStr);
    const now = new Date();
    const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return { text: 'ATRASADO', color: 'text-red-500' };
    if (diffHours < 24) return { text: 'URGENTE', color: 'text-amber-500' };
    return { text: 'No Prazo', color: 'text-emerald-500' };
  };

  const deadlineInfo = viewTicket?.deadlineAt ? getDeadlineStatus(viewTicket.deadlineAt) : null;

  // Mobile: show list OR detail, not both
  const showListOnMobile = !viewTicket;

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-6 text-[var(--text-dim)] animate-in fade-in p-4 lg:p-0" style={{ color: 'var(--text-dim)' }}>
      {/* SIDEBAR LIST - Hidden on mobile when viewing a ticket */}
      <div className={`${showListOnMobile ? 'flex' : 'hidden'} lg:flex w-full lg:w-1/3 flex-col gap-4 lg:border-r lg:border-slate-800 lg:pr-4`}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2"><ArrowLeft className="w-5 h-5" /> Help Desk</h2>
          {(!isSupportOrMaster || loggedUser?.role === 'master') && ( // Allow master to create too for testing? Or only Comum? Usually Master handles. Let's allow all.
            <button onClick={() => setIsNewTicketModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors"><Plus className="w-5 h-5" /></button>
          )}
        </div>

        <div className="flex p-1 bg-[var(--surface-color)] rounded-xl border border-[var(--border-subtle)]">
          {['PENDENTE', 'RESOLVIDO'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab as any); setViewTicket(null); }} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${activeTab === tab ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
              {tab === 'PENDENTE' ? 'Em Aberto' : 'Encerrados'}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar ticket, user ou ID..."
              className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl py-3 pl-12 pr-4 text-xs outline-none focus:border-blue-500 text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
            />
          </div>

          <select
            value={filterCategoryId}
            onChange={e => setFilterCategoryId(e.target.value)}
            className="w-full bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-xl py-3 px-4 text-xs outline-none focus:border-blue-500 text-[var(--text-main)] font-bold"
          >
            <option value="">Todas Categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto mt-2 space-y-2 custom-scrollbar">
          {filteredTickets.map(t => {
            const status = getDeadlineStatus(t.deadlineAt);
            return (
              <div key={t.protocol} onClick={() => setViewTicket(t)} className={`p-4 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${viewTicket?.protocol === t.protocol ? 'bg-blue-600/10 border-blue-500/50' : 'bg-[var(--card-bg)] border-[var(--border-subtle)] hover:bg-[var(--surface-color)] hover:border-slate-500'}`}>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-[var(--text-main)] line-clamp-1">{t.name}</span>
                  <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{new Date(t.createdAt || t.date || '').toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400">#{t.protocol} • {t.category || t.category}</span>
                  {t.status === 'PENDENTE' && status && <span className={`text-[9px] font-bold ${status.color}`}>{status.text}</span>}
                </div>
              </div>
            );
          })}
          {filteredTickets.length === 0 && <div className="text-center text-slate-500 text-xs py-8">Nenhum ticket encontrado.</div>}
        </div>
      </div>

      {/* DETAIL VIEW - Full screen on mobile when viewing a ticket */}
      <div className={`${!showListOnMobile ? 'flex' : 'hidden'} lg:flex flex-1 flex-col relative`}>
        {!viewTicket ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-50">
            <HelpCircle className="w-16 h-16 mb-4" />
            <p className="text-sm font-bold uppercase">Selecione um chamado</p>
          </div>
        ) : (
          <>
            {/* MOBILE BACK BUTTON */}
            <button onClick={() => setViewTicket(null)} className="lg:hidden flex items-center gap-2 text-blue-500 font-bold text-xs uppercase mb-4 p-2 -ml-2 rounded-lg hover:bg-blue-500/10 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar para Lista
            </button>

            {/* HEADER */}
            <div className="border-b border-slate-800 pb-4 mb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-2">
                <div>
                  <h3 className="text-lg sm:text-2xl font-bold text-[var(--text-main)] mb-1">{viewTicket.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-[var(--text-muted)]">
                    <span className="bg-[var(--input-bg)] px-2 py-1 rounded">#{viewTicket.protocol}</span>
                    <span>{viewTicket.category}</span>
                    <span>{viewTicket.userLogin}</span>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${viewTicket.status === 'RESOLVIDO' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : viewTicket.status === 'CANCELADO' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                  {viewTicket.status}
                </div>
              </div>

              {/* META INFO (Deadline, Fields) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--surface-color)] p-3 sm:p-4 rounded-xl border border-slate-700/50">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Previsão de Resposta</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-white">{viewTicket.deadlineAt ? new Date(viewTicket.deadlineAt).toLocaleString() : 'N/A'}</span>
                    {deadlineInfo && <span className={`text-[10px] font-bold ${deadlineInfo.color} uppercase border border-current px-1 rounded ml-2`}>{deadlineInfo.text}</span>}
                  </div>
                </div>
                {viewTicket.formFields && Object.keys(viewTicket.formFields).length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Dados Informados</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(viewTicket.formFields).map(([k, v]) => (
                        <div key={k} className="text-xs">
                          <span className="text-slate-400">{k}:</span> <span className="text-white font-medium">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CHAT/MESSAGES */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar flex flex-col mb-4">
              {/* First Message (Description) - if not in messages (legacy) */}
              {(!viewTicket.messages || viewTicket.messages.length === 0) && (
                <div className="flex gap-3 justify-end">
                  <div className="max-w-[80%] bg-[var(--input-bg)] text-[var(--text-main)] p-4 rounded-2xl rounded-tr-none text-sm">
                    <p>{viewTicket.details}</p>
                    <p className="text-[9px] opacity-70 mt-2 text-right">{new Date(viewTicket.createdAt || viewTicket.date || '').toLocaleString()}</p>
                  </div>
                </div>
              )}
              {/* Messages List */}
              {(viewTicket.messages || []).map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'support' && <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">S</div>}
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-[var(--card-bg)] text-[var(--text-dim)] border border-[var(--border-subtle)] rounded-tr-none' : 'bg-[var(--input-bg)] text-[var(--text-dim)] rounded-tl-none'}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-[9px] opacity-70 mt-2 text-right">{msg.date}</p>
                  </div>
                  {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">U</div>}
                </div>
              ))}
            </div>

            {/* ACTIONS */}
            {viewTicket.status !== 'RESOLVIDO' && viewTicket.status !== 'CANCELADO' && (
              <div className="mt-auto pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={isSupportOrMaster ? "Escreva uma resposta..." : "Adicionar comentário..."}
                    className="flex-1 bg-black/20 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-500 resize-none h-20"
                  ></textarea>
                  <button onClick={() => handleAction('reply')} className="h-20 w-20 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex flex-col items-center justify-center gap-1 transition-all">
                    <Send className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase">Enviar</span>
                  </button>
                </div>

                {isSupportOrMaster && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAction('resolve')} className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 border border-emerald-500/30 py-2 rounded-lg text-xs font-bold uppercase transition-all">
                      Marcar Resolvido
                    </button>
                    <button onClick={() => handleAction('cancel')} className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-500/30 py-2 rounded-lg text-xs font-bold uppercase transition-all">
                      Cancelar Ticket
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL: NEW TICKET */}
      {isNewTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[var(--surface-color)] w-full max-w-lg rounded-3xl shadow-2xl border border-[var(--border-subtle)] p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-subtle)]">
              <h3 className="font-bold text-[var(--text-main)] text-xl">Novo Chamado</h3>
              <button onClick={() => setIsNewTicketModalOpen(false)}><XCircle className="w-6 h-6 text-[var(--text-muted)] hover:text-[var(--text-main)]" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">Categoria de Suporte</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => { setSelectedCatId(cat.id); setDynamicFields({}); }} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${selectedCatId === cat.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[var(--input-bg)] border-[var(--border-subtle)] text-[var(--text-dim)] hover:bg-[var(--card-bg)]'}`}>
                      {cat.name}
                    </button>
                  ))}
                  {categories.length === 0 && <p className="col-span-2 text-xs text-red-400 italic">Nenhuma categoria configurada. Contate o administrador.</p>}
                </div>
              </div>

              {/* DYNAMIC FIELDS based on Category */}
              {selectedCatId && (
                <div key={selectedCatId} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                  <p className="text-[10px] font-bold text-blue-400 uppercase mb-2">Dados Adicionais Obrigatórios</p>
                  {categories.find(c => c.id === selectedCatId)?.requiredFields.map(field => (
                    <div key={field}>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{field}</label>
                      <input
                        type="text"
                        value={dynamicFields[field] || ''}
                        onChange={e => setDynamicFields({ ...dynamicFields, [field]: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                  {categories.find(c => c.id === selectedCatId)?.requiredFields.length === 0 && <p className="text-slate-500 text-xs italic">Nenhum dado extra necessário.</p>}
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">Assunto</label>
                <input type="text" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm text-[var(--text-main)] outline-none focus:border-blue-500" placeholder="Resumo do problema..." />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">Descrição Detalhada</label>
                <textarea rows={4} value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm text-[var(--text-main)] outline-none focus:border-blue-500 resize-none" placeholder="Descreva o que aconteceu..."></textarea>
              </div>
            </div>

            <button onClick={handleCreateTicket} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold uppercase text-sm shadow-xl hover:shadow-2xl transition-all">
              Abrir Chamado
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
