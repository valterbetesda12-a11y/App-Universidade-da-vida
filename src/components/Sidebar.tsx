
import React from 'react';
import { useDB } from '../context/DBContext';
import { ViewState } from '../types';
import { LogOut, Hexagon, X } from 'lucide-react';

export const Sidebar: React.FC<{
  activeView: ViewState;
  setView: (v: ViewState) => void;
  isOpen?: boolean;
  onClose?: () => void;
}> = ({ activeView, setView, isOpen, onClose }) => {
  const { db, logout, loggedUser } = useDB();

  const renderIcon = (tabId: string) => {
    const icons = db.config.tabIcons as Record<string, string>;
    const iconPath = icons[tabId] || 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z';
    return (
      <svg width={db.config.iconSize || 18} height={db.config.iconSize || 18} viewBox="0 0 24 24" fill="currentColor">
        <path d={iconPath} />
      </svg>
    );
  };

  const menuItems = [
    { id: 'inscricoes', label: 'Inscrições', show: true },
    { id: 'certificados', label: 'Certificados', show: true },
    { id: 'relatorio', label: 'Relatórios', show: true },
    { id: 'suporte', label: 'Suporte', show: true },
    { id: 'design', label: 'Design System', show: loggedUser?.role === 'master' },
    { id: 'master', label: 'Configurações', show: loggedUser?.role === 'master' },
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in transition-all"
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 w-72 h-screen flex flex-col border-r border-[var(--border-subtle)] transition-transform duration-300 z-[100] lg:static lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ fontFamily: db.config.fontFamily, backgroundColor: 'var(--bg-color)', color: 'var(--text-dim)' }}
      >
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-6 right-6 p-2 rounded-xl bg-white/5 text-[var(--text-muted)] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Area */}
        <div className="p-8 flex items-center gap-4">
          <div
            className="p-2.5 rounded-xl border border-white/10 shadow-lg"
            style={{ backgroundColor: `${db.config.color}20` }}
          >
            <Hexagon className="w-6 h-6" style={{ color: db.config.color, fill: `${db.config.color}40` }} />
          </div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-[var(--text-main)] leading-none">NEXUS</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-70">System Pro</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 py-4">
          {menuItems.map(item => item.show && (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id as ViewState);
                if (onClose) onClose();
              }}
              className={`
                w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 font-bold text-xs uppercase tracking-wide group relative overflow-hidden
                ${activeView === item.id ? 'text-[var(--text-main)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-bg)]'}
            `}
              style={{
                backgroundColor: activeView === item.id ? `${db.config.color}20` : 'transparent',
                borderColor: activeView === item.id ? `${db.config.color}40` : 'transparent',
                borderWidth: '1px'
              }}
            >
              {activeView === item.id && (
                <div
                  className="absolute inset-0 opacity-20"
                  style={{ backgroundColor: db.config.color, filter: 'blur(20px)' }}
                ></div>
              )}
              <span
                className="relative z-10 transition-colors"
                style={{ color: activeView === item.id ? db.config.color : 'inherit' }}
              >
                {renderIcon(item.id)}
              </span>
              <span className="relative z-10">{item.label}</span>
              {activeView === item.id && <div className="absolute right-4 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: db.config.accentColor }}></div>}
            </button>
          ))}
        </nav>

        {/* Footer User */}
        <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--surface-color)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-[var(--border-subtle)] flex items-center justify-center text-sm font-bold text-white shadow-inner">
              {loggedUser?.user.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-[var(--text-main)] truncate">{loggedUser?.name || 'Usuário'}</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">{loggedUser?.role}</p>
            </div>
          </div>
          <button
            onClick={async () => await logout()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold uppercase text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sair do Sistema
          </button>
        </div>
      </div>
    </>
  );
};
