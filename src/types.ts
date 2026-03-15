export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: number;
}

export interface AppState {
  currentPath: string;
  files: FileItem[];
  loading: boolean;
  error: string | null;
  history: string[];
}
