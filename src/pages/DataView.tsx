
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useDB } from '../context/useDB';
import {
    Search, Printer, Edit3, ArrowLeft, XCircle, Folder, Activity, PieChart as PieIcon, BarChart, FileText, Award, Trash2, Plus, Settings, Palette, Maximize, BarChart2, Table, MousePointer2, Grid, Sigma, FileSpreadsheet, LayoutGrid, ListFilter, List, TextCursorInput, MousePointerClick, ChevronDown, ArrowUp, ArrowDown, Move, CheckCircle, Download, Upload, Eye, ChevronLeft, ChevronRight, SlidersHorizontal, CalendarDays, CheckSquare, Type, Filter, Users, Briefcase, User, AlertCircle, Square, Circle, TrendingUp, LayoutTemplate, Database, Image as ImageIcon, Loader2, RefreshCw, Save, ArrowUpDown, Zap, Target, Shield, Heart, Star
} from 'lucide-react';
import {
    BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, Cell,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Legend
} from 'recharts';
import { DataRow, DashboardWidget, CertConfig } from '../types';
import { AdvancedChart } from '../components/dashboard/AdvancedChart';
import { filterData } from '../utils/filterUtils';
import { ColumnFilter } from '../components/ColumnFilter';
import { EditableCell } from '../components/EditableCell';

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

const getIcon = (name: string, props: any) => {
    const icons: Record<string, any> = {
        'Activity': Activity, 'Users': Users, 'BarChart2': BarChart2, 'Table': Table,
        'Search': Search, 'ListFilter': ListFilter, 'LayoutGrid': LayoutGrid,
        'TrendingUp': TrendingUp, 'Database': Database, 'Award': Award,
        'Zap': Zap, 'Target': Target, 'Shield': Shield, 'Heart': Heart, 'Star': Star,
        'PieChart': PieIcon, 'FileText': FileText, 'CheckCircle': CheckCircle, 'CheckSquare': CheckSquare
    };
    const IconComponent = icons[name] || Activity;
    return <IconComponent {...props} />;
};

// --- SUB-COMPONENTES VISUAIS ---

const KPICard: React.FC<{ value: number | string; title: string; config: any }> = ({ value, title, config }) => (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5" style={{ color: config.iconColor || config.textColor }}>
            {getIcon(config.iconName || 'Activity', { className: "w-24 h-24" })}
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-widest mb-1 truncate max-w-full z-10 flex items-center gap-2" style={{ color: config.textColor || '#94a3b8', fontFamily: config.fontFamily }}>
            <span style={{ color: config.iconColor || config.textColor }}>{getIcon(config.iconName || 'Activity', { className: "w-3 h-3" })}</span>
            {title}
        </h3>
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

    // Audit Report States
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [auditStartDate, setAuditStartDate] = useState('');
    const [auditEndDate, setAuditEndDate] = useState('');

    // Dashboard Widget States
    const [widgetSearchTerms, setWidgetSearchTerms] = useState<Record<string, string>>({});
    const [activeSearchWidgets, setActiveSearchWidgets] = useState<Record<string, boolean>>({});
    const [isControlMenuOpen, setIsControlMenuOpen] = useState(false);

    // Certificate States - Seleção Múltipla e Filtros
    const [selectedCertificates, setSelectedCertificates] = useState<Set<string>>(new Set());
    const [certSearchTerm, setCertSearchTerm] = useState('');
    const [certFilterTurma, setCertFilterTurma] = useState<string>('');
    const [certFilterGeracao, setCertFilterGeracao] = useState<string>('');
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    // Derived Data - Detecção inteligente de colunas
    const findColumn = (keywords: string[]) => {
        const headers = db.headers || [];
        const exactMatch = headers.find(h => keywords.some(k => h.toUpperCase().trim() === k.toUpperCase()));
        if (exactMatch) return exactMatch;
        return headers.find(h => keywords.some(k => h.toUpperCase().includes(k.toUpperCase())));
    };

    const nameCol = findColumn(['NOME COMPLETO', 'NOME', 'NAME', 'ALUNO', 'PARTICIPANTE', 'ESTUDANTE']) || (db.headers && db.headers.length > 1 ? db.headers[1] : 'NOME');
    const idCol = findColumn(['CPF', 'DOCUMENTO', 'MATRICULA', 'RG', 'IDENTIDADE']) || (db.headers && db.headers.length > 0 ? db.headers[0] : 'ID');
    const statusFinalCol = findColumn(['STATUS FINAL', 'STATUS', 'SITUACAO', 'CONCLUSAO', 'CERTIFICADO']) || 'STATUS FINAL';
    const classCol = db.config.classCol || findColumn(['TURMA', 'CLASSE', 'SALA']) || '';
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
        return filterData(
            inscriptions,
            loggedUser,
            groupCol,
            classCol,
            selectedGroup,
            selectedClass,
            activeFilters,
            mode,
            searchTerm,
            db.headers || []
        );
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
        link.setAttribute("download", `export_nexus_${mode}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        notify('success', 'Exportação Concluída');
    };

    const handleClearFilters = () => {
        setActiveFilters({});
        setSearchTerm('');
        setSelectedGroup(null);
        setSelectedClass('TODAS');
        notify('info', 'Filtros Limpos');
    };

    const handleExportPDF = async () => {
        if (!filteredData.length) return notify('error', 'Sem dados', 'Nada para exportar.');
        try {
            const jsPDFConstructor: any = await safeImportPDF();
            const doc = new jsPDFConstructor({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const headers = db.config.displayCols.length > 0 ? db.config.displayCols : db.headers;
            const dataRows = filteredData.map(row => headers.map(h => String(row[h] || '')));
            doc.setFontSize(18);
            doc.text("Relatório de Inscrições", 14, 20);
            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 28);
            const { default: autoTable } = await import('jspdf-autotable');
            const columnStyles: any = {};
            headers.forEach((h, idx) => {
                const lower = h.toLowerCase();
                if (lower === 'id' || lower.includes('idade')) columnStyles[idx] = { cellWidth: 10, halign: 'center' };
                else if (lower.includes('nome')) columnStyles[idx] = { cellWidth: 35 };
                else if (lower.includes('sema') || lower.includes('encon') || lower.includes('dia') || h.length <= 4) columnStyles[idx] = { cellWidth: 8, halign: 'center' };
                else if (lower.includes('status') || lower.includes('pagamen')) columnStyles[idx] = { cellWidth: 20, halign: 'center' };
            });
            (autoTable as any)(doc, {
                head: [headers], body: dataRows, startY: 40, theme: 'grid', margin: { left: 7, right: 7 },
                styles: { fontSize: 6, cellPadding: 1, valign: 'middle', overflow: 'linebreak' },
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 6.5, halign: 'center' },
                columnStyles, alternateRowStyles: { fillColor: [248, 250, 252] }
            });
            doc.save(`export_nexus_dashboard_${new Date().toISOString().slice(0, 10)}.pdf`);
            notify('success', 'PDF Gerado com Sucesso');
        } catch (e) { console.error(e); notify('error', 'Erro ao gerar PDF'); }
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

    const saveCertConfigToCloud = async () => {
        setIsSavingConfig(true);
        try {
            await sendToCloud({ action: 'UPDATE_CONFIG', config: db.config, user: loggedUser?.user });
            notify('success', 'Configurações Salvas');
        } catch (e) { notify('error', 'Erro ao Salvar'); } finally { setIsSavingConfig(false); }
    };

    const moveWidget = (idx: number, direction: 'up' | 'down') => {
        const widgets = [...(db.config.dashboardWidgets || [])];
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= widgets.length) return;
        [widgets[idx], widgets[newIdx]] = [widgets[newIdx], widgets[idx]];
        updateDB({ config: { ...db.config, dashboardWidgets: widgets } });
    };

    const filterByCharts = (colName: string, value: string) => {
        setActiveFilters(prev => {
            const current = prev[colName] || [];
            if (current.includes(value)) {
                const next = current.filter(v => v !== value);
                if (next.length === 0) { const { [colName]: _, ...rest } = prev; return rest; }
                return { ...prev, [colName]: next };
            } else { return { ...prev, [colName]: [...current, value] }; }
        });
    };

    const turmaCol = findColumn(['TURMA', 'CLASSE', 'SALA']) || '';
    const geracaoCol = findColumn(['GERAÇÃO', 'GERACAO', 'GENERATION']) || groupCol || '';

    const certFilteredData = useMemo(() => {
        let data = filteredData;
        if (certSearchTerm) {
            const lower = certSearchTerm.toLowerCase();
            data = data.filter(r => String(r[nameCol] || '').toLowerCase().includes(lower));
        }
        if (certFilterTurma && turmaCol) data = data.filter(r => String(r[turmaCol] || '') === certFilterTurma);
        if (certFilterGeracao && geracaoCol) data = data.filter(r => String(r[geracaoCol] || '') === certFilterGeracao);
        return data;
    }, [filteredData, certSearchTerm, certFilterTurma, certFilterGeracao, nameCol, turmaCol, geracaoCol]);

    const turmaOptions = useMemo(() => turmaCol ? [...new Set(filteredData.map(r => String(r[turmaCol] || '')).filter(Boolean))].sort() : [], [filteredData, turmaCol]);
    const geracaoOptions = useMemo(() => geracaoCol ? [...new Set(filteredData.map(r => String(r[geracaoCol] || '')).filter(Boolean))].sort() : [], [filteredData, geracaoCol]);

    const getRowUniqueId = (row: any, index: number) => String(row[idCol] || '') + '_' + index;

    const toggleCertificateSelection = (uniqueId: string) => {
        setSelectedCertificates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(uniqueId)) newSet.delete(uniqueId); else newSet.add(uniqueId);
            return newSet;
        });
    };

    const selectAllCertificates = () => setSelectedCertificates(new Set(certFilteredData.map((r, i) => getRowUniqueId(r, i))));
    const deselectAllCertificates = () => setSelectedCertificates(new Set());

    const generateBatchPDF = async () => {
        if (selectedCertificates.size === 0) return notify('warning', 'Nenhum Selecionado');
        notify('info', 'Gerando Certificados', `Gerando ${selectedCertificates.size}...`);
        let generated = 0;
        for (let i = 0; i < certFilteredData.length; i++) {
            const row = certFilteredData[i];
            if (selectedCertificates.has(getRowUniqueId(row, i))) { await generatePDF(row); generated++; }
        }
        notify('success', 'Concluído', `${generated} gerados.`);
        setSelectedCertificates(new Set());
    };

    const generatePDF = async (person: DataRow) => {
        try {
            const jsPDFConstructor: any = await safeImportPDF();
            const cfg = db.config.certConfig || {};
            const doc = new jsPDFConstructor({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const bgUrl = cfg.backgroundUrl || '/cert-template.png';
            try {
                doc.saveGraphicsState(); doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
                doc.addImage(bgUrl, 'PNG', 0, 0, 297, 210); doc.restoreGraphicsState();
            } catch (e) { console.warn(e); }
            const font = cfg.fontFamily === 'times' ? 'times' : cfg.fontFamily === 'courier' ? 'courier' : 'helvetica';
            const personName = String(person[nameCol] || 'PARTICIPANTE').toUpperCase();
            let nameSize = 28; let charSpace = 0;
            if (personName.length > 25) { nameSize = 20; charSpace = -0.1; }
            if (personName.length > 35) { nameSize = 16; charSpace = -0.2; }
            if (personName.length > 45) { nameSize = 13; charSpace = -0.3; }
            doc.setTextColor(0, 0, 0); doc.setFontSize(nameSize); doc.setFont(font, "bold");
            doc.text(doc.splitTextToSize(personName, 260), 148.5, 105, { align: 'center', charSpace });
            doc.setTextColor(70, 70, 70); doc.setFontSize(14); doc.setFont(font, "normal");
            const personId = String(person[idCol] || '');
            const body = (cfg.bodyText || 'CERTIFICAMOS QUE {NOME} CONCLUIU O CURSO.').replace('{NOME}', personName).replace('{ID}', personId).toUpperCase();
            doc.text(doc.splitTextToSize(body, 220), 148.5, 122, { align: 'center' });
            doc.setFontSize(12); doc.text(`${(cfg.city || 'SALVADOR').toUpperCase()}, ${new Date().toLocaleDateString('pt-BR')}.`, 148.5, 155, { align: 'center' });
            const sigY = 180; const lineY = 183; const textY = 188;
            const sigs = [[cfg.signerName || '', cfg.signerRole || ''], [cfg.signerName2 || '', cfg.signerRole2 || '']];
            if (sigs[1][0]) {
                sigs.forEach((s, idx) => {
                    const x = idx === 0 ? 75 : 222; const lineX = idx === 0 ? [25, 125] : [170, 275];
                    doc.setFont("times", "italic"); doc.setFontSize(24); doc.text(String(s[0]), x, sigY, { align: 'center' });
                    doc.setLineWidth(0.4); doc.line(lineX[0], lineY, lineX[1], lineY);
                    doc.setFontSize(10); doc.setFont(font, "bold"); doc.text(String(s[0]), x, textY, { align: 'center' });
                    doc.setFontSize(8); doc.setFont(font, "normal"); doc.text(String(s[1]), x, textY + 4, { align: 'center' });
                });
            } else {
                doc.setFont("times", "italic"); doc.setFontSize(24); doc.text(String(sigs[0][0]), 148.5, sigY, { align: 'center' });
                doc.setLineWidth(0.4); doc.line(95, lineY, 202, lineY);
                doc.setFontSize(10); doc.setFont(font, "bold"); doc.text(String(sigs[0][0]), 148.5, textY, { align: 'center' });
                doc.setFontSize(8); doc.setFont(font, "normal"); doc.text(String(sigs[0][1]), 148.5, textY + 4, { align: 'center' });
            }
            doc.save(`CERTIFICADO_${personName}.pdf`);
        } catch (e: any) { console.error(e); notify('error', 'Erro ao gerar PDF', e.message || 'Verifique imagem de fundo e dados.'); }
    };

    const generateAuditReport = async () => {
        try {
            const jsPDFConstructor: any = await safeImportPDF();
            const doc = new jsPDFConstructor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            doc.setFontSize(18); doc.text("Relatório de Auditoria", 14, 20);
            const { default: autoTable } = await import('jspdf-autotable');
            let logs = (db.auditLogs || []).filter(l => {
                if (loggedUser?.role === 'master') return true;
                if (auditStartDate && auditEndDate) { /* Simple filter logic */ }
                return true;
            });
            (autoTable as any)(doc, {
                head: [['DATA', 'USUÁRIO', 'AÇÃO']],
                body: logs.map(l => [`${l.date} ${l.time}`, l.author, l.details]),
                startY: 30, theme: 'grid'
            });
            doc.save(`Auditoria_${new Date().toISOString().slice(0, 10)}.pdf`);
            notify('success', 'Relatório Gerado');
            setShowAuditModal(false);
        } catch (e) { console.error(e); notify('error', 'Erro ao gerar relatório'); }
    };

    // --- RENDERERS ---

    const renderDashboard = () => {
        const widgets = db.config.dashboardWidgets || [];
        const editingWidget = widgets.find(w => w.id === selectedWidgetId);
        const getWidgetData = (w: DashboardWidget) => {
            if (w.type.startsWith('control-')) return [];
            if ((w.type === 'table' || w.type === 'overview') && w.fields?.length) {
                if (w.type === 'overview') return w.fields.map(f => ({ label: f, value: filteredData.filter(r => String(r[f] || '').trim()).length }));
                const counts: Record<string, { count: number; row: any }> = {};
                filteredData.forEach(row => { const k = String(row[w.fields![0]] || '').trim(); if (k && k !== 'N/A') { counts[k] = counts[k] || { count: 0, row }; counts[k].count++; } });
                return Object.entries(counts).sort((a, b) => b[1].count - a[1].count).slice(0, 50).map(([label, data]) => ({ label, value: data.count, rowData: data.row }));
            }
            // Helper para encontrar chave ignorando case
            const findMatchingKey = (obj: any, key: string) => {
                if (!obj || !key) return undefined;
                if (obj[key] !== undefined) return key; // Match exato
                const lowerKey = key.toLowerCase();
                return Object.keys(obj).find(k => k.toLowerCase() === lowerKey || k.toLowerCase().trim() === lowerKey.trim());
            };

            // Use field se existir, senão tenta usar o título do widget como nome da coluna
            const fieldToUse = w.field || w.title;
            if (!fieldToUse && w.type !== 'kpi') return [];

            const counts: Record<string, number> = {};
            filteredData.forEach(row => {
                const actualKey = findMatchingKey(row, fieldToUse);
                const val = actualKey ? row[actualKey] : undefined;
                const v = String(val || '').toUpperCase().trim();
                if (v && v !== 'N/A') counts[v] = (counts[v] || 0) + 1;
            });
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
        };

        return (
            <div className="flex h-full flex-col lg:flex-row gap-6 animate-in fade-in overflow-hidden">
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-4">
                        <div>
                            <h2 className="text-xl lg:text-2xl font-black uppercase text-[var(--text-main)] tracking-tight">Dashboard</h2>
                            <p className="text-[10px] lg:text-xs text-[var(--text-muted)] font-bold uppercase mt-1">{filteredData.length} Registros</p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            {(Object.keys(activeFilters).length > 0 || searchTerm || selectedGroup) && (
                                <button onClick={handleClearFilters} className="flex-1 sm:flex-none bg-red-500/10 text-red-500 px-4 py-2 rounded-xl text-[10px] font-bold border border-red-500/20"><XCircle className="w-4 h-4 inline mr-1" /> Limpar</button>
                            )}
                            {loggedUser?.role === 'master' && (
                                <button onClick={() => setIsEditingDashboard(!isEditingDashboard)} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-bold border ${isEditingDashboard ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 border-white/10'}`}><Edit3 className="w-4 h-4 inline mr-1" /> {isEditingDashboard ? 'Finalizar' : 'Editar'}</button>
                            )}
                            <button onClick={handleExportCSV} className="flex-1 sm:flex-none bg-emerald-600/20 text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-bold border border-emerald-600/30">CSV</button>
                            <button onClick={handleExportPDF} className="flex-1 sm:flex-none bg-rose-600/20 text-rose-400 px-4 py-2 rounded-xl text-[10px] font-bold border border-rose-600/30 flex items-center justify-center gap-1"><FileText className="w-3 h-3" /> PDF</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {widgets.map((w, index) => {
                                const style = w.styleConfig || {};
                                return (
                                    <div key={`${w.id}-${index}`} onClick={() => isEditingDashboard && setSelectedWidgetId(w.id)} className={`relative p-6 flex flex-col transition-all duration-300 bg-white rounded-[24px] ${w.width === '4' ? 'col-span-full' : w.width === '3' ? 'md:col-span-3' : w.width === '2' ? 'md:col-span-2' : ''}`} style={{ backgroundColor: style.bgColor, color: style.textColor, borderRadius: style.borderRadius, border: style.borderColor ? `1px solid ${style.borderColor}` : 'none' }}>
                                        {isEditingDashboard && <button onClick={(e) => { e.stopPropagation(); handleRemoveWidget(w.id); }} className="absolute top-2 right-2 p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>}
                                        {w.type === 'kpi' ? <KPICard value={filteredData.length} title={w.title} config={style} /> : (
                                            <>
                                                <h3 className="text-[10px] font-black uppercase mb-4">{w.title}</h3>
                                                <div className="flex-1 h-48"><AdvancedChart type={w.type} data={getWidgetData(w)} config={style} fields={w.fields} onSelect={(label) => filterByCharts(w.field || '', label)} selectedLabels={activeFilters[w.field || ''] || []} /></div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                            {isEditingDashboard && <button onClick={handleAddWidget} className="h-48 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:border-blue-500/5 transition-all"><Plus className="w-6 h-6" /> Adicionar</button>}
                        </div>
                    </div>
                </div>
                {isEditingDashboard && editingWidget && (
                    <div className="fixed lg:static inset-y-0 right-0 w-full sm:w-80 bg-[#1e293b] border-l border-white/10 p-6 overflow-y-auto z-50">
                        <div className="flex justify-between items-center mb-6 text-white"><h3 className="font-bold uppercase text-sm">Editar Widget</h3><button onClick={() => setSelectedWidgetId(null)}><XCircle className="w-5 h-5" /></button></div>
                        <div className="space-y-4">
                            <div><label className="text-[10px] text-slate-400 font-bold uppercase">Título</label><input value={editingWidget.title} onChange={e => handleUpdateWidget({ ...editingWidget, title: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white" /></div>
                            <div><label className="text-[10px] text-slate-400 font-bold uppercase">Tipo</label>
                                <div className="grid grid-cols-4 gap-1">
                                    {['bar', 'line', 'pie', 'table', 'kpi', 'area', 'overview'].map(t => <button key={t} onClick={() => handleUpdateWidget({ ...editingWidget, type: t as any })} className={`p-1 border rounded text-[8px] uppercase ${editingWidget.type === t ? 'bg-blue-600 border-blue-500 text-white' : 'border-white/10 text-slate-400'}`}>{t}</button>)}
                                </div>
                            </div>
                            <div><label className="text-[10px] text-slate-400 font-bold uppercase">Campo de Dados</label>
                                <select value={editingWidget.field || ''} onChange={e => handleUpdateWidget({ ...editingWidget, field: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-xs">
                                    <option value="">Selecione...</option>
                                    {db.headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div><label className="text-[10px] text-slate-400 font-bold uppercase">Largura (Colunas)</label>
                                <div className="grid grid-cols-4 gap-1">
                                    {['1', '2', '3', '4'].map(w => <button key={w} onClick={() => handleUpdateWidget({ ...editingWidget, width: w })} className={`p-2 border rounded text-xs font-bold ${editingWidget.width === w ? 'bg-blue-600 border-blue-500 text-white' : 'border-white/10 text-slate-400'}`}>{w}</button>)}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] text-slate-400 font-bold uppercase">Cor Fundo</label><input type="color" value={editingWidget.styleConfig?.bgColor || '#ffffff'} onChange={e => handleUpdateWidget({ ...editingWidget, styleConfig: { ...editingWidget.styleConfig, bgColor: e.target.value } })} className="w-full h-8 cursor-pointer rounded" /></div>
                                <div><label className="text-[10px] text-slate-400 font-bold uppercase">Cor Texto</label><input type="color" value={editingWidget.styleConfig?.textColor || '#1e293b'} onChange={e => handleUpdateWidget({ ...editingWidget, styleConfig: { ...editingWidget.styleConfig, textColor: e.target.value } })} className="w-full h-8 cursor-pointer rounded" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] text-slate-400 font-bold uppercase">Cor Borda</label><input type="color" value={editingWidget.styleConfig?.borderColor || '#e2e8f0'} onChange={e => handleUpdateWidget({ ...editingWidget, styleConfig: { ...editingWidget.styleConfig, borderColor: e.target.value } })} className="w-full h-8 cursor-pointer rounded" /></div>
                                <div><label className="text-[10px] text-slate-400 font-bold uppercase">Border Radius</label><input type="number" value={editingWidget.styleConfig?.borderRadius || 16} onChange={e => handleUpdateWidget({ ...editingWidget, styleConfig: { ...editingWidget.styleConfig, borderRadius: parseInt(e.target.value) || 16 } })} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-xs" /></div>
                            </div>
                            {editingWidget.type === 'kpi' && (
                                <div className="space-y-2 bg-black/20 p-3 rounded-lg border border-white/5">
                                    <label className="text-[10px] text-blue-400 font-bold uppercase">Configurações KPI</label>
                                    <div><label className="text-[10px] text-slate-400 font-bold uppercase">Ícone</label>
                                        <select value={editingWidget.styleConfig?.iconName || 'Activity'} onChange={e => handleUpdateWidget({ ...editingWidget, styleConfig: { ...editingWidget.styleConfig, iconName: e.target.value } })} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-xs">
                                            {['Activity', 'Users', 'BarChart2', 'TrendingUp', 'Award', 'Zap', 'Target', 'Shield', 'Heart', 'Star', 'CheckCircle', 'Database'].map(ic => <option key={ic} value={ic}>{ic}</option>)}
                                        </select>
                                    </div>
                                    <div><label className="text-[10px] text-slate-400 font-bold uppercase">Cor Ícone</label><input type="color" value={editingWidget.styleConfig?.iconColor || '#3b82f6'} onChange={e => handleUpdateWidget({ ...editingWidget, styleConfig: { ...editingWidget.styleConfig, iconColor: e.target.value } })} className="w-full h-8 cursor-pointer rounded" /></div>
                                </div>
                            )}
                            <div className="flex gap-2 pt-4 border-t border-white/10">
                                <button onClick={() => { const idx = widgets.findIndex(w => w.id === editingWidget.id); moveWidget(idx, 'up'); }} className="flex-1 p-2 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white font-bold flex items-center justify-center gap-1"><ArrowUp className="w-3 h-3" /> Subir</button>
                                <button onClick={() => { const idx = widgets.findIndex(w => w.id === editingWidget.id); moveWidget(idx, 'down'); }} className="flex-1 p-2 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white font-bold flex items-center justify-center gap-1"><ArrowDown className="w-3 h-3" /> Descer</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderCertificates = () => {
        const certPaginatedData = certFilteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
        const certTotalPages = Math.ceil(certFilteredData.length / ITEMS_PER_PAGE);
        return (
            <div className="flex flex-col h-full gap-4 animate-in fade-in overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div><h2 className="text-xl lg:text-2xl font-black uppercase text-[var(--text-main)]">Certificados</h2><p className="text-xs text-[var(--text-muted)] font-bold uppercase">{certFilteredData.length} Candidatos</p></div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        {selectedCertificates.size > 0 && <button onClick={generateBatchPDF} className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold">Emitir {selectedCertificates.size}</button>}
                        {loggedUser?.role === 'master' && <button onClick={() => setShowCertConfig(!showCertConfig)} className="flex-1 sm:flex-none bg-white/5 text-slate-300 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-bold">Configurar</button>}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--border-subtle)]">
                    <input value={certSearchTerm} onChange={e => setCertSearchTerm(e.target.value)} placeholder="Pesquisar..." className="flex-1 bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm text-[var(--text-main)] outline-none" />
                    {turmaOptions.length > 0 && <select value={certFilterTurma} onChange={e => setCertFilterTurma(e.target.value)} className="bg-[var(--surface-color)] p-3 rounded-xl text-sm"><option value="">Todas Turmas</option>{turmaOptions.map(t => <option key={t} value={t}>{t}</option>)}</select>}
                </div>
                <div className="flex-1 bg-[var(--card-bg)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col">
                    <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-[var(--surface-color)] z-10 p-4 text-[10px] font-black uppercase">
                                <tr>
                                    <th className="p-4 w-12"><input type="checkbox" onChange={e => e.target.checked ? selectAllCertificates() : deselectAllCertificates()} className="w-4 h-4" /></th>
                                    <th className="p-4">Nome</th><th className="p-4">Status</th><th className="p-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {certPaginatedData.map((row, i) => {
                                    const uid = getRowUniqueId(row, ((currentPage - 1) * ITEMS_PER_PAGE) + i);
                                    return (
                                        <tr key={uid} className={`hover:bg-blue-600/5 ${selectedCertificates.has(uid) ? 'bg-blue-600/10' : ''}`}>
                                            <td className="p-4"><input type="checkbox" checked={selectedCertificates.has(uid)} onChange={() => toggleCertificateSelection(uid)} className="w-4 h-4" /></td>
                                            <td className="p-4 text-sm font-medium">{String(row[nameCol] || '')}</td>
                                            <td className="p-4"><span className="text-[9px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">APTO</span></td>
                                            <td className="p-4"><button onClick={() => generatePDF(row)} className="p-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/40"><Printer className="w-4 h-4" /></button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* PAGINATION */}
                <div className="p-4 bg-[var(--surface-color)]/50 border-t border-[var(--border-subtle)] flex justify-between items-center shrink-0">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 rounded-lg hover:bg-[var(--card-bg)] disabled:opacity-30 border border-[var(--border-subtle)]"><ChevronLeft className="w-5 h-5" /></button>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Pág. {currentPage} / {certTotalPages || 1}</span>
                    <button disabled={currentPage === certTotalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 rounded-lg hover:bg-[var(--card-bg)] disabled:opacity-30 border border-[var(--border-subtle)]"><ChevronRight className="w-5 h-5" /></button>
                </div>
                {showCertConfig && (
                    <div className="fixed inset-y-0 right-0 w-80 bg-[var(--surface-color)] border-l border-[var(--border-subtle)] p-6 z-50 animate-in slide-in-from-right overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 text-[var(--text-main)]"><h3 className="font-bold uppercase text-sm">Configuração de Certificados</h3><button onClick={() => setShowCertConfig(false)}><XCircle className="w-5 h-5" /></button></div>
                        <div className="space-y-4">
                            <div><label className="text-[10px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Título do Certificado</label>
                                <input type="text" value={db.config.certConfig?.title || 'CERTIFICADO'} onChange={e => updateCertConfig('title', e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-lg p-2 text-sm text-[var(--text-main)]" />
                            </div>
                            <div><label className="text-[10px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Texto do Corpo (use {'{NOME}'} e {'{ID}'})</label>
                                <textarea value={db.config.certConfig?.bodyText || ''} onChange={e => updateCertConfig('bodyText', e.target.value)} className="w-full h-24 bg-[var(--input-bg)] border border-[var(--border-subtle)] p-3 text-xs rounded-lg text-[var(--text-main)]" />
                            </div>
                            <div className="bg-[var(--card-bg)] p-3 rounded-lg border border-[var(--border-subtle)] space-y-3">
                                <p className="text-[10px] font-bold text-blue-400 uppercase">Assinante 1</p>
                                <input type="text" placeholder="Nome" value={db.config.certConfig?.signerName || ''} onChange={e => updateCertConfig('signerName', e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded p-2 text-xs text-[var(--text-main)]" />
                                <input type="text" placeholder="Cargo" value={db.config.certConfig?.signerRole || ''} onChange={e => updateCertConfig('signerRole', e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded p-2 text-xs text-[var(--text-main)]" />
                            </div>
                            <div className="bg-[var(--card-bg)] p-3 rounded-lg border border-[var(--border-subtle)] space-y-3">
                                <p className="text-[10px] font-bold text-blue-400 uppercase">Assinante 2 (Opcional)</p>
                                <input type="text" placeholder="Nome" value={db.config.certConfig?.signerName2 || ''} onChange={e => updateCertConfig('signerName2', e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded p-2 text-xs text-[var(--text-main)]" />
                                <input type="text" placeholder="Cargo" value={db.config.certConfig?.signerRole2 || ''} onChange={e => updateCertConfig('signerRole2', e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded p-2 text-xs text-[var(--text-main)]" />
                            </div>
                            <div><label className="text-[10px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Cidade</label>
                                <input type="text" value={db.config.certConfig?.city || 'SALVADOR'} onChange={e => updateCertConfig('city', e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-lg p-2 text-sm text-[var(--text-main)]" />
                            </div>
                            <div><label className="text-[10px] text-[var(--text-muted)] font-bold uppercase mb-1 block">URL Imagem de Fundo</label>
                                <input type="text" placeholder="/cert-template.png" value={db.config.certConfig?.backgroundUrl || ''} onChange={e => updateCertConfig('backgroundUrl', e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-[var(--text-main)]" />
                            </div>
                            <div><label className="text-[10px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Família de Fonte</label>
                                <select value={db.config.certConfig?.fontFamily || 'helvetica'} onChange={e => updateCertConfig('fontFamily', e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-lg p-2 text-sm text-[var(--text-main)]">
                                    <option value="helvetica">Helvetica</option>
                                    <option value="times">Times New Roman</option>
                                    <option value="courier">Courier</option>
                                </select>
                            </div>
                            <button onClick={saveCertConfigToCloud} disabled={isSavingConfig} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold uppercase text-xs disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSavingConfig ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar na Nuvem</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderAuditModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[var(--surface-color)] p-8 rounded-3xl w-full max-w-md border border-[var(--border-subtle)]">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-[var(--text-main)]">Auditoria</h3><button onClick={() => setShowAuditModal(false)}><XCircle className="w-6 h-6" /></button></div>
                <div className="space-y-4 mb-6">
                    <input type="date" value={auditStartDate} onChange={e => setAuditStartDate(e.target.value)} className="w-full p-4 bg-[var(--input-bg)] rounded-xl border border-[var(--border-subtle)] text-[var(--text-main)]" />
                    <input type="date" value={auditEndDate} onChange={e => setAuditEndDate(e.target.value)} className="w-full p-4 bg-[var(--input-bg)] rounded-xl border border-[var(--border-subtle)] text-[var(--text-main)]" />
                </div>
                <div className="flex gap-4"><button onClick={() => setShowAuditModal(false)} className="flex-1 text-[var(--text-muted)] font-bold uppercase text-xs">Sair</button><button onClick={generateAuditReport} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold uppercase text-xs">Gerar</button></div>
            </div>
        </div>
    );

    const renderContentByMode = () => {
        if (mode === 'relatorio') return renderDashboard();
        if (mode === 'certificados') return renderCertificates();

        return (
            <div className="flex flex-col h-full gap-4 animate-in fade-in overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-lg gap-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
                        <div className="relative flex-1 group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar..." className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl py-3 pl-12 pr-4 text-sm text-[var(--text-main)] outline-none" /></div>
                        {groupCol && <select value={selectedGroup || ''} onChange={e => setSelectedGroup(e.target.value || null)} className="bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm text-[var(--text-main)]"><option value="">Filtro Grupo</option>{[...new Set(inscriptions.map(r => r[groupCol]))].filter(Boolean).sort().map(g => <option key={g as string} value={g as string}>{g as string}</option>)}</select>}
                        {classCol && <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm text-[var(--text-main)]"><option value="TODAS">Todas Turmas</option>{[...new Set(inscriptions.map(r => r[classCol]))].filter(Boolean).sort().map(t => <option key={t as string} value={t as string}>{t as string}</option>)}</select>}
                    </div>
                    <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2">
                        {(Object.keys(activeFilters).length > 0 || searchTerm || selectedGroup || selectedClass !== 'TODAS') && (
                            <button onClick={handleClearFilters} className="px-3 py-2 bg-red-500/10 text-red-500 rounded-xl font-bold uppercase text-[10px] border border-red-500/20"><XCircle className="w-3 h-3 inline mr-1" />Limpar</button>
                        )}
                        <button onClick={handleExportCSV} className="px-3 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold uppercase text-[10px] border border-emerald-500/20"><Download className="w-3 h-3 inline mr-1" />CSV</button>
                        <button onClick={handleExportPDF} className="px-3 py-2 bg-blue-500/10 text-blue-500 rounded-xl font-bold uppercase text-[10px] border border-blue-500/20"><FileText className="w-3 h-3 inline mr-1" />PDF</button>
                        <button onClick={() => setShowAuditModal(true)} className="px-3 py-2 bg-purple-500/10 text-purple-500 rounded-xl font-bold uppercase text-[10px] border border-purple-500/20">Auditoria</button>
                        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Total: <span className="text-[var(--text-main)]">{filteredData.length}</span></div>
                    </div>
                </div>

                <div className="flex-1 bg-[var(--card-bg)] rounded-2xl border border-[var(--border-subtle)] shadow-xl overflow-hidden flex flex-col relative">
                    <div className="overflow-auto custom-scrollbar flex-1">
                        {/* TABLE DESKTOP */}
                        <div className="hidden lg:block min-w-full">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-[var(--surface-color)] z-10 shadow-sm">
                                    <tr>
                                        {(db.config.displayCols.length > 0 ? db.config.displayCols : db.headers.slice(0, 6)).map(h => (
                                            <th key={h} className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border-subtle)] whitespace-nowrap">
                                                <div className="flex items-center gap-1">{h}<ColumnFilter column={h} data={inscriptions} activeFilters={activeFilters} onFilterChange={(c, v) => setActiveFilters(prev => ({ ...prev, [c]: v }))} /></div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {paginatedData.map((row, i) => (
                                        <tr key={i} className="hover:bg-[var(--card-bg)] transition-colors group">
                                            {(db.config.displayCols.length > 0 ? db.config.displayCols : db.headers.slice(0, 6)).map(col => {
                                                const isMaster = loggedUser?.role === 'master';
                                                const rolePerms = db.config.editPermissions?.[loggedUser?.role as 'comum' | 'suporte'] || [];
                                                const isEditable = isMaster || rolePerms.includes(col);
                                                const idVal = row[db.headers[0]] || Object.values(row)[0];
                                                const isPresence = ['SEMANA', 'AULA', 'ENCONTRO', 'PRESENÇA', 'REPOSIÇÃO', 'REPOSICAO'].some(k => col.toUpperCase().includes(k));

                                                return (
                                                    <td key={col} className="p-4 text-sm text-[var(--text-dim)] whitespace-nowrap">
                                                        <EditableCell
                                                            value={String(row[col] || '')}
                                                            isEditable={isEditable}
                                                            type={isPresence ? 'select' : 'text'}
                                                            options={isPresence ? ['P', 'F'] : []}
                                                            onSave={(val) => {
                                                                const id = String(idVal);
                                                                updateLocalData(id, col, val);
                                                                sendToCloud({ action: 'UPDATE_ROW', id, column: col, value: val, user: loggedUser?.user });
                                                                notify('success', 'Salvo', `Campo ${col} atualizado.`);
                                                            }}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* MOBILE CARDS */}
                        <div className="lg:hidden p-4 space-y-4">
                            {paginatedData.map((row, i) => {
                                const id = String(row[db.headers[0]] || Object.values(row)[0]);
                                const name = String(row[nameCol] || 'Registro');
                                const colsToDisplay = db.config.displayCols.length > 0 ? db.config.displayCols : db.headers.slice(1, 5);

                                return (
                                    <div key={i} className="bg-[var(--surface-color)]/30 border border-[var(--border-subtle)] rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-[var(--text-main)] text-sm">{name}</h3>
                                                <p className="text-[10px] text-[var(--text-muted)] font-mono">{id}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {/* Mini actions if needed */}
                                                <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-500"><User className="w-4 h-4" /></div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)] pt-3">
                                            {colsToDisplay.map(col => {
                                                if (col === nameCol) return null;
                                                return (
                                                    <div key={col} className="space-y-1">
                                                        <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider block">{col}</span>
                                                        <EditableCell
                                                            value={String(row[col] || '')}
                                                            isEditable={loggedUser?.role === 'master'}
                                                            onSave={(val) => {
                                                                updateLocalData(id, col, val);
                                                                sendToCloud({ action: 'UPDATE_ROW', id, column: col, value: val, user: loggedUser?.user });
                                                                notify('success', 'Atualizado');
                                                            }}
                                                            className="text-xs font-semibold text-[var(--text-dim)]"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            {!paginatedData.length && <div className="p-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase">Sem registros</div>}
                        </div>
                    </div>

                    {/* PAGINATION */}
                    <div className="p-4 bg-[var(--surface-color)]/50 border-t border-[var(--border-subtle)] flex justify-between items-center shrink-0">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 rounded-lg hover:bg-[var(--card-bg)] disabled:opacity-30 border border-[var(--border-subtle)]"><ChevronLeft className="w-5 h-5" /></button>
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Pág. {currentPage} / {totalPages}</span>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 rounded-lg hover:bg-[var(--card-bg)] disabled:opacity-30 border border-[var(--border-subtle)]"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-4 lg:p-6 bg-[var(--background-color)]">
            <div className="flex-1 flex flex-col overflow-hidden">
                {renderContentByMode()}
            </div>
            {showAuditModal && renderAuditModal()}
        </div>
    );
};
