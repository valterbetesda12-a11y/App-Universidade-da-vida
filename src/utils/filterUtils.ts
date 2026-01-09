export const filterData = (
    inscriptions: any[],
    loggedUser: any,
    groupCol: string | undefined,
    classCol: string | undefined,
    selectedGroup: string | null,
    selectedClass: string,
    activeFilters: Record<string, string[]>,
    mode: string,
    searchTerm: string,
    headers: string[]
) => {
    let base = inscriptions.filter(row => {
        // Filtro de Sanidade: a linha deve ter pelo menos um valor não vazio
        return Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
    });

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
        const statusCol = (headers || []).find(h => possibleNames.includes(h.toUpperCase().trim())) || 'STATUS FINAL';
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
};
