
export interface TicketType { name: string; fields: string[]; }

export interface CertConfig {
  title: string; bodyText: string; signerName: string; signerRole: string;
  signerName2?: string; signerRole2?: string;
  backgroundUrl?: string; layout?: 'center' | 'left' | 'right' | 'justify';
  customColor?: string; opacity?: number; borderRadius?: number; fontFamily?: string;
  borderSize?: number;
  borderColor?: string;
  city?: string;
}

export interface DashboardWidget {
  id: string;
  type: 'bar' | 'donut' | 'kpi' | 'pie' | 'table' | 'pivot' | 'control' | 'treemap' | 'funnel' | 'gauge' | 'scatter' | 'line' | 'area' | 'overview' | 'control-dropdown' | 'control-fixed-list' | 'control-input' | 'control-button' | 'control-slider' | 'control-date' | 'control-advanced-filter';
  title: string; field: string;
  fields?: string[]; // Para múltiplas colunas em tabelas
  width: '1' | '2' | '3' | '4';
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
  bgColor?: string;
  textColor?: string;
  styleMode?: 'light' | 'dark';
  componentStyle?: 'rounded' | 'sharp' | 'pill';
  density?: 'compact' | 'comfortable';
  tabIcons: Record<string, string>;
  sheetUrl: string; scriptUrl: string;
  logsGid?: string; // ID da aba de logs (gid)
  displayCols: string[]; classCol: string;
  ticketTypes: TicketType[];
  ticketCategories?: TicketCategory[];
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
  id?: string;
  user: string;
  pass?: string;
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

export interface DBData { users: User[]; config: AppConfig; tickets: any[]; headers: string[]; auditLogs?: AuditLog[]; }

export interface TicketCategory {
  id: string;
  name: string;
  requiredFields: string[];
}

export interface TicketMessage {
  sender: string;
  role: 'user' | 'support';
  text: string;
  date: string;
}

export interface Ticket {
  protocol: string;
  name: string; // Subject
  category: string; // Categoria Name
  categoryId?: string;
  generation: string;
  details: string; // Initial Message
  status: 'PENDENTE' | 'RESPONDIDO' | 'RESOLVIDO' | 'CANCELADO';
  userLogin: string;
  createdAt: string; // ISO or Locale
  deadlineAt?: string; // ISO
  respondedBy?: string;
  response?: string; // Legacy
  messages?: TicketMessage[];
  formFields?: Record<string, string>; // Dynamic fields defined by category
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
