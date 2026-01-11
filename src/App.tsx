
import React, { useState, useEffect } from 'react';
import { useDB } from './context/DBContext';
import { ViewState } from './types';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { DataView } from './pages/DataView';
import { Support } from './pages/Support';
import { Master } from './pages/Master';
import { Design } from './pages/Design';
import { RefreshCw, Database, Bell, Menu } from 'lucide-react';

const isLight = (color: string) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155; // Slightly higher threshold for better contrast
};

const App: React.FC = () => {
  const { loggedUser, db, loading, isLoadingAuth, forceSync, inscriptions, loadInscriptionsFromSupabase, logout, updateDB, fetchLogs, notify } = useDB();

  useEffect(() => {
    // VISUAL CONFIRMATION OF DEPLOYMENT
    console.log("%c !!! SISTEMA NEXUS ATUALIZADO V1.2.1 - CACHE LIMPADO !!! ", "background: #22c55e; color: white; font-weight: bold; padding: 4px; border-radius: 4px;");
  }, []);
  const [currentView, setCurrentView] = useState<ViewState>('inscricoes');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (db.config) {
      const root = document.documentElement;
      const bg = db.config.bgColor || '#0f172a';
      const light = isLight(bg);

      root.style.setProperty('--primary-color', db.config.color || '#3b82f6');
      root.style.setProperty('--icon-color', db.config.iconColor || '#ffffff');
      root.style.setProperty('--accent-color', db.config.accentColor || db.config.color || '#3b82f6');
      root.style.setProperty('--main-font', db.config.fontFamily || 'Inter, sans-serif');
      root.style.setProperty('--border-radius', `${db.config.borderRadius || 20}px`);

      root.style.setProperty('--bg-color', bg);

      // Adaptive Contrasts
      if (light) {
        root.style.setProperty('--text-main', '#0f172a');
        root.style.setProperty('--text-dim', '#334155'); // slate-700
        root.style.setProperty('--text-muted', '#64748b'); // slate-500
        root.style.setProperty('--border-subtle', 'rgba(0, 0, 0, 0.1)');
        root.style.setProperty('--input-bg', 'rgba(0, 0, 0, 0.05)');
        root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.8)');
        root.style.setProperty('--header-bg', 'rgba(255, 255, 255, 0.8)');
        root.style.setProperty('--surface-color', '#f1f5f9');
      } else {
        root.style.setProperty('--text-main', '#ffffff');
        root.style.setProperty('--text-dim', '#cbd5e1'); // slate-300
        root.style.setProperty('--text-muted', '#94a3b8'); // slate-400
        root.style.setProperty('--border-subtle', 'rgba(255, 255, 255, 0.05)');
        root.style.setProperty('--input-bg', 'rgba(0, 0, 0, 0.2)');
        root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.05)');
        root.style.setProperty('--header-bg', 'rgba(15, 23, 42, 0.8)');
        root.style.setProperty('--surface-color', 'color-mix(in srgb, ' + bg + ', white 5%)');
      }

      document.body.style.fontFamily = db.config.fontFamily || 'Inter, sans-serif';
    }
  }, [db.config]);

  useEffect(() => {
    if (loggedUser) {
      setCurrentView('inscricoes');
    }
  }, [loggedUser]);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 bg-[#0f172a] flex flex-col items-center justify-center">
        <div className="loader mb-4" style={{ borderTopColor: '#3b82f6' }}></div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest animate-pulse">Iniciando Nexus...</p>
      </div>
    );
  }

  if (!loggedUser) {
    return <Login />;
  }

  const renderContent = () => {
    const restrictedViews = ['master', 'design'];
    if (restrictedViews.includes(currentView) && loggedUser.role !== 'master') {
      return <DataView mode="inscricoes" />;
    }

    switch (currentView) {
      case 'inscricoes': return <DataView mode="inscricoes" />;
      case 'certificados': return <DataView mode="certificados" />;
      case 'relatorio': return <DataView mode="relatorio" />;
      case 'suporte': return <Support />;
      case 'master': return <Master />;
      case 'design': return <Design />;
      default: return <DataView mode="inscricoes" />;
    }
  };

  const getTitle = () => {
    const restrictedViews = ['master', 'design'];
    if (restrictedViews.includes(currentView) && loggedUser.role !== 'master') {
      return 'Inscrições';
    }

    switch (currentView) {
      case 'inscricoes': return 'Gestão de Inscrições';
      case 'certificados': return 'Emissão de Certificados';
      case 'relatorio': return 'Relatórios e Métricas';
      case 'suporte': return 'Central de Suporte';
      case 'master': return 'Configurações Globais';
      case 'design': return 'Identidade Visual';
      default: return 'Nexus';
    }
  };

  return (
    <div
      className="flex h-screen w-full transition-colors duration-500 selection:bg-blue-500/30"
      style={{ fontFamily: 'var(--main-font)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
    >
      {loading && (
        <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-md z-[500] flex flex-col items-center justify-center">
          <div className="loader mb-4" style={{ borderTopColor: 'var(--primary-color)' }}></div>
          <p
            className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse"
            style={{ color: 'var(--primary-color)' }}
          >
            Sincronizando Nexus...
          </p>
        </div>
      )}

      <Sidebar
        activeView={currentView}
        setView={setCurrentView}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <style dangerouslySetInnerHTML={{
          __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { 
            background: color-mix(in srgb, var(--primary-color), transparent 70%); 
            border-radius: 10px; 
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
            background: color-mix(in srgb, var(--primary-color), transparent 50%); 
          }
        `}} />
        {/* Header Glassmorphism */}
        <header className="h-20 flex justify-between items-center px-4 lg:px-8 border-b border-[var(--border-subtle)] bg-[var(--header-bg)]/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)] text-[var(--text-main)]"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-sm lg:text-lg font-bold text-[var(--text-main)] tracking-tight">{getTitle()}</h3>
              <p className="text-[8px] lg:text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-semibold">Painel Administrativo</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {inscriptions.length > 0 ? (
              <div className="hidden md:flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wide animate-in fade-in">
                <Database className="w-3 h-3" />
                {inscriptions.length} Registros
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 text-[10px] font-bold uppercase tracking-wide">
                <Database className="w-3 h-3" />
                Carregando...
              </div>
            )}

            <div className="h-8 w-[1px] bg-white/10 mx-2"></div>

            <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0f172a]"></span>
            </button>

            <button
              onClick={forceSync}
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95"
              title="Forçar Sincronização"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Area with subtle gradient */}
        <div
          className="flex-1 p-6 overflow-y-auto custom-scrollbar"
          style={{ backgroundImage: 'linear-gradient(to bottom, var(--bg-color), color-mix(in srgb, var(--bg-color), black 20%))' }}
        >
          {/* KEY PROP ADDED HERE: Forces remount on view change */}
          <div key={currentView} className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-[1600px] mx-auto h-full">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
