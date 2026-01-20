import api from '../lib/api';
import { BoardRoadmapEntry, Workspace, WorkspaceMember } from '../types';

export const workspaceService = {
  getAll: async (): Promise<Workspace[]> => {
    const response = await api.get('/workspaces');
    return response.data;
  },

  getById: async (id: string): Promise<Workspace> => {
    const response = await api.get(`/workspaces/${id}`);
    return response.data;
  },

  create: async (data: { name: string; description?: string }): Promise<Workspace> => {
    const response = await api.post('/workspaces', data);
    return response.data;
  },

  update: async (id: string, data: { name?: string; description?: string }): Promise<Workspace> => {
    const response = await api.put(`/workspaces/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${id}`);
  },

  addMember: async (id: string, email: string, role?: string): Promise<WorkspaceMember> => {
    const response = await api.post(`/workspaces/${id}/members`, { email, role });
    return response.data;
  },

  removeMember: async (workspaceId: string, memberId: string): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  },

  getMembers: async (id: string): Promise<{ owner: any; members: WorkspaceMember[] }> => {
    const response = await api.get(`/workspaces/${id}/members`);
    return response.data;
  },

  getRoadmap: async (id: string): Promise<BoardRoadmapEntry[]> => {
    const response = await api.get(`/workspaces/${id}/roadmap`);
    return response.data;
  },
};
