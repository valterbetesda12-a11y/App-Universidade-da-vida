
import React from 'react';
import { LayoutDashboard, Users, FileCheck, LifeBuoy, ToggleLeft, ToggleRight, LogOut, Hexagon, X } from 'lucide-react';
import { User } from '../types/app'; // Ensure types match
import { useDB } from '../context/DBContext';

interface MainLayoutProps {
  children: React.ReactNode;
  activeView: string;
  setView: (view: any) => void;
  user: User;
  isMasterMode: boolean;
  toggleMasterMode: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, activeView, setView, user, isMasterMode, toggleMasterMode 
}) => {
  const { toasts, dismissToast } = useDB(); // Consume toasts from context
  
  const navItems = [
    { id: 'inscricoes', label: 'Inscrições', icon: Users },
    { id: 'relatorios', label: 'Relatórios', icon: LayoutDashboard },
    { id: 'certificados', label: 'Certificados', icon: FileCheck },
    { id: 'suporte', label: 'Suporte', icon: LifeBuoy },
  ];

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-100 font-sans overflow-hidden bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center relative">
      {/* Global Toast Container */}
      <div className="absolute top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
          {toasts.map(toast => (
              <div key={toast.id} className={`pointer-events-auto min-w-[300px] p-4 rounded-xl border shadow-2xl flex items-start justify-between gap-4 animate-in slide-in-from-right fade-in duration-300 ${toast.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-200' : toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' : 'bg-slate-800/90 border-slate-600 text-slate-200'} backdrop-blur-md`}>
                  <div>
                      <h4 className="font-bold text-sm">{toast.title}</h4>
                      {toast.desc && <p className="text-xs opacity-80 mt-1">{toast.desc}</p>}
                  </div>
                  <button onClick={() => dismissToast(toast.id)} className="opacity-50 hover:opacity-100"><X className="w-4 h-4"/></button>
              </div>
          ))}
      </div>

      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-0"></div>

      <aside className="w-72 h-full z-10 flex flex-col border-r border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300">
        <div className="p-8 flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30">
            <Hexagon className="w-8 h-8 text-blue-400 fill-blue-400/10" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter italic">NEXUS</h1>
            <p className="text-[10px] text-blue-300 font-bold uppercase tracking-[0.2em]">System Pro</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-200 group ${
                activeView === item.id 
                  ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-400/50' 
                  : 'hover:bg-white/5 hover:border hover:border-white/10 border border-transparent'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-blue-300'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${activeView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                {item.label}
              </span>
            </button>
          ))}
          {user.role === 'master' && (
             <button onClick={() => setView('master')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-200 group ${activeView === 'master' ? 'bg-purple-600 shadow-[0_0_20px_rgba(147,51,234,0.3)] border border-purple-400/50' : 'hover:bg-white/5 hover:border hover:border-white/10 border border-transparent'}`}>
                 <Hexagon className={`w-5 h-5 ${activeView === 'master' ? 'text-white' : 'text-slate-400'}`} />
                 <span className={`text-xs font-bold uppercase tracking-wider ${activeView === 'master' ? 'text-white' : 'text-slate-400'}`}>Configurações</span>
             </button>
          )}
        </nav>

        <div className="p-6 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 border-2 border-white/20 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                {user.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white leading-none truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 uppercase mt-1">{user.role}</p>
            </div>
            <button onClick={() => { localStorage.removeItem('@nexus_user'); window.location.reload(); }} className="text-red-400 cursor-pointer hover:text-red-300 bg-red-500/10 p-2 rounded-lg hover:bg-red-500/20 transition-colors">
                <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative z-10 flex flex-col h-full overflow-hidden">
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-10 bg-white/5 backdrop-blur-md">
          <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            {activeView === 'master' ? 'Painel Master' : navItems.find(i => i.id === activeView)?.label || 'Painel'}
          </h2>
          {isMasterMode && (
            <div className="px-4 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>
              Modo Editor Ativo
            </div>
          )}
        </header>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
};
