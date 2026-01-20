export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  owner: User;
  members?: WorkspaceMember[];
  boards?: Board[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    boards: number;
    members: number;
  };
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  user: User;
  createdAt: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  isRetainer?: boolean;
  workspace?: {
    id: string;
    name: string;
    ownerId?: string;
  };
  groups?: Group[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    groups: number;
  };
}

export interface Group {
  id: string;
  name: string;
  boardId: string;
  position: number;
  color?: string;
  items?: Item[];
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  title: string;
  groupId: string;
  position: number;
  status: string;
  priority: string;
  startDate?: string;
  dueDate?: string;
  assignedTo?: string;
  description?: string;
  notes?: string | null;
  isArchived?: boolean;
  completedAt?: string;
  retainerHours?: number | null;
  assignedUser?: User;
  group?: {
    id: string;
    name: string;
    board: {
      id: string;
      name: string;
      isRetainer?: boolean;
      workspace?: {
        id: string;
        name: string;
      };
    };
  };
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    comments: number;
  };
}

export interface Comment {
  id: string;
  content: string;
  itemId: string;
  userId: string;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  userId: string;
  user: User;
  boardId?: string;
  itemId?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  itemId?: string;
  boardId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface BoardRoadmapEntry {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export type StatusType = 'todo' | 'in_progress' | 'done' | 'stuck';
export type PriorityType = 'low' | 'medium' | 'high' | 'critical';
