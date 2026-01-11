import React, { useState } from 'react';
import { useDB } from '../context/useDB';
import { Layout, Type, Palette, MousePointerClick, Check, Moon, Sun, Monitor, Smartphone, LayoutGrid } from 'lucide-react';
import { ICON_PATHS } from '../utils/iconPaths';

export const Design: React.FC = () => {
  const { db, updateDB } = useDB();
  const [activeTab, setActiveTab] = useState<'themes' | 'components' | 'icons'>('themes');

  const themes = [
    { name: 'Midnight (Padrão)', colors: { bg: '#0f172a', text: '#ffffff', primary: '#3b82f6', accent: '#64748b' } },
    { name: 'Ocean', colors: { bg: '#0f172a', text: '#e2e8f0', primary: '#0ea5e9', accent: '#0891b2' } },
    { name: 'Sunset', colors: { bg: '#1c1917', text: '#fafaf9', primary: '#f97316', accent: '#db2777' } },
    { name: 'Forest', colors: { bg: '#052e16', text: '#f0fdf4', primary: '#22c55e', accent: '#15803d' } },
    { name: 'Dracula', colors: { bg: '#282a36', text: '#f8f8f2', primary: '#ff79c6', accent: '#bd93f9' } },
    { name: 'Cloud White', colors: { bg: '#F8FAFC', text: '#1E293B', primary: '#3B82F6', accent: '#94A3B8' } },
    { name: 'Soft Sand', colors: { bg: '#FAF7F2', text: '#432818', primary: '#D4A373', accent: '#A45D5D' } },
    { name: 'Mint Fresh', colors: { bg: '#F0FDF4', text: '#064E3B', primary: '#10B981', accent: '#059669' } },
    { name: 'Elegant Lavender', colors: { bg: '#F5F3FF', text: '#4C1D95', primary: '#8B5CF6', accent: '#7C3AED' } },
    { name: 'Peach Bliss', colors: { bg: '#FFF7ED', text: '#7C2D12', primary: '#F97316', accent: '#EA580C' } },
    { name: 'Slate Professional', colors: { bg: '#F1F5F9', text: '#334155', primary: '#64748B', accent: '#475569' } },
    { name: 'Cyberpunk', colors: { bg: '#050505', text: '#ffffff', primary: '#BD00FF', accent: '#00E0FF' } },
    { name: 'Nord', colors: { bg: '#2E3440', text: '#D8DEE9', primary: '#88C0D0', accent: '#4C566A' } },
    { name: 'Sahara', colors: { bg: '#2C1810', text: '#F5EBE0', primary: '#E2B07E', accent: '#A45D5D' } },
    { name: 'Rose Gold', colors: { bg: '#1A0F0F', text: '#FDF0F0', primary: '#E7B1B1', accent: '#B1907F' } },
    { name: 'OLED Dark', colors: { bg: '#000000', text: '#FFFFFF', primary: '#FFFFFF', accent: '#2E2E2E' } },
  ];

  const fontOptions = [
    { name: 'Inter (Moderna)', value: "'Inter', sans-serif" },
    { name: 'Montserrat (Elegante)', value: "'Montserrat', sans-serif" },
    { name: 'Outfit (Trend)', value: "'Outfit', sans-serif" },
    { name: 'Roboto Mono (Tech)', value: "'Roboto Mono', monospace" }
  ];

  const updateConfig = (key: string, value: any) => {
    updateDB({ config: { ...db.config, [key]: value } });
  };

  const applyTheme = (theme: any) => {
    updateDB({
      config: {
        ...db.config,
        color: theme.colors.primary,
        accentColor: theme.colors.accent,
        bgColor: theme.colors.bg,
        textColor: theme.colors.text
      }
    });
  };

  return (
    <div className="flex h-full gap-8 animate-in fade-in duration-500" style={{ fontFamily: db.config.fontFamily }}>

      {/* SIDEBAR CONTROLS */}
      <div className="w-[400px] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
        <header>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-[var(--text-main)] mb-2">Design System</h1>
          <p className="text-xs text-[var(--text-muted)] font-medium">Personalize cada detalhe da interface.</p>
        </header>

        {/* TABS */}
        <div className="flex bg-[var(--card-bg)] p-1 rounded-xl border border-[var(--border-subtle)]">
          {[
            { id: 'themes', icon: Palette, label: 'Temas' },
            { id: 'components', icon: Layout, label: 'Estilo' },
            { id: 'icons', icon: MousePointerClick, label: 'Ícones' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'themes' && (
          <div className="space-y-6">
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Presets de Cores</h3>
              <div className="grid grid-cols-1 gap-3">
                {themes.map((t, i) => (
                  <button key={i} onClick={() => applyTheme(t)} className="flex items-center gap-4 bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--border-subtle)] hover:border-blue-500/50 transition-all group text-left">
                    <div className="flex gap-1">
                      <div className="w-6 h-6 rounded-full shadow-lg" style={{ backgroundColor: t.colors.primary }}></div>
                      <div className="w-6 h-6 rounded-full shadow-lg -ml-2" style={{ backgroundColor: t.colors.accent }}></div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-main)] group-hover:text-blue-500 transition-colors">{t.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Primária & Acento</p>
                    </div>
                    {db.config.color === t.colors.primary && <Check className="w-5 h-5 text-emerald-500 ml-auto" />}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cores Personalizadas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-2">
                  <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Primária</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={db.config.color} onChange={(e) => updateConfig('color', e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent" />
                    <span className="text-xs font-mono text-[var(--text-dim)]">{db.config.color}</span>
                  </div>
                </div>
                <div className="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-2">
                  <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Acento</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={db.config.accentColor || '#64748b'} onChange={(e) => updateConfig('accentColor', e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent" />
                    <span className="text-xs font-mono text-[var(--text-dim)]">{db.config.accentColor}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'components' && (
          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipografia</h3>
              <div className="space-y-2">
                {fontOptions.map(f => (
                  <button key={f.value} onClick={() => updateConfig('fontFamily', f.value)} className={`w-full text-left p-4 rounded-xl border transition-all ${db.config.fontFamily === f.value ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-[var(--card-bg)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--card-bg)]/80'}`}>
                    <span className="text-sm font-bold block" style={{ fontFamily: f.value, color: db.config.fontFamily === f.value ? 'inherit' : 'var(--text-main)' }}>{f.name}</span>
                    <span className="text-[10px] opacity-70">The quick brown fox jumps over the lazy dog</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estilo dos Componentes</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Arredondamento</label><span className="text-[10px] text-white">{db.config.borderRadius}px</span></div>
                  <input type="range" min="0" max="30" value={db.config.borderRadius} onChange={(e) => updateConfig('borderRadius', parseInt(e.target.value))} className="w-full h-2 bg-[var(--surface-color)] rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Formato</label>
                  <div className="flex gap-2">
                    {['rounded', 'sharp', 'pill'].map(s => (
                      <button key={s} onClick={() => updateConfig('componentStyle', s)} className={`flex-1 py-3 text-[10px] font-bold uppercase border transition-all ${db.config.componentStyle === s ? 'bg-white text-black border-white' : 'bg-[var(--surface-color)] text-slate-400 border-white/5'}`} style={{ borderRadius: s === 'pill' ? '999px' : s === 'sharp' ? '0px' : '8px' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'icons' && (
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ícones do Menu</h3>
            <div className="space-y-4">
              {['inscricoes', 'certificados', 'relatorio', 'suporte', 'master'].map(tab => (
                <div key={tab} className="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-main)] capitalize">{tab}</span>
                    <div className="w-8 h-8 rounded-lg bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-muted)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d={(db.config.tabIcons as any)?.[tab] || ICON_PATHS['Home']} />
                      </svg>
                    </div>
                  </div>

                  {/* ICON GRID */}
                  <div className="grid grid-cols-6 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    {Object.entries(ICON_PATHS).map(([name, path]) => (
                      <button
                        key={name}
                        onClick={() => updateConfig('tabIcons', { ...db.config.tabIcons, [tab]: path })}
                        title={name}
                        className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${(db.config.tabIcons as any)?.[tab] === path
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-[var(--input-bg)] text-[var(--text-muted)] border-transparent hover:text-[var(--text-main)] hover:bg-[var(--card-bg)]'
                          }`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d={path} /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* LIVE PREVIEW AREA */}
      <div className="flex-1 bg-[var(--surface-color)] rounded-[2.5rem] border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50"></div>

        <div className="p-8 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--surface-color)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">Live Preview</h2>
            <p className="text-[10px] text-[var(--text-muted)] font-medium">Veja suas alterações em tempo real</p>
          </div>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
          </div>
        </div>

        <div className="flex-1 p-10 overflow-auto flex flex-col gap-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5">

          {/* COMPONENT SHOWCASE */}
          <div className="grid grid-cols-2 gap-8">

            {/* Cards */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Cards & Surfaces</p>
              <div className="bg-[var(--card-bg)] p-6 border border-[var(--border-subtle)] shadow-xl" style={{ borderRadius: db.config.componentStyle === 'pill' ? '24px' : db.config.componentStyle === 'sharp' ? '0px' : `${db.config.borderRadius}px` }}>
                <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: db.config.color }}>
                  <Layout className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Dashboard Card</h3>
                <p className="text-xs text-[var(--text-dim)] leading-relaxed">This card demonstrates the border, shadow, and color settings currently applied.</p>
              </div>
            </div>

            {/* Buttons & Inputs */}
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Interactions</p>

              <button className="w-full py-4 px-6 font-bold text-sm text-white shadow-lg shadow-blue-900/20 transition-transform active:scale-95" style={{ backgroundColor: db.config.color, borderRadius: db.config.componentStyle === 'pill' ? '999px' : db.config.componentStyle === 'sharp' ? '0px' : `${db.config.borderRadius}px` }}>
                Primary Button
              </button>

              <button className="w-full py-4 px-6 font-bold text-sm border transition-colors hover:bg-white/5" style={{ borderColor: db.config.color, color: db.config.color, borderRadius: db.config.componentStyle === 'pill' ? '999px' : db.config.componentStyle === 'sharp' ? '0px' : `${db.config.borderRadius}px` }}>
                Secondary Button
              </button>

              <div className="relative">
                <input type="text" placeholder="Input field example..." className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] py-3 px-4 text-sm text-[var(--text-main)] outline-none focus:border-blue-500 transition-all font-medium" style={{ borderRadius: db.config.componentStyle === 'pill' ? '999px' : db.config.componentStyle === 'sharp' ? '0px' : `${db.config.borderRadius}px` }} />
              </div>
            </div>

          </div>

          {/* Typography Showcase */}
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4">Typography Scale</p>
            <div className="space-y-4 border-l-2 border-[var(--border-subtle)] pl-6">
              <div>
                <p className="text-4xl font-black text-[var(--text-main)] tracking-tight">Heading 1</p>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-1">42px • Extra Bold</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-main)]">Heading 2 Title</p>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-1">24px • Bold</p>
              </div>
              <div>
                <p className="text-base text-[var(--text-dim)] leading-relaxed max-w-lg">
                  Body text paragraph example. The quick brown fox jumps over the lazy dog.
                  Design is intelligence made visible.
                </p>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-1">16px • Regular • Relaxed</p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
