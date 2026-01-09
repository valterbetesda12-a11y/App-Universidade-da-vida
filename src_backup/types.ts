
export interface TicketType { name: string; fields: string[]; }

export interface CertConfig {
  title: string; bodyText: string; signerName: string; signerRole: string;
  backgroundUrl?: string; layout?: 'center' | 'left' | 'right';
  customColor?: string; opacity?: number; borderRadius?: number; fontFamily?: string;
  borderSize?: number;
  borderColor?: string;
}

export interface DashboardWidget {
  id: string; 
  type: 'bar' | 'donut' | 'kpi' | 'pie' | 'table' | 'pivot' | 'control' | 'treemap' | 'funnel' | 'gauge' | 'scatter' | 'line' | 'area' | 'control-dropdown' | 'control-fixed-list' | 'control-input' | 'control-button' | 'control-slider' | 'control-date' | 'control-advanced-filter';
  title: string; field: string; width: '1' | '2' | '3' | '4';
  targetValue?: string;
  styleConfig?: any;
  enableSearch?: boolean;
  color?: string;
}

export interface StatusColor {
  bg: string;
  text: string;
}

export interface AppConfig {
  color: string; iconColor: string; borderRadius: number; fontFamily: string;
  accentColor?: string;
  tabIcons: Record<string, string>;
  sheetUrl: string; scriptUrl: string;
  displayCols: string[]; classCol: string;
  ticketTypes: TicketType[];
  editPermissions: { comum: string[]; suporte: string[]; };
  certConfig?: CertConfig;
  dashboardWidgets?: DashboardWidget[];
  cardShadow?: 'normal' | 'strong';
  iconSize?: number;
  reportUrl?: string;
  certFolderUrl?: string;
  backupFolderId?: string;
  googleClientId?: string;
  periods?: any;
  groupCol?: string;
  notifications?: { email: boolean; push: boolean; };
  senderEmail?: string;
  locale?: string;
  timezone?: string;
  maintenanceMode?: boolean;
  statusColors?: {
    approved: StatusColor;
    pending: StatusColor;
    vip: StatusColor;
  };
}

export interface User { 
  user: string; 
  pass: string; 
  name: string; 
  role: 'master' | 'comum' | 'suporte'; 
  generation: string | null;
  avatar?: string;
  active?: boolean;
  permissions?: {
    editStatus?: boolean;
    deleteRecords?: boolean;
    genCert?: boolean;
    viewReports?: boolean;
  }
}

export interface DBData { users: User[]; config: AppConfig; tickets: any[]; headers: string[]; }

export interface Ticket {
  protocol: string; name: string; generation: string; type: string; details: string;
  status: 'PENDENTE' | 'RESOLVIDO' | 'CANCELADO'; userLogin: string; date: string;
  response?: string; respondedBy?: string; eta?: string; dynamicFields?: Record<string,string>;
}

export interface AuditLog {
  date: string;
  time: string;
  author: string;
  action: string;
  details: string;
  oldVal?: string;
  newVal?: string;
}

export type ViewState = 'inscricoes' | 'certificados' | 'relatorio' | 'suporte' | 'master' | 'design';

export interface DataRow { [key: string]: string | number | null | undefined; }

export const parseCSV = (text: string) => {
  if (!text) return { headers: [], data: [] };
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (insideQuote) {
      if (char === '"' && nextChar === '"') { currentVal += '"'; i++; }
      else if (char === '"') insideQuote = false;
      else currentVal += char;
    } else {
      if (char === '"') insideQuote = true;
      else if (char === ',') { currentRow.push(currentVal.trim()); currentVal = ''; }
      else if (char === '\n' || char === '\r') {
        if (currentVal || currentRow.length > 0) currentRow.push(currentVal.trim());
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = []; currentVal = '';
        if (char === '\r' && nextChar === '\n') i++;
      } else currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) { currentRow.push(currentVal.trim()); rows.push(currentRow); }
  const headers = rows[0] || [];
  const data = rows.slice(1).map(row => {
    let obj: any = {};
    headers.forEach((h, i) => obj[h] = (row[i] || "").trim());
    return obj;
  });
  return { headers, data };
};
