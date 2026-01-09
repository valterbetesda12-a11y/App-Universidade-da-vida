import React from 'react';
import {
    BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, Cell,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Legend
} from 'recharts';

interface AdvancedChartProps {
    type: string;
    data: any[];
    config: any;
    onSelect: (label: string) => void;
    selectedLabels: string[];
    fields?: string[]; // Colunas extras para tabelas
}

const first_word = (s: string) => (s || '').split(' ')[0].toLowerCase();

export const AdvancedChart: React.FC<AdvancedChartProps> = ({ type, data, config, onSelect, selectedLabels, fields }) => {
    const fontStyle = { fontFamily: config.fontFamily || 'Inter, sans-serif', fontSize: '10px', fontWeight: 700 };
    const [searchTerm, setSearchTerm] = React.useState(''); // Hook movido para nível superior

    const getColors = (entry: any, idx: number) => {
        // Se houver mapeamento manual de cores por label (ex: P -> Verde, F -> Vermelho)
        if (config.labelColorMap && config.labelColorMap[entry.label || entry]) {
            return config.labelColorMap[entry.label || entry];
        }

        // Fallback para ícone do widget ou ciclo padrão
        if (config.color && type !== 'pie' && type !== 'donut') return config.color;

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
        return colors[idx % colors.length];
    };

    if (type === 'overview') {
        return (
            <div className="h-full flex flex-wrap items-center justify-center gap-4 p-4 overflow-y-auto custom-scrollbar">
                {(data || []).map((d, i) => (
                    <div key={i} className="flex-1 min-w-[120px] bg-black/5 rounded-2xl p-4 border border-black/5 flex flex-col items-center justify-center gap-1 group hover:bg-black/10 transition-all">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">{d.label}</span>
                        <span className="text-3xl font-black text-slate-800 tracking-tighter" style={{ color: config.textColor }}>{d.value}</span>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'table') {
        const displayFields = (fields && fields.length > 0) ? fields : ['Item'];

        const filteredTableData = (data || []).filter(d => {
            if (!searchTerm) return true;
            const searchLower = searchTerm.toLowerCase();
            return displayFields.some(f => String(d.rowData?.[f] || d.label).toLowerCase().includes(searchLower));
        });

        const isAllSelected = filteredTableData.length > 0 && filteredTableData.every(d => selectedLabels.includes(d.label));

        return (
            <div className="h-full flex flex-col overflow-hidden">
                {/* Search Bar */}
                <div className="px-2 mb-2 shrink-0">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Buscar nesta tabela..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/10 border border-white/5 rounded-lg py-2 pl-8 pr-3 text-[10px] text-white placeholder:text-slate-500 focus:border-blue-500/50 outline-none transition-all"
                        />
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 group-focus-within:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar p-2 pt-0">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold text-[9px] uppercase tracking-wider z-10 shadow-sm">
                            <tr>
                                <th className="p-2 border-b border-slate-200 w-8">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={() => {
                                            if (isAllSelected) {
                                                filteredTableData.forEach(d => { if (selectedLabels.includes(d.label)) onSelect(d.label); });
                                            } else {
                                                filteredTableData.forEach(d => { if (!selectedLabels.includes(d.label)) onSelect(d.label); });
                                            }
                                        }}
                                        className="w-3 h-3 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </th>
                                {displayFields.map(f => <th key={first_word(f)} className="p-2 border-b border-slate-200">{f}</th>)}
                                <th className="p-2 text-right border-b border-slate-200">Qtd</th>
                            </tr>
                        </thead>
                        <tbody className="text-[11px] font-medium divide-y divide-slate-100" style={{ color: config.textColor || '#475569' }}>
                            {filteredTableData.map((d, i) => {
                                const isSelected = selectedLabels.includes(d.label);
                                return (
                                    <tr key={i} className={`group hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 text-blue-600' : ''}`} onClick={() => onSelect(d.label)}>
                                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onSelect(d.label)}
                                                className="w-3 h-3 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </td>
                                        {displayFields.map(f => (
                                            <td key={first_word(f)} className={`p-2 truncate max-w-[150px] ${isSelected ? 'font-black' : ''}`} title={String(d.rowData?.[f] || d.label)}>
                                                {String(d.rowData?.[f] || (f === 'Item' ? d.label : '-'))}
                                            </td>
                                        ))}
                                        <td className={`p-2 text-right font-bold ${isSelected ? 'text-blue-600' : 'opacity-70'}`}>{d.value}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    const CommonTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return <div className="bg-[#1e293b] text-white text-xs p-2 rounded shadow-lg border border-white/10 font-bold z-50">{label}: {payload[0].value}</div>;
        }
        return null;
    };

    const handleChartClick = (state: any) => {
        if (state && state.activeLabel) {
            onSelect(state.activeLabel);
        } else if (state && state.activePayload && state.activePayload[0]) {
            onSelect(state.activePayload[0].payload.label);
        }
    };

    // Se não há dados, mostrar mensagem
    if (!data || data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase opacity-50">
                Sem dados
            </div>
        );
    }

    // ... rest of the file remains same but I will replace the whole block for safety in this contiguous edit
    return (
        <div style={{ width: '100%', height: '100%', minHeight: 150 }}>
            <ResponsiveContainer width="100%" height="100%" debounce={300}>
                {type === 'line' ? (
                    <LineChart data={data} onClick={handleChartClick}>
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={30} />
                        <ReTooltip content={<CommonTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                        <Line type="monotone" dataKey="value" stroke={config.color || '#3b82f6'} strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: config.color || '#3b82f6' }} activeDot={{ r: 6 }} />
                    </LineChart>
                ) : type === 'area' ? (
                    <AreaChart data={data} onClick={handleChartClick}>
                        <defs><linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={config.color || '#3b82f6'} stopOpacity={0.3} /><stop offset="95%" stopColor={config.color || '#3b82f6'} stopOpacity={0} /></linearGradient></defs>
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={30} />
                        <ReTooltip content={<CommonTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                        <Area type="monotone" dataKey="value" stroke={config.color || '#3b82f6'} fillOpacity={1} fill="url(#colorVal)" />
                    </AreaChart>
                ) : type === 'pie' || type === 'donut' ? (
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={type === 'donut' ? '60%' : '0%'}
                            outerRadius="80%"
                            paddingAngle={5}
                            dataKey="value"
                            onClick={(data) => onSelect(data.label)}
                        >
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={getColors(entry, index)} strokeWidth={0} />)}
                        </Pie>
                        <ReTooltip content={<CommonTooltip />} />
                    </PieChart>
                ) : (
                    <ReBarChart data={data} layout={config.horizontal ? 'vertical' : 'horizontal'} onClick={handleChartClick}>
                        {config.horizontal ? <XAxis type="number" hide /> : <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval={0} />}
                        {config.horizontal ? <YAxis dataKey="label" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={80} /> : <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={30} />}
                        <ReTooltip content={<CommonTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                        <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={getColors(entry, index)} />)}
                        </Bar>
                    </ReBarChart>
                )}
            </ResponsiveContainer>
        </div>
    );
};
