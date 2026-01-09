import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Filter, Search, X, Check } from 'lucide-react';

interface ColumnFilterProps {
    column: string;
    data: any[];
    activeFilters: Record<string, string[]>;
    onFilterChange: (col: string, vals: string[]) => void;
}

export const ColumnFilter: React.FC<ColumnFilterProps> = ({ column, data, activeFilters, onFilterChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Get unique values for this column
    const uniqueValues = useMemo(() => {
        const values = new Set<string>();
        data.forEach(row => {
            const val = String(row[column] || '').trim();
            if (val) values.add(val);
        });
        return Array.from(values).sort();
    }, [data, column]);

    // Current active filters for this column
    const currentFilters = activeFilters[column] || [];

    // Check if we have a search filter active (starts with SEARCH:)
    const searchFilterValue = currentFilters.find(f => f.startsWith('SEARCH:'))?.replace('SEARCH:', '') || '';

    // Decide mode based on cardinality (> 50 unique values = text search mode)
    const isSearchMode = uniqueValues.length > 50;

    // Handle clicks outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const toggleFilter = (val: string) => {
        const newFilters = currentFilters.includes(val)
            ? currentFilters.filter(f => f !== val)
            : [...currentFilters, val];
        onFilterChange(column, newFilters);
    };

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        // Debounce could be added here if needed, but for local data immediate is usually fine
        if (!term) {
            onFilterChange(column, []);
        } else {
            onFilterChange(column, [`SEARCH:${term}`]);
        }
    };

    // Filter displayed values in the checkbox list based on local search
    const displayedValues = uniqueValues.filter(v => v.toUpperCase().includes(searchTerm.toUpperCase()));

    const isActive = currentFilters.length > 0;

    return (
        <div className="relative inline-flex items-center ml-2" ref={containerRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={`p-1 rounded-md transition-all ${isActive ? 'bg-blue-500 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-bg)]'}`}
                title={`Filtrar por ${column}`}
            >
                <Filter className="w-3 h-3" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--card-bg)]/50">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block mb-2">
                            Filtrar {column}
                        </span>

                        {isSearchMode ? (
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Pesquisar..."
                                    value={searchFilterValue || searchTerm}
                                    onChange={e => handleSearch(e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-lg py-1.5 pl-8 pr-2 text-xs text-[var(--text-main)] focus:border-blue-500 outline-none placeholder:text-[var(--text-muted)]"
                                />
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Buscar na lista..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-lg py-1.5 pl-8 pr-2 text-xs text-[var(--text-main)] focus:border-blue-500 outline-none placeholder:text-[var(--text-muted)]"
                                />
                            </div>
                        )}
                    </div>

                    {!isSearchMode && (
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {displayedValues.length > 0 ? displayedValues.map(val => (
                                <label key={val} className="flex items-center gap-2 p-2 hover:bg-[var(--card-bg)] rounded-lg cursor-pointer transition-colors">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${currentFilters.includes(val) ? 'bg-blue-500 border-blue-500' : 'border-[var(--border-subtle)] bg-[var(--input-bg)]'}`}>
                                        {currentFilters.includes(val) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={currentFilters.includes(val)}
                                        onChange={() => toggleFilter(val)}
                                        className="hidden"
                                    />
                                    <span className="text-xs text-[var(--text-dim)] truncate">{val}</span>
                                </label>
                            )) : (
                                <div className="p-4 text-center text-xs text-[var(--text-muted)] font-bold uppercase">Nada encontrado</div>
                            )}
                        </div>
                    )}

                    <div className="p-2 border-t border-[var(--border-subtle)] bg-[var(--card-bg)]/50 flex justify-between">
                        <button
                            onClick={() => { onFilterChange(column, []); setSearchTerm(''); setIsOpen(false); }}
                            className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                        >
                            Limpar
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
