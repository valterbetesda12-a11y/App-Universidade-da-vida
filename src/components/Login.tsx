
import React, { useState } from 'react';
import { useDB } from '../context/DBContext';
import { CheckCircle, X, ArrowRight, Lock, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, forceSync } = useDB();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [showToast, setShowToast] = useState(true);

  const [localLoading, setLocalLoading] = useState(false);
  const handleLogin = async () => {
    setLocalLoading(true);
    if (await login(user, pass)) {
      // The App.tsx useEffect will handle the redirection once loggedUser is set
      console.log("Login success, waiting for context update...");
    } else {
      alert("Acesso negado. Usuário ou senha incorretos.");
      setLocalLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-[100] bg-[#0f172a] text-slate-200 font-sans">
      {showToast && (
        <div className="absolute top-10 flex items-start gap-4 bg-[#1e293b] p-4 rounded-xl border border-emerald-900/50 shadow-2xl animate-in slide-in-from-top-4 fade-in">
          <div className="bg-emerald-500/10 p-2 rounded-full text-emerald-500">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Sistema sincronizado</h4>
            <p className="text-xs text-slate-400 mt-1">Planilhas Google atualizadas com sucesso.</p>
          </div>
          <button onClick={() => setShowToast(false)} className="text-slate-500 hover:text-white ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">Painel Administrativo</p>

      <div className="bg-[#1e293b] p-10 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-700/50 relative overflow-hidden">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo de volta</h1>
          <p className="text-sm text-slate-400">Faça login para gerenciar inscrições e relatórios.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 ml-1">E-mail corporativo</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="admin@exemplo.com"
                value={user}
                onChange={e => setUser(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#0f172a] border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-sm font-medium transition-colors placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between ml-1">
              <label className="text-xs font-bold text-slate-400">Senha</label>
              <a href="#" className="text-xs font-bold text-blue-500 hover:underline">Esqueceu a senha?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={pass}
                onChange={e => setPass(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#0f172a] border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-sm font-medium transition-colors placeholder:text-slate-600"
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={localLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            {localLoading ? 'Autenticando...' : 'Entrar no Sistema'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-8 text-center border-t border-slate-700 pt-6">
          <p className="text-[10px] text-slate-500">
            Protegido por reCAPTCHA e sujeito à <a href="#" className="text-blue-500">Privacidade</a> e <a href="#" className="text-blue-500">Termos</a>.
          </p>
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-500">
        Não tem acesso? <a href="#" className="text-blue-500 font-bold hover:underline">Contate o suporte</a>
      </p>
    </div>
  );
};
