import { supabase } from '../lib/supabase';

interface SyncResult {
    success: boolean;
    synced: number;
    errors: number;
    message?: string;
}

export async function directBrowserSync(sheetUrl: string): Promise<SyncResult> {
    console.log("🔄 Iniciando Sincronização Direta via Browser...");

    try {
        // 1. Extrair ID da planilha
        const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            throw new Error('Formato de URL da planilha inválido');
        }
        const sheetId = match[1];
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

        // 2. Buscar CSV
        const response = await fetch(exportUrl);
        if (!response.ok) {
            throw new Error(`Falha ao buscar planilha: ${response.status}`);
        }
        const csvText = await response.text();

        if (csvText.includes('<!DOCTYPE') || csvText.includes('<html')) {
            throw new Error('Planilha não está publicada. Vá em Arquivo > Compartilhar > Publicar na web > CSV');
        }

        // 3. Parsear CSV simples
        const lines = csvText.split(/\r?\n/).filter(l => l.trim());
        if (lines.length === 0) return { success: true, synced: 0, errors: 0, message: 'Vazia' };

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

        // Encontrar coluna de ID
        const idColumn = headers.find(h =>
            ['CPF', 'ID', 'MATRICULA', 'RG', 'DOCUMENTO'].some(k => h.toUpperCase().includes(k))
        ) || headers[0];

        const records = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: any = {};
            headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

            const externalId = String(row[idColumn] || '').trim();
            if (externalId) {
                records.push({
                    external_id: externalId,
                    data: row,
                    updated_at: new Date().toISOString()
                });
            }
        }

        // 4. Upsert para Supabase em batches
        const BATCH_SIZE = 50;
        let syncedCount = 0;

        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
                .from('inscriptions')
                .upsert(batch, { onConflict: 'external_id' });

            if (error) {
                console.error("Erro no batch:", error);
                throw new Error(`Erro no banco de dados: ${error.message}`);
            }
            syncedCount += batch.length;
        }

        return {
            success: true,
            synced: syncedCount,
            errors: 0
        };

    } catch (err: any) {
        console.error("Erro na Sincronização Direta:", err);
        return {
            success: false,
            synced: 0,
            errors: 1,
            message: err.message
        };
    }
}
