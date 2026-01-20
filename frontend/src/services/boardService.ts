import api from '../lib/api';
import { Board } from '../types';

export const boardService = {
  getByWorkspace: async (workspaceId: string): Promise<Board[]> => {
    const response = await api.get(`/boards/workspace/${workspaceId}`);
    return response.data;
  },

  getById: async (id: string, archived?: boolean | 'all'): Promise<Board> => {
    const params = archived ? { archived } : undefined;
    const response = await api.get(`/boards/${id}`, { params });
    return response.data;
  },

  create: async (data: { name: string; description?: string; workspaceId: string; isRetainer?: boolean }): Promise<Board> => {
    const response = await api.post('/boards', data);
    return response.data;
  },

  update: async (id: string, data: { name?: string; description?: string; isRetainer?: boolean }): Promise<Board> => {
    const response = await api.put(`/boards/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/boards/${id}`);
  },
};
