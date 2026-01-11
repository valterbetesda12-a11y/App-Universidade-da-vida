import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CSV Parser (same logic as frontend)
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

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log('🔄 Starting Google Sheets sync...');

        // Get app config to retrieve sheetUrl
        const { data: configData, error: configError } = await supabase
            .from('app_config')
            .select('config')
            .eq('id', 'global')
            .single();

        if (configError) {
            console.error('❌ Error fetching config:', configError);
            return new Response(JSON.stringify({
                error: 'Failed to fetch config',
                details: configError
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const sheetUrl = configData?.config?.sheetUrl;

        if (!sheetUrl) {
            console.warn('⚠️ No sheetUrl configured');
            return new Response(JSON.stringify({
                error: 'No sheetUrl configured in app_config'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Extract sheet ID from URL
        const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            console.error('❌ Invalid sheet URL format');
            return new Response(JSON.stringify({
                error: 'Invalid sheetUrl format'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const sheetId = match[1];
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

        console.log(`📥 Fetching data from: ${exportUrl}`);

        // Fetch CSV from Google Sheets
        const response = await fetch(exportUrl);
        if (!response.ok) {
            console.error(`❌ Failed to fetch sheet: ${response.status}`);
            return new Response(JSON.stringify({
                error: `Failed to fetch sheet: ${response.status}`
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const csvText = await response.text();

        // Check if response is HTML (not published)
        if (csvText.includes('<!DOCTYPE') || csvText.includes('<html')) {
            console.error('❌ Sheet returned HTML - not published as CSV');
            return new Response(JSON.stringify({
                error: 'Sheet is not published. Go to File > Share > Publish to web > CSV'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse CSV
        const { data, headers } = parseCSV(csvText);
        console.log(`✅ Parsed ${data.length} rows with ${headers.length} columns`);

        if (data.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                synced: 0,
                message: 'No data to sync'
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Find ID column (CPF, ID, MATRICULA, etc.)
        const idColumn = headers.find(h =>
            ['CPF', 'ID', 'MATRICULA', 'RG', 'DOCUMENTO'].some(k =>
                h.toUpperCase().includes(k)
            )
        ) || headers[0];

        console.log(`🔑 Using "${idColumn}" as unique identifier`);

        // Upsert data to Supabase
        let syncedCount = 0;
        let errorCount = 0;

        for (const row of data) {
            const externalId = String(row[idColumn] || '').trim();

            if (!externalId) {
                console.warn('⚠️ Skipping row with empty ID');
                continue;
            }

            const { error } = await supabase
                .from('inscriptions')
                .upsert({
                    external_id: externalId,
                    data: row,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'external_id'
                });

            if (error) {
                console.error(`❌ Error upserting ${externalId}:`, error);
                errorCount++;
            } else {
                syncedCount++;
            }
        }

        console.log(`✅ Sync complete: ${syncedCount} synced, ${errorCount} errors`);

        return new Response(JSON.stringify({
            success: true,
            synced: syncedCount,
            errors: errorCount,
            total: data.length,
            timestamp: new Date().toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('❌ Unexpected error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
