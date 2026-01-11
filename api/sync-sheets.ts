import { createClient } from '@supabase/supabase-js';

// CSV Parser (mesma lógica do frontend)
function parseCSV(text: string): { data: any[], headers: string[] } {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return { data: [], headers: [] };

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
        });
        data.push(row);
    }

    return { data, headers };
}

export default async function handler(req: any, res: any) {
    // Permitir apenas POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🔄 Iniciando sincronização Google Sheets...');

        // Inicializar cliente Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            return res.status(500).json({
                error: 'Variáveis de ambiente não configuradas'
            });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Buscar configuração do app
        const { data: configData, error: configError } = await supabase
            .from('app_config')
            .select('config')
            .eq('id', 'global')
            .single();

        if (configError) {
            console.error('❌ Erro ao buscar config:', configError);
            return res.status(500).json({
                error: 'Falha ao buscar configuração',
                details: configError
            });
        }

        const sheetUrl = configData?.config?.sheetUrl;

        if (!sheetUrl) {
            console.warn('⚠️ Nenhuma sheetUrl configurada');
            return res.status(400).json({
                error: 'URL da planilha não configurada em app_config'
            });
        }

        // Extrair ID da planilha
        const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            console.error('❌ Formato de URL inválido');
            return res.status(400).json({
                error: 'Formato de URL da planilha inválido'
            });
        }

        const sheetId = match[1];
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

        console.log(`📥 Buscando dados de: ${exportUrl}`);

        // Buscar CSV do Google Sheets
        const response = await fetch(exportUrl);
        if (!response.ok) {
            console.error(`❌ Falha ao buscar planilha: ${response.status}`);
            return res.status(500).json({
                error: `Falha ao buscar planilha: ${response.status}`
            });
        }

        const csvText = await response.text();

        // Verificar se retornou HTML (não publicado)
        if (csvText.includes('<!DOCTYPE') || csvText.includes('<html')) {
            console.error('❌ Planilha retornou HTML - não está publicada');
            return res.status(400).json({
                error: 'Planilha não está publicada. Vá em Arquivo > Compartilhar > Publicar na web > CSV'
            });
        }

        // Parsear CSV
        const { data, headers } = parseCSV(csvText);
        console.log(`✅ Parseados ${data.length} registros com ${headers.length} colunas`);

        if (data.length === 0) {
            return res.status(200).json({
                success: true,
                synced: 0,
                message: 'Nenhum dado para sincronizar'
            });
        }

        // Encontrar coluna de ID (CPF, ID, MATRICULA, etc.)
        const idColumn = headers.find(h =>
            ['CPF', 'ID', 'MATRICULA', 'RG', 'DOCUMENTO'].some(k =>
                h.toUpperCase().includes(k)
            )
        ) || headers[0];

        console.log(`🔑 Usando "${idColumn}" como identificador único`);

        // Preparar registros para batch upsert
        const records = [];
        for (const row of data) {
            const externalId = String(row[idColumn] || '').trim();

            if (!externalId) {
                console.warn('⚠️ Pulando registro com ID vazio');
                continue;
            }

            records.push({
                external_id: externalId,
                data: row,
                updated_at: new Date().toISOString()
            });
        }

        console.log(`📦 Preparados ${records.length} registros para upsert`);

        // Fazer upsert em batches de 50
        const BATCH_SIZE = 50;
        let syncedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(records.length / BATCH_SIZE);

            console.log(`📦 Upserting batch ${batchNum}/${totalBatches} (${batch.length} records)`);

            const { error } = await supabase
                .from('inscriptions')
                .upsert(batch, {
                    onConflict: 'external_id'
                });

            if (error) {
                console.error(`❌ Erro no batch ${batchNum}:`, error);
                errorCount += batch.length;
            } else {
                syncedCount += batch.length;
                console.log(`✅ Batch ${batchNum} completo`);
            }

            // Pequeno delay entre batches
            if (i + BATCH_SIZE < records.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log(`✅ Sincronização completa: ${syncedCount} sincronizados, ${errorCount} erros`);

        return res.status(200).json({
            success: true,
            synced: syncedCount,
            errors: errorCount,
            total: data.length,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Erro inesperado:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
}
