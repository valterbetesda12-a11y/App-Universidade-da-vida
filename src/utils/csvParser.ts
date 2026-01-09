
export const parseCSV = (text: string) => {
  if (!text) return { headers: [], data: [] };

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuote = false;

  // Parser sequencial (Caractere por Caractere) - Imune a travamentos de Regex
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuote) {
      if (char === '"' && nextChar === '"') {
        currentVal += '"';
        i++; // Pula a aspa de escape
      } else if (char === '"') {
        insideQuote = false;
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
      } else if (char === ',') {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\n' || char === '\r') {
        if (currentVal || currentRow.length > 0) {
          currentRow.push(currentVal.trim());
        }
        if (currentRow.length > 0) {
           rows.push(currentRow);
        }
        currentRow = [];
        currentVal = '';
        // Trata quebras de linha Windows (\r\n)
        if (char === '\r' && nextChar === '\n') i++;
      } else {
        currentVal += char;
      }
    }
  }
  
  // Adiciona o último valor/linha se existir
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }

  if (rows.length === 0) return { headers: [], data: [] };

  // --- TRATAMENTO DE CABEÇALHOS DUPLICADOS (PREVENÇÃO DE TELA BRANCA) ---
  const rawHeaders = rows[0].map(h => h.trim());
  const headers: string[] = [];
  const headerCounts: Record<string, number> = {};

  rawHeaders.forEach(h => {
    // Se o cabeçalho for vazio, dá um nome genérico
    let cleanHeader = h || 'COLUNA_VAZIA';
    
    if (headerCounts[cleanHeader]) {
      headerCounts[cleanHeader]++;
      headers.push(`${cleanHeader}_${headerCounts[cleanHeader]}`); // Ex: Nome_2
    } else {
      headerCounts[cleanHeader] = 1;
      headers.push(cleanHeader);
    }
  });

  const data = rows.slice(1).map((row, rowIndex) => {
    let obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      // Garante que não acesse índices inexistentes e adiciona ID único se não tiver
      obj[h] = (row[i] || "").trim();
    });
    return obj;
  });

  return { headers, data };
};
