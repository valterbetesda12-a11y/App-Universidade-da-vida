
export type Role = 'user' | 'master';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
}

export type ViewMode = 'view' | 'edit';

export interface ReportWidget {
  id: string;
  type: 'bar' | 'pie' | 'line' | 'stat';
  title: string;
  dataKey: string;
  gridSpan: 1 | 2 | 3 | 4; // Col-span do grid
  color: string;
}

export interface AppState {
  user: User;
  isMasterMode: boolean;
  activeView: 'inscricoes' | 'relatorios' | 'certificados' | 'suporte';
  toggleMasterMode: () => void;
}

export interface ExportLayer {
  name: string;
  type: 'text' | 'image' | 'group';
  content?: string;
  x?: number;
  y?: number;
  opacity?: number;
}
