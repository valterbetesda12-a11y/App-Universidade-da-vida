
import React, { useState, useEffect } from 'react';
import { MainLayout } from './components/MainLayout';
import { ReportsView } from './pages/ReportsView';
import { Login } from './components/Login';
import { useDB } from './context/DBContext';
import { DataView } from './pages/DataView';
import { Support } from './pages/Support';
import { Master } from './pages/Master';
import { Design } from './pages/Design';
import { Construction } from 'lucide-react';

const App: React.FC = () => {
  const { loggedUser, db, loading } = useDB();
  const [isMasterMode, setIsMasterMode] = useState(false);
  const [activeView, setActiveView] = useState<'inscricoes' | 'relatorio' | 'certificados' | 'suporte'>('inscricoes');

  // Sync Master Mode with Role
  useEffect(() => {
    if (loggedUser?.role === 'master') {
      setIsMasterMode(true);
    } else {
      setIsMasterMode(false);
    }
  }, [loggedUser]);

  // Apply Global Styles from DB Config
  useEffect(() => {
    if (db.config) {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', db.config.color || '#3b82f6');
      root.style.setProperty('--icon-color', db.config.iconColor || '#ffffff');
      root.style.setProperty('--accent-color', db.config.accentColor || db.config.color || '#3b82f6');
      root.style.setProperty('--main-font', db.config.fontFamily || 'Inter, sans-serif');
      root.style.setProperty('--border-radius', `${db.config.borderRadius || 20}px`);
      document.body.style.fontFamily = db.config.fontFamily || 'Inter, sans-serif';
    }
  }, [db.config]);

  if (!loggedUser) {
    return <Login />;
  }

  const toggleMasterMode = () => {
    if (loggedUser.role === 'master') {
      setIsMasterMode(!isMasterMode);
    } else {
      alert('Acesso negado: Apenas Master pode editar.');
    }
  };

  // Renderização Condicional das Views
  const renderContent = () => {
    // Views restritas
    if (['master', 'design'].includes(activeView as any) && loggedUser.role !== 'master') {
        return <DataView mode="inscricoes" />;
    }

    switch (activeView) {
      case 'relatorio':
        // Se o usuário quer editar o dashboard, usamos o DataView.
        // Se quiser o relatório executivo fixo, poderia ser o ReportsView.
        // Como a solicitação pede "editor visual com opções de gráficos", usamos DataView.
        return <DataView mode="relatorio" />;
      case 'inscricoes':
        return <DataView mode="inscricoes" />;
      case 'certificados':
        return <DataView mode="certificados" />;
      case 'suporte':
        return <Support />;
      // Adicionando rotas extras compatíveis com o Sidebar do MainLayout se necessário
      default:
        // Fallback para DataView se o ID não for reconhecido, ou Master/Design se implementados no Layout
        if (activeView === 'master' as any) return <Master />;
        if (activeView === 'design' as any) return <Design />;
        return <DataView mode="inscricoes" />;
    }
  };

  return (
    <MainLayout
      activeView={activeView}
      setView={setActiveView}
      user={loggedUser as any} // Cast simples para compatibilidade de tipos se necessário
      isMasterMode={isMasterMode}
      toggleMasterMode={toggleMasterMode}
    >
      {renderContent()}
    </MainLayout>
  );
};

export default App;
