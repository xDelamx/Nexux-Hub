
export enum TaskStatus {
  PENDING = 'Pendente',
  IN_PROGRESS = 'Em Andamento',
  DONE = 'Concluído'
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  minutesSpent?: number;
  estimatedMinutes?: number;
  dueDate?: number;
  isArchived?: boolean;
  lastStartedAt?: number;
}

export interface Page {
  id: string;
  title: string;
  content: string;
  drawingData?: string; // base64 representation of canvas
}

export interface Section {
  id: string;
  title: string;
  pages: Page[];
}

export interface Notebook {
  id: string;
  title: string;
  sections: Section[];
}

export interface Resource {
  id: string;
  title: string;
  category: string;
  url: string;
  imageUrl: string;
  order?: number;
}

export interface ThemeConfig {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundValue: string;
  accentColor: string;
  glassOpacity: number;
}

export type ViewType = 'dashboard' | 'tasks' | 'knowledge' | 'operations' | 'notebook';
