
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useDB } from '../context/DBContext';
import { 
  Search, Printer, Edit3, ArrowLeft, XCircle, Folder, Activity, PieChart, BarChart, FileText, Award, Trash2, Plus, Settings, Palette, Maximize, BarChart2, Table, MousePointer2, Grid, Sigma, FileSpreadsheet, LayoutGrid, ListFilter, List, TextCursorInput, MousePointerClick, ChevronDown, ArrowUp, ArrowDown, Move, CheckCircle, Download, Upload, Eye, ChevronLeft, ChevronRight, SlidersHorizontal, CalendarDays, CheckSquare, Type, Filter, Users, Briefcase, User, AlertCircle, Square, Circle, TrendingUp, LayoutTemplate, Database, Image as ImageIcon, Loader2
} from 'lucide-react';
import { DataRow, DashboardWidget, CertConfig } from '../types';

interface DataViewProps {
  mode: 'inscricoes' | 'certificados' | 'relatorio';
}

const ITEMS_PER_PAGE = 50;

// --- HELPERS ---
const safeImportPDF = async () => {
    try {
        const module = await import('jspdf');
        return module.default || module.jsPDF || module;
    } catch (e) {
        console.error("Erro critico importando JSPDF", e);
        throw e;
    }
};

const getCoordinatesForPercent = (percent: number) => {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
};

// --- SUB-COMPONENTES VISUAIS ---

const AdvancedChart: React.FC<{ type: string; data: any[]; config: any; onSelect: any; selectedLabels: any[] }> = ({ type, data, config, onSelect, selectedLabels }) => {
  // Simplificação: Reutilizando lógica visual existente mas com classes Tailwind aprimoradas
  const max = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((a, b) => a + b.value, 0) || 1;

  if (type === 'bar') {
      const isHorizontal = config.horizontal;
      return (
        <div className={`flex ${isHorizontal ? 'flex-col gap-2 p-4' : 'items-end justify-around gap-2 pt-4 pb-6 px-4'} h-full w-full`}>
            {data.map((d, i) => {
                const isSelected = selectedLabels.includes(d.label);
                const opacity = selectedLabels.length > 0 && !isSelected ? 0.3 : 1;
                const sizePercent = (d.value / max) * 100;
                
                if (isHorizontal) {
                    return (
                        <div key={i} className="flex items-center gap-2 group cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelect(d.label); }} style={{ opacity }}>
                            <div className="w-24 text-[10px] font-bold text-slate-500 truncate text-right shrink-0" style={{ fontFamily: config.fontFamily }}>{d.label}</div>
                            <div className="flex-1 h-6 bg-slate-50 rounded-md overflow-hidden relative">
                                <div className="h-full rounded-md transition-all duration-500 relative flex items-center justify-end pr-2 shadow-sm" style={{ width: `${sizePercent}%`, backgroundColor: d.color }}>
                                    <span className="text-[9px] font-bold text-white drop-shadow-md">{d.value}</span>
                                </div>
                            </div>
                        </div>
                    );
                }
                return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative cursor-pointer transition-all hover:scale-105 h-full justify-end" onClick={(e) => { e.stopPropagation(); onSelect(d.label); }} style={{ opacity }}>
                        <div className="w-full rounded-t-sm transition-all duration-500 relative flex items-start justify-center pt-1 shadow-sm group-hover:shadow-md" style={{ height: `${sizePercent}%`, backgroundColor: d.color, minHeight: '4px', borderRadius: `${config.borderRadius || 4}px ${config.borderRadius || 4}px 0 0` }}>
                            <span className="text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 bg-slate-800 px-1.5 rounded text-white">{d.value}</span>
                        </div>
                        <p className="text-[8px] font-bold uppercase mt-2 text-slate-500 truncate w-full text-center" style={{ fontFamily: config.fontFamily }}>{d.label.substring(0, 8)}</p>
                    </div>
                );
            })}
        </div>
      );
  }
  // Fallback for other charts (Keep generic or expand as needed)
  if (type === 'kpi') return null; // Handled by KPICard
  return <div className="flex items-center justify-center h-full text-slate-300 text-xs uppercase font-bold">Gráfico {type} não renderizado</div>; 
};

const KPICard: React.FC<{ value: number | string; title: string; config: any }> = ({ value, title, config }) => (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5"><Activity className="w-24 h-24" /></div>
        <h3 className="text-[10px] font-black uppercase tracking-widest mb-1 truncate max-w-full z-10" style={{ color: config.textColor || '#94a3b8', fontFamily: config.fontFamily }}>{title}</h3>
        <span className="text-5xl font-black truncate max-w-full z-10 tracking-tighter" style={{ color: config.textColor || '#1e293b', fontFamily: config.fontFamily }}>{value}</span>
    </div>
);

// --- MAIN COMPONENT ---

export const DataView: React.FC<DataViewProps> = ({ mode }) => {
  const { db, updateDB, inscriptions, loggedUser, sendToCloud, updateLocalData, notify } = useDB();
  
  // States
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('TODAS');
  const [selectedPerson, setSelectedPerson] = useState<DataRow | null>(null); // For Cert Preview
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditingDashboard, setIsEditingDashboard] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [showCertConfig, setShowCertConfig] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  
  // Dashboard Widget States
  const [widgetSearchTerms, setWidgetSearchTerms] = useState<Record<string, string>>({});
  const [activeSearchWidgets, setActiveSearchWidgets] = useState<Record<string, boolean>>({});
  const [isControlMenuOpen, setIsControlMenuOpen] = useState(false);

  // Derived Data
  const idCol = (db.headers && db.headers.length > 0) ? db.headers[0] : 'ID';
  const nameCol = (db.headers && db.headers.length > 1) ? db.headers[1] : 'NOME';
  const classCol = db.config.classCol || (db.headers ? db.headers.find(h => ['TURMA', 'CLASSE', 'SALA'].some(k => h.toUpperCase().includes(k))) : '') || '';
  const groupCol = db.config.groupCol;

  const colors = [db.config.accentColor || db.config.color, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  // Reset states on mode change
  useEffect(() => {
      setSearchTerm('');
      setSelectedGroup(null);
      setSelectedClass('TODAS');
      setActiveFilters({});
      setCurrentPage(1);
      setIsEditingDashboard(false);
      setSelectedWidgetId(null);
      setSelectedPerson(null);
  }, [mode]);

  // Data Filtering Logic
  const filteredData = useMemo(() => {
    let base = inscriptions;
    
    // Security Filter
    if (loggedUser?.role === 'comum' && loggedUser.generation && groupCol) {
       base = base.filter(row => String(row[groupCol] || '').trim().toUpperCase() === loggedUser.generation?.trim().toUpperCase());
    }

    // Context Filters
    if (selectedGroup) base = base.filter(r => String(r[groupCol || ''] || 'SEM GRUPO').trim() === selectedGroup);
    if (classCol && selectedClass !== 'TODAS') base = base.filter(r => String(r[classCol] || 'SEM TURMA').trim() === selectedClass);
    
    // Dashboard Filters
    if (Object.keys(activeFilters).length > 0) {
        base = base.filter(row => Object.entries(activeFilters).every(([col, val]) => {
            const selectedVals = val as string[];
            if (selectedVals.length === 0) return true;
            const rowVal = String(row[col] || 'N/A').toUpperCase().trim();
            // Handle Search Filters within widgets
            if (selectedVals[0] && selectedVals[0].startsWith('SEARCH:')) {
                 return rowVal.toLowerCase().includes(selectedVals[0].replace('SEARCH:', '').toLowerCase());
            }
            return selectedVals.includes(rowVal);
        }));
    }

    // Mode Specific Filters
    if (mode === 'certificados') {
        const possibleNames = ['STATUS FINAL', 'STATUS', 'SITUACAO', 'CONCLUSAO', 'CERTIFICADO'];
        const statusCol = (db.headers || []).find(h => possibleNames.includes(h.toUpperCase().trim())) || 'STATUS FINAL';
        base = base.filter(r => {
            const val = String(r[statusCol] || '').toUpperCase().trim();
            return val === 'EMITIR CERTIFICADO' || val === 'APROVADO' || val.includes('EMITIR') || val === 'SIM'; 
        });
    }

    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        base = base.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(lower)));
    }

    return base;
  }, [inscriptions, selectedGroup, selectedClass, searchTerm, activeFilters, mode, loggedUser, groupCol, classCol, db.headers]);

  const paginatedData = useMemo(() => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  // --- ACTIONS ---

  const handleExportCSV = () => {
      if (!filteredData.length) return notify('error', 'Sem dados', 'Nada para exportar.');
      const headers = db.headers || [];
      const csvContent = [headers.join(','), ...filteredData.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `export_nexus_${mode}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify('success', 'Exportação Concluída');
  };

  const handleRemoveWidget = (id: string) => {
      if (!window.confirm('Excluir este widget permanentemente?')) return;
      const nextWidgets = (db.config.dashboardWidgets || []).filter(w => w.id !== id);
      updateDB({ config: { ...db.config, dashboardWidgets: nextWidgets } });
      if (selectedWidgetId === id) setSelectedWidgetId(null);
      notify('success', 'Widget Removido');
  };

  const handleUpdateWidget = (updated: DashboardWidget) => {
      const nextWidgets = (db.config.dashboardWidgets || []).map(w => w.id === updated.id ? updated : w);
      updateDB({ config: { ...db.config, dashboardWidgets: nextWidgets } });
  };

  const handleAddWidget = () => {
      const newW: DashboardWidget = { 
          id: `w-${Date.now()}`, type: 'bar', title: 'Novo Gráfico', field: db.headers[1] || '', width: '2', color: db.config.color,
          styleConfig: { bgColor: '#ffffff', textColor: '#1e293b', borderRadius: 16 }
      };
      updateDB({ config: { ...db.config, dashboardWidgets: [...(db.config.dashboardWidgets || []), newW] } });
      setSelectedWidgetId(newW.id);
  };

  // --- CERTIFICATE LOGIC ---

  const updateCertConfig = (key: string, val: any) => {
      const current = db.config.certConfig || { title: 'CERTIFICADO', bodyText: 'Texto padrão...', signerName: 'Assinatura', signerRole: 'Cargo' } as CertConfig;
      updateDB({ config: { ...db.config, certConfig: { ...current, [key]: val } } });
  };

  const generatePDF = async (person: DataRow) => {
      try {
          const jsPDFConstructor: any = await safeImportPDF();
          const cfg = db.config.certConfig || {};
          const doc = new jsPDFConstructor({ orientation: 'landscape', unit: 'mm', format: 'a4' });
          
          // Background
          if (cfg.backgroundUrl) {
              doc.saveGraphicsState();
              doc.setGState(new (doc as any).GState({ opacity: cfg.opacity || 1.0 }));
              doc.addImage(cfg.backgroundUrl, 'PNG', 0, 0, 297, 210);
              doc.restoreGraphicsState();
          }

          // Border
          if (cfg.borderSize && cfg.borderSize > 0) {
              const lw = Math.max(0.5, cfg.borderSize * 0.2); // Scale px to mm roughly
              const margin = lw / 2;
              doc.setLineWidth(lw);
              doc.setDrawColor(cfg.borderColor || '#000000');
              doc.rect(margin, margin, 297 - (margin * 2), 210 - (margin * 2), 'S');
          }

          // Text Logic
          const font = cfg.fontFamily === 'times' ? 'times' : cfg.fontFamily === 'courier' ? 'courier' : 'helvetica';
          const align = cfg.layout || 'center';
          const xPos = align === 'left' ? 20 : align === 'right' ? 277 : 148.5;
          const alignOpt: any = { align };

          doc.setTextColor(cfg.customColor || '#000000');
          doc.setFontSize(40);
          doc.setFont(font, "bold");
          doc.text((cfg.title || 'CERTIFICADO').toUpperCase(), xPos, 60, alignOpt);

          doc.setTextColor(60, 60, 60);
          doc.setFontSize(16);
          doc.setFont(font, "normal");
          
          const personName = String(person[nameCol] || 'PARTICIPANTE').toUpperCase();
          const personId = String(person[idCol] || '');
          const body = (cfg.bodyText || '').replace('{NOME}', personName).replace('{ID}', personId);
          doc.text(doc.splitTextToSize(body, 180), xPos, 90, alignOpt);

          // Signer
          doc.setLineWidth(0.5);
          doc.setDrawColor(60,60,60);
          const lineStart = align === 'left' ? 20 : align === 'right' ? 177 : 90;
          const lineEnd = align === 'left' ? 120 : align === 'right' ? 277 : 207;
          doc.line(lineStart, 150, lineEnd, 150);
          
          doc.setFontSize(12); doc.setFont(font, "bold");
          doc.text(cfg.signerName || '', xPos, 160, alignOpt);
          doc.setFontSize(10); doc.setFont(font, "normal");
          doc.text(cfg.signerRole || '', xPos, 165, alignOpt);

          doc.save(`CERTIFICADO_${personName}.pdf`);
          notify('success', 'PDF Gerado', `Certificado de ${personName}`);
      } catch (e) {
          console.error(e);
          notify('error', 'Erro ao gerar PDF', 'Verifique o console.');
      }
  };

  // --- RENDERERS ---

  const renderCertificatePreview = () => {
      const cfg = db.config.certConfig || {};
      const person = selectedPerson || filteredData[0] || {};
      const name = String(person[nameCol] || 'NOME DO PARTICIPANTE').toUpperCase();
      const id = String(person[idCol] || '000.000.000-00');
      const body = (cfg.bodyText || 'Certificamos que {NOME} concluiu o curso.').replace('{NOME}', name).replace('{ID}', id);
      
      const fontFamilyMap: Record<string, string> = {
          'helvetica': 'Helvetica, Arial, sans-serif',
          'times': '"Times New Roman", serif',
          'courier': '"Courier New", monospace'
      };

      return (
          <div className="relative w-full aspect-[297/210] bg-white shadow-2xl overflow-hidden text-slate-800 select-none animate-in fade-in" style={{ fontFamily: fontFamilyMap[cfg.fontFamily || 'helvetica'] }}>
              {/* BACKGROUND LAYER */}
              {cfg.backgroundUrl && (
                  <div className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-300" 
                       style={{ backgroundImage: `url(${cfg.backgroundUrl})`, opacity: cfg.opacity ?? 1 }} />
              )}
              
              {/* BORDER LAYER */}
              <div className="absolute inset-0 z-10 pointer-events-none transition-all duration-300"
                   style={{ 
                       borderWidth: `${cfg.borderSize || 0}px`, 
                       borderColor: cfg.borderColor || db.config.color,
                       borderStyle: 'solid'
                   }} />

              {/* CONTENT LAYER */}
              <div className={`absolute inset-0 z-20 flex flex-col justify-center p-16 ${cfg.layout === 'left' ? 'items-start text-left' : cfg.layout === 'right' ? 'items-end text-right' : 'items-center text-center'}`}>
                  <h1 className="text-5xl font-bold mb-8 tracking-wide uppercase drop-shadow-sm transition-colors duration-300" style={{ color: cfg.customColor || db.config.color }}>
                      {cfg.title || 'CERTIFICADO'}
                  </h1>
                  <p className="text-lg leading-relaxed max-w-3xl mb-16 whitespace-pre-wrap">
                      {body}
                  </p>
                  <div className="mt-auto flex flex-col items-center min-w-[300px]">
                      <div className="w-full h-px bg-slate-800 mb-2"></div>
                      <p className="font-bold text-lg">{cfg.signerName || 'Nome do Assinante'}</p>
                      <p className="text-sm text-slate-600 uppercase tracking-widest">{cfg.signerRole || 'Cargo'}</p>
                  </div>
              </div>
          </div>
      );
  };

  const renderDashboard = () => {
      const widgets = db.config.dashboardWidgets || [];
      const editingWidget = widgets.find(w => w.id === selectedWidgetId);

      const getWidgetData = (w: DashboardWidget) => {
          if (w.type.startsWith('control-')) return [];
          if (!w.field && w.type !== 'kpi') return [];
          const counts: Record<string, number> = {};
          const filter = widgetSearchTerms[w.id]?.toUpperCase();
          
          filteredData.forEach(row => {
              const val = String(row[w.field] || 'N/A').toUpperCase().trim();
              if (filter && !val.includes(filter)) return;
              counts[val] = (counts[val] || 0) + 1;
          });
          return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10).map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
      };

      return (
          <div className="flex h-full gap-6 animate-in fade-in">
              <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                  <div className="flex items-center justify-between shrink-0">
                      <div>
                          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Dashboard Analítico</h2>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                              {filteredData.length} Registros Filtrados
                          </p>
                      </div>
                      <div className="flex gap-2">
                          {loggedUser?.role === 'master' && (
                              <button onClick={() => { setIsEditingDashboard(!isEditingDashboard); setSelectedWidgetId(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold uppercase text-[10px] transition-all border ${isEditingDashboard ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}>
                                  <Edit3 className="w-4 h-4"/> {isEditingDashboard ? 'Finalizar Edição' : 'Editar Layout'}
                              </button>
                          )}
                          <button onClick={handleExportCSV} className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-4 py-2 rounded-xl font-bold uppercase text-[10px] border border-emerald-600/30 transition-all flex items-center gap-2">
                              <Download className="w-4 h-4"/> Exportar Dados
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 pr-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {widgets.map(w => {
                              const data = getWidgetData(w);
                              const isSelected = selectedWidgetId === w.id;
                              const style = w.styleConfig || {};
                              
                              if (w.type.startsWith('control-')) return null; // Simplified for brevity, assume rendered elsewhere or implement ControlWidget similarly

                              return (
                                  <div key={w.id} 
                                       onClick={() => isEditingDashboard && setSelectedWidgetId(w.id)}
                                       className={`relative rounded-3xl p-6 flex flex-col transition-all duration-300 group overflow-hidden ${w.width === '4' ? 'col-span-full' : w.width === '3' ? 'md:col-span-3' : w.width === '2' ? 'md:col-span-2' : ''} ${isSelected ? 'ring-2 ring-blue-500 z-10' : 'hover:shadow-xl'}`}
                                       style={{ backgroundColor: style.bgColor || '#ffffff', minHeight: '260px' }}
                                  >
                                      {isEditingDashboard && (
                                          <button onClick={(e) => { e.stopPropagation(); handleRemoveWidget(w.id); }} className="absolute top-3 right-3 p-2 bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-red-200">
                                              <Trash2 className="w-4 h-4" />
                                          </button>
                                      )}
                                      
                                      {w.type === 'kpi' ? (
                                          <KPICard value={w.field ? (w.targetValue ? filteredData.filter(r => String(r[w.field] || '') === w.targetValue).length : filteredData.length) : filteredData.length} title={w.title} config={style} />
                                      ) : (
                                          <>
                                              <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: style.textColor }}>
                                                  <BarChart2 className="w-3 h-3"/> {w.title}
                                              </h3>
                                              <div className="flex-1">
                                                  <AdvancedChart type={w.type} data={data} config={style} onSelect={() => {}} selectedLabels={[]} />
                                              </div>
                                          </>
                                      )}
                                  </div>
                              );
                          })}
                          {isEditingDashboard && (
                              <button onClick={handleAddWidget} className="h-64 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:border-blue-500/50 hover:bg-blue-500/5 transition-all gap-4 group">
                                  <div className="p-4 rounded-full bg-white/5 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Plus className="w-6 h-6"/></div>
                                  <span className="text-xs font-bold uppercase tracking-widest">Adicionar Widget</span>
                              </button>
                          )}
                      </div>
                  </div>
              </div>

              {/* SIDEBAR DE EDIÇÃO DASHBOARD */}
              {isEditingDashboard && editingWidget && (
                  <div className="w-80 bg-[#1e293b] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right z-20">
                      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                          <h3 className="font-bold text-white text-sm uppercase tracking-wide">Editar Widget</h3>
                          <button onClick={() => setSelectedWidgetId(null)}><XCircle className="w-5 h-5 text-slate-500 hover:text-white"/></button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 space-y-6">
                          <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Título</label>
                              <input value={editingWidget.title} onChange={e => handleUpdateWidget({...editingWidget, title: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none"/>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
                              <div className="grid grid-cols-3 gap-2">
                                  {['bar', 'pie', 'kpi', 'line'].map(t => (
                                      <button key={t} onClick={() => handleUpdateWidget({...editingWidget, type: t as any})} className={`p-2 rounded border text-xs font-bold uppercase ${editingWidget.type === t ? 'bg-blue-600 border-blue-500 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{t}</button>
                                  ))}
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Coluna de Dados</label>
                              <select value={editingWidget.field} onChange={e => handleUpdateWidget({...editingWidget, field: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white outline-none">
                                  {db.headers.map(h => <option key={h} value={h} className="text-black">{h}</option>)}
                              </select>
                          </div>
                          <div className="border-t border-white/10 pt-4 space-y-4">
                              <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Estilo</h4>
                              <div><label className="text-[10px] text-slate-500 block mb-1">Cor de Fundo</label><input type="color" value={(editingWidget as any).styleConfig?.bgColor} onChange={e => handleUpdateWidget({...editingWidget, styleConfig: {...(editingWidget as any).styleConfig, bgColor: e.target.value}} as any)} className="w-full h-8 rounded cursor-pointer"/></div>
                              <div><label className="text-[10px] text-slate-500 block mb-1">Cor do Texto</label><input type="color" value={(editingWidget as any).styleConfig?.textColor} onChange={e => handleUpdateWidget({...editingWidget, styleConfig: {...(editingWidget as any).styleConfig, textColor: e.target.value}} as any)} className="w-full h-8 rounded cursor-pointer"/></div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  };

  const renderCertificates = () => (
      <div className="flex h-full gap-6 animate-in fade-in">
          <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-end mb-6">
                  <div>
                      <h2 className="text-2xl font-black uppercase text-white tracking-tight">Editor de Certificados</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">WYSIWYG Real-Time Preview</p>
                  </div>
                  {loggedUser?.role === 'master' && (
                      <button onClick={() => setShowCertConfig(!showCertConfig)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase text-[10px] transition-all border ${showCertConfig ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}>
                          <Settings className="w-4 h-4"/> Configurar Modelo
                      </button>
                  )}
              </div>

              {/* AREA DE PREVIEW */}
              <div className="flex-1 flex items-center justify-center bg-[#020617] rounded-3xl border border-white/5 shadow-inner p-8 overflow-hidden relative group">
                  <div className="scale-[0.6] lg:scale-[0.8] xl:scale-100 transition-transform origin-center shadow-2xl rounded-sm">
                      {renderCertificatePreview()}
                  </div>
                  <div className="absolute bottom-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => selectedPerson && generatePDF(selectedPerson)} className="bg-white text-slate-900 px-6 py-3 rounded-full font-bold uppercase text-xs shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                          <Printer className="w-4 h-4"/> Imprimir Atual
                      </button>
                  </div>
              </div>

              {/* LISTA DE PESSOAS PARA TESTE */}
              <div className="mt-6 h-48 bg-[#1e293b] rounded-2xl border border-white/10 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-white/10 bg-black/20"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecionar Participante para Visualização</span></div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                      {paginatedData.map((row, i) => (
                          <div key={i} onClick={() => setSelectedPerson(row)} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-colors ${selectedPerson === row ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-slate-300'}`}>
                              <span className="text-xs font-bold truncate">{row[nameCol]}</span>
                              <span className="text-[10px] opacity-70">{row[idCol]}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* SIDEBAR CONFIGURAÇÃO CERTIFICADO */}
          {showCertConfig && loggedUser?.role === 'master' && (
              <div className="w-80 bg-[#1e293b] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right z-20">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                      <h3 className="font-bold text-white text-sm uppercase tracking-wide">Propriedades</h3>
                      <button onClick={() => setShowCertConfig(false)}><XCircle className="w-5 h-5 text-slate-500 hover:text-white"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                      {/* IMAGEM */}
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon className="w-3 h-3"/> Fundo (Marca d'água)</h4>
                          <div className="relative group cursor-pointer border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-white/5 hover:border-blue-500/50 transition-colors">
                              <Upload className="w-6 h-6 text-slate-500 mb-2"/>
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Carregar Imagem</span>
                              <input type="file" accept="image/*" onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if(f) { const r = new FileReader(); r.onload = () => updateCertConfig('backgroundUrl', r.result); r.readAsDataURL(f); }
                              }} className="absolute inset-0 opacity-0 cursor-pointer"/>
                          </div>
                          <div className="space-y-2">
                              <div className="flex justify-between"><label className="text-[10px] text-slate-500">Opacidade</label><span className="text-[10px] text-white">{Math.round((db.config.certConfig?.opacity || 1)*100)}%</span></div>
                              <input type="range" min="0" max="1" step="0.1" value={db.config.certConfig?.opacity || 1} onChange={e => updateCertConfig('opacity', parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                          </div>
                      </div>

                      <div className="border-t border-white/10"></div>

                      {/* BORDA */}
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2"><Square className="w-3 h-3"/> Moldura</h4>
                          <div className="space-y-2">
                              <div className="flex justify-between"><label className="text-[10px] text-slate-500">Espessura</label><span className="text-[10px] text-white">{db.config.certConfig?.borderSize || 0}px</span></div>
                              <input type="range" min="0" max="50" value={db.config.certConfig?.borderSize || 0} onChange={e => updateCertConfig('borderSize', parseInt(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                              <label className="text-[10px] text-slate-400 font-bold uppercase">Cor da Borda</label>
                              <input type="color" value={db.config.certConfig?.borderColor || '#000000'} onChange={e => updateCertConfig('borderColor', e.target.value)} className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"/>
                          </div>
                      </div>

                      <div className="border-t border-white/10"></div>

                      {/* TEXTO */}
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2"><Type className="w-3 h-3"/> Tipografia</h4>
                          <div>
                              <label className="text-[10px] text-slate-500 block mb-2">Fonte</label>
                              <select value={db.config.certConfig?.fontFamily || 'helvetica'} onChange={e => updateCertConfig('fontFamily', e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-xs text-white outline-none">
                                  <option value="helvetica">Helvetica (Padrão)</option>
                                  <option value="times">Times New Roman (Clássico)</option>
                                  <option value="courier">Courier (Máquina)</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-[10px] text-slate-500 block mb-2">Cor do Título</label>
                              <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-white/5">
                                  <input type="color" value={db.config.certConfig?.customColor || '#000000'} onChange={e => updateCertConfig('customColor', e.target.value)} className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"/>
                                  <span className="text-xs text-slate-400 font-mono">{db.config.certConfig?.customColor || '#000000'}</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );

  // --- RENDER MAIN ---
  if (mode === 'relatorio') return renderDashboard();
  if (mode === 'certificados') return renderCertificates();

  // DEFAULT: INSCRICOES (TABLE VIEW)
  return (
      <div className="flex flex-col h-full gap-4 animate-in fade-in">
          {/* TOOLBAR */}
          <div className="flex justify-between items-center bg-[#1e293b] p-4 rounded-2xl border border-white/5 shadow-lg">
              <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-md group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors"/>
                      <input type="text" placeholder="Pesquisar registros..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all"/>
                  </div>
                  {groupCol && (
                      <select value={selectedGroup || ''} onChange={e => setSelectedGroup(e.target.value || null)} className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 cursor-pointer">
                          <option value="">Todos os Grupos</option>
                          {[...new Set(inscriptions.map(r => r[groupCol]))].sort().map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
                      </select>
                  )}
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Total: <span className="text-white">{filteredData.length}</span>
              </div>
          </div>

          {/* TABLE AREA */}
          <div className="flex-1 bg-[#1e293b] rounded-2xl border border-white/5 shadow-xl overflow-hidden flex flex-col relative">
              <div className="overflow-auto custom-scrollbar flex-1">
                  <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#0f172a] z-10 shadow-md">
                          <tr>
                              {db.config.displayCols.length > 0 ? db.config.displayCols.map(h => (
                                  <th key={h} className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 whitespace-nowrap">{h}</th>
                              )) : (
                                  db.headers.slice(0,6).map(h => (
                                      <th key={h} className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 whitespace-nowrap">{h}</th>
                                  ))
                              )}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {paginatedData.map((row, i) => (
                              <tr key={i} className="hover:bg-white/5 transition-colors group">
                                  {(db.config.displayCols.length > 0 ? db.config.displayCols : db.headers.slice(0,6)).map((col, idx) => (
                                      <td key={col} className="p-4 text-sm text-slate-300 whitespace-nowrap group-hover:text-white">
                                          {idx === 0 ? <span className="font-bold text-white">{row[col]}</span> : row[col]}
                                      </td>
                                  ))}
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {!paginatedData.length && <div className="p-12 text-center text-slate-500 text-sm uppercase font-bold">Nenhum registro encontrado</div>}
              </div>
              
              {/* PAGINATION */}
              <div className="p-4 bg-[#0f172a] border-t border-white/5 flex justify-between items-center">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white"><ChevronLeft className="w-5 h-5"/></button>
                  <span className="text-xs font-bold text-slate-400">Página <span className="text-white">{currentPage}</span> de {totalPages}</span>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white"><ChevronRight className="w-5 h-5"/></button>
              </div>
          </div>
      </div>
  );
};
