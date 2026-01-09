import { describe, it, expect } from 'vitest';
import { filterData } from './filterUtils';

describe('filterData', () => {
    const mockData = [
        { ID: '1', NOME: 'Alice', TURMA: 'A', STATUS: 'APROVADO' },
        { ID: '2', NOME: 'Bob', TURMA: 'B', STATUS: 'REPROVADO' },
        { ID: '3', NOME: 'Charlie', TURMA: 'A', STATUS: 'EMITIR CERTIFICADO' },
    ];

    const mockHeaders = ['ID', 'NOME', 'TURMA', 'STATUS'];

    it('should filter by search term', () => {
        const result = filterData(mockData, null, undefined, undefined, null, 'TODAS', {}, 'inscricoes', 'Alice', mockHeaders);
        expect(result).toHaveLength(1);
        expect(result[0].NOME).toBe('Alice');
    });

    it('should filter by class', () => {
        const result = filterData(mockData, null, undefined, 'TURMA', null, 'A', {}, 'inscricoes', '', mockHeaders);
        expect(result).toHaveLength(2);
    });

    it('should filter for certificates', () => {
        const result = filterData(mockData, null, undefined, undefined, null, 'TODAS', {}, 'certificados', '', mockHeaders);
        // Should include APROVADO and EMITIR CERTIFICADO
        expect(result).toHaveLength(2);
        expect(result.map(r => r.NOME)).toContain('Alice');
        expect(result.map(r => r.NOME)).toContain('Charlie');
    });

    it('should respect security restrictions', () => {
        const restrictedUser = { role: 'comum', generation: 'A' };
        const result = filterData(mockData, restrictedUser, 'TURMA', undefined, null, 'TODAS', {}, 'inscricoes', '', mockHeaders);
        expect(result).toHaveLength(2); // Alice and Charlie are in TURMA A
    });
});
