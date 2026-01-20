import api from '../lib/api';
import { Group, Item, Comment, ActivityLog, Notification, ChecklistItem } from '../types';

export const groupService = {
  create: async (data: { name: string; boardId: string; color?: string }): Promise<Group> => {
    const response = await api.post('/groups', data);
    return response.data;
  },

  update: async (id: string, data: { name?: string; color?: string }): Promise<Group> => {
    const response = await api.put(`/groups/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/groups/${id}`);
  },

  reorder: async (id: string, newPosition: number): Promise<Group> => {
    const response = await api.put(`/groups/${id}/reorder`, { newPosition });
    return response.data;
  },
};

export const itemService = {
  create: async (data: {
    title: string;
    groupId: string;
    status?: string;
    priority?: string;
    startDate?: string;
    dueDate?: string;
    assignedTo?: string;
    description?: string;
  }): Promise<Item> => {
    const response = await api.post('/items', data);
    return response.data;
  },

  update: async (id: string, data: {
    title?: string;
    status?: string;
    priority?: string;
    startDate?: string | null;
    dueDate?: string | null;
    assignedTo?: string | null;
    description?: string;
    notes?: string | null;
    retainerHours?: number | null;
  }): Promise<Item> => {
    const response = await api.put(`/items/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/items/${id}`);
  },

  reorder: async (id: string, newPosition: number, newGroupId?: string): Promise<Item> => {
    const response = await api.put(`/items/${id}/reorder`, { newPosition, newGroupId });
    return response.data;
  },

  getMyItems: async (): Promise<Item[]> => {
    const response = await api.get('/items/my-items');
    return response.data;
  },
};

export const commentService = {
  getByItem: async (itemId: string): Promise<Comment[]> => {
    const response = await api.get(`/comments/item/${itemId}`);
    return response.data;
  },

  create: async (data: { content: string; itemId: string }): Promise<Comment> => {
    const response = await api.post('/comments', data);
    return response.data;
  },

  update: async (id: string, content: string): Promise<Comment> => {
    const response = await api.put(`/comments/${id}`, { content });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/comments/${id}`);
  },
};

export const checklistService = {
  getByItem: async (itemId: string): Promise<ChecklistItem[]> => {
    const response = await api.get(`/checklists/item/${itemId}`);
    return response.data;
  },

  create: async (data: { itemId: string; text: string }): Promise<ChecklistItem> => {
    const response = await api.post('/checklists', data);
    return response.data;
  },

  update: async (id: string, data: { text?: string; isDone?: boolean }): Promise<ChecklistItem> => {
    const response = await api.put(`/checklists/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/checklists/${id}`);
  },
};

export const activityService = {
  getByBoard: async (boardId: string, limit?: number): Promise<ActivityLog[]> => {
    const response = await api.get(`/activity/board/${boardId}`, {
      params: { limit: limit || 50 }
    });
    return response.data;
  },
};

export const notificationService = {
  getAll: async (unreadOnly?: boolean, limit?: number): Promise<Notification[]> => {
    const response = await api.get('/notifications', {
      params: { unreadOnly, limit: limit || 50 }
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get('/notifications/unread-count');
    return response.data.count;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read-all');
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },

  checkReminders: async (): Promise<void> => {
    await api.get('/notifications/check-reminders');
  },
};
