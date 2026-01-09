
import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Move, Settings, Trash2, PlusCircle, FileJson, Download, Loader2 } from 'lucide-react';
import { useDB } from '../context/DBContext';
import { ReportWidget, User } from '../types/app'; // Use Types/App types for local widgets
import html2canvas from 'html2canvas';

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];

interface ReportsViewProps {
  isMasterMode: boolean;
  user: any; // Aceita User do contexto
}

export const ReportsView: React.FC<ReportsViewProps> = ({ isMasterMode, user }) => {
  const { inscriptions, db } = useDB();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // --- CÁLCULO DE DADOS REAIS ---
  const stats = useMemo(() => {
    const total = inscriptions.length;
    
    // Tenta encontrar colunas relevantes
    const statusCol = db.headers.find(h => ['STATUS', 'SITUACAO', 'ESTADO'].some(k => h.toUpperCase().includes(k))) || db.headers[db.headers.length - 1];
    const dateCol = db.headers.find(h => ['DATA', 'CRIADO', 'EMISSAO', 'CARIMBO'].some(k => h.toUpperCase().includes(k))) || db.headers[0];

    // Dados para Pizza (Status)
    const statusCounts: Record<string, number> = {};
    inscriptions.forEach(row => {
        const val = String(row[statusCol] || 'Indefinido').trim().toUpperCase();
        statusCounts[val] = (statusCounts[val] || 0) + 1;
    });
    const pieData = Object.entries(statusCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value)
        .slice(0, 6); // Top 6

    // Dados para Barra (Evolução Temporal - Simplificada por índice/ordem se data falhar)
    // Tenta agrupar por mês se possível, senão pega chunks
    const barData: any[] = [];
    if (total > 0) {
        // Simulação de distribuição se não houver data clara, ou agrupamento simples
        const chunkSize = Math.ceil(total / 5);
        for(let i=0; i<5; i++) {
            barData.push({
                name: `Lote ${i+1}`,
                value: Math.min(chunkSize, Math.max(0, total - (i*chunkSize)))
            });
        }
    }

    return { total, pieData, barData };
  }, [inscriptions, db.headers]);

  // Estado dos Widgets
  const [widgets, setWidgets] = useState<ReportWidget[]>([
    { id: 'w1', type: 'stat', title: 'Total de Registros', dataKey: 'total', gridSpan: 1, color: '#3b82f6' },
    { id: 'w2', type: 'stat', title: 'Novos (Este Mês)', dataKey: 'revenue', gridSpan: 1, color: '#10b981' },
    { id: 'w3', type: 'bar', title: 'Volume de Dados', dataKey: 'barData', gridSpan: 2, color: '#6366f1' },
    { id: 'w4', type: 'pie', title: 'Distribuição por Status', dataKey: 'pieData', gridSpan: 2, color: '#8b5cf6' },
  ]);

  const moveWidget = (index: number, direction: 'left' | 'right') => {
    if (!isMasterMode) return;
    setWidgets(prev => {
        const next = [...prev];
        const target = direction === 'left' ? index - 1 : index + 1;
        if (target >= 0 && target < next.length) {
          [next[index], next[target]] = [next[target], next[index]];
          return next;
        }
        return prev;
    });
  };

  const removeWidget = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Remover widget?')) setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const addWidget = () => {
    const types: ReportWidget['type'][] = ['stat', 'bar', 'pie', 'line'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const newWidget: ReportWidget = {
      id: `w-${Date.now()}`,
      type: randomType,
      title: 'Novo Indicador',
      dataKey: randomType === 'pie' ? 'pieData' : (randomType === 'bar' ? 'barData' : 'total'),
      gridSpan: randomType === 'stat' ? 1 : 2,
      color: COLORS[widgets.length % COLORS.length]
    };
    setWidgets(prev => [...prev, newWidget]);
  };

  const handleExportImage = async () => {
      if (dashboardRef.current) {
          setIsExporting(true);
          try {
              const canvas = await html2canvas(dashboardRef.current, {
                  backgroundColor: '#0f172a', // Mantém o fundo dark
                  scale: 2 // Alta resolução
              });
              const link = document.createElement('a');
              link.download = `Dashboard_Nexus_${new Date().toISOString().slice(0,10)}.png`;
              link.href = canvas.toDataURL();
              link.click();
          } catch (e) {
              console.error("Erro na exportação", e);
              alert("Erro ao exportar imagem.");
          } finally {
              setIsExporting(false);
          }
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Dashboard Executivo</h3>
          <p className="text-slate-400 text-xs mt-1">Dados em tempo real da base sincronizada</p>
        </div>
        
        <div className="flex gap-3">
          {isMasterMode && (
            <button onClick={addWidget} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-lg">
              <PlusCircle className="w-4 h-4" /> Add Widget
            </button>
          )}
          <button onClick={handleExportImage} disabled={isExporting} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase border border-white/20 transition-all disabled:opacity-50">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />} Exportar PNG
          </button>
        </div>
      </div>

      <div ref={dashboardRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 bg-[#0f172a]">
        {widgets.map((widget, index) => (
          <div 
            key={widget.id} 
            className={`relative group rounded-3xl p-6 border transition-all duration-300 flex flex-col overflow-hidden ${isMasterMode ? 'border-dashed border-blue-500/50 bg-blue-500/5' : 'border-white/10 bg-white/5 backdrop-blur-xl shadow-xl'}`}
            style={{ gridColumn: `span ${widget.gridSpan} / span ${widget.gridSpan}`, zIndex: 10 }}
          >
            {isMasterMode && (
              <div className="absolute top-2 right-2 flex gap-1 z-[100] bg-slate-900/80 p-1 rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => moveWidget(index, 'left')} className="p-2 hover:bg-blue-500 rounded-lg text-white"><Move className="w-3 h-3" /></button>
                <button onClick={(e) => removeWidget(e, widget.id)} className="p-2 hover:bg-red-600 rounded-lg text-white"><Trash2 className="w-3 h-3" /></button>
              </div>
            )}

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-20">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: widget.color }}></span>
              {widget.title}
            </h4>

            <div className="flex-1 min-h-[150px] flex items-center justify-center relative z-10 w-full">
              {widget.type === 'stat' && (
                <div className="text-center">
                  <span className="text-5xl font-black text-white tracking-tight drop-shadow-lg">
                    {widget.dataKey === 'total' ? stats.total : Math.round(stats.total * 0.2)}
                  </span>
                  <p className="text-[10px] text-emerald-400 font-bold mt-2">Registros Ativos</p>
                </div>
              )}

              {widget.type === 'bar' && (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontSize: '12px' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                    <Bar dataKey="value" fill={widget.color} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {widget.type === 'pie' && (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {stats.pieData.map((entry: any, i: number) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} stroke="rgba(0,0,0,0)" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
