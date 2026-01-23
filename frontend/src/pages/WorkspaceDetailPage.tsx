import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { workspaceService } from '../services/workspaceService';
import { boardService } from '../services/boardService';
import { Plus, Users, FolderKanban, UserPlus, ArrowLeft, Pencil, Check, X, Calendar, Trash2, Settings } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { WorkspaceRoadmapView } from '../components/WorkspaceRoadmapView';

export const WorkspaceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [boardIsRetainer, setBoardIsRetainer] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [viewMode, setViewMode] = useState<'boards' | 'roadmap'>('boards');
  const [isEditingName, setIsEditingName] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [boardToDelete, setBoardToDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmBoardName, setConfirmBoardName] = useState('');
  const [boardToConfigure, setBoardToConfigure] = useState<{
    id: string;
    name: string;
    description?: string | null;
    isRetainer?: boolean;
  } | null>(null);

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['workspace', id],
    queryFn: () => workspaceService.getById(id!),
    enabled: !!id,
  });

  const { data: roadmapEntries, isLoading: isLoadingRoadmap } = useQuery({
    queryKey: ['workspace-roadmap', id],
    queryFn: () => workspaceService.getRoadmap(id!),
    enabled: !!id && viewMode === 'roadmap',
  });

  useEffect(() => {
    if (workspace?.name) {
      setWorkspaceName(workspace.name);
    }
  }, [workspace?.name]);

  const createBoardMutation = useMutation({
    mutationFn: boardService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', id] });
      setShowCreateBoard(false);
      setBoardName('');
      setBoardDescription('');
      setBoardIsRetainer(false);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ email }: { email: string }) => workspaceService.addMember(id!, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', id] });
      setShowAddMember(false);
      setMemberEmail('');
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: (data: { name?: string }) => workspaceService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', id] });
      setIsEditingName(false);
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: (boardId: string) => boardService.delete(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', id] });
      setBoardToDelete(null);
      setConfirmBoardName('');
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: ({
      boardId,
      isRetainer,
      description
    }: {
      boardId: string;
      isRetainer: boolean;
      description?: string;
    }) => boardService.update(boardId, { isRetainer, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', id] });
      setBoardToConfigure(null);
    },
  });

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (boardName.trim() && id) {
      createBoardMutation.mutate({
        name: boardName,
        description: boardDescription,
        workspaceId: id,
        isRetainer: boardIsRetainer,
      });
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (memberEmail.trim()) {
      addMemberMutation.mutate({ email: memberEmail });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (!workspace) {
    return <div>Workspace not found</div>;
  }

  const isOwner = workspace.ownerId === user?.id;
  const totalMembers = (workspace.members?.length || 0) + 1;

  return (
    <div>
      <button
        onClick={() => navigate('/workspaces')}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Workspaces</span>
      </button>

      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start mb-8">
        <div>
          <div className="flex items-center space-x-3">
            {isEditingName ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="input py-1 text-lg font-semibold"
                />
                <button
                  onClick={() => {
                    if (workspaceName.trim()) {
                      updateWorkspaceMutation.mutate({ name: workspaceName });
                    }
                  }}
                  className="text-primary-700 hover:text-primary-800"
                  title="Save"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setWorkspaceName(workspace.name);
                    setIsEditingName(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Cancel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-gray-900">{workspace.name}</h1>
                {isOwner && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Edit workspace name"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
          {workspace.description && (
            <p className="text-gray-600 mt-2">{workspace.description}</p>
          )}
          <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{totalMembers} members</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('boards')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'boards'
                  ? 'bg-primary-50 text-primary-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span className="hidden sm:inline">Boards</span>
            </button>
            <button
              onClick={() => setViewMode('roadmap')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'roadmap'
                  ? 'bg-primary-50 text-primary-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Roadmap</span>
            </button>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowAddMember(true)}
              className="btn btn-secondary flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          )}
          <button
            onClick={() => setShowCreateBoard(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Board</span>
          </button>
        </div>
      </div>

      <div className="mb-8">
        {viewMode === 'roadmap' ? (
          <>
            {isLoadingRoadmap ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
              </div>
            ) : (
              <WorkspaceRoadmapView entries={roadmapEntries || []} />
            )}
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Boards</h2>
            {workspace.boards && workspace.boards.length === 0 ? (
              <div className="text-center py-12 card">
                <FolderKanban className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No boards yet</h3>
                <p className="text-gray-600 mb-6">Create your first board to start organizing work</p>
                <button onClick={() => setShowCreateBoard(true)} className="btn btn-primary">
                  Create Board
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workspace.boards?.map((board) => (
                  <div
                    key={board.id}
                    onClick={() => navigate(`/boards/${board.id}`)}
                    className="card hover:shadow-md transition-shadow cursor-pointer relative"
                  >
                    {isOwner && (
                      <div className="absolute top-4 right-4 flex items-center space-x-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setBoardToConfigure({
                              id: board.id,
                              name: board.name,
                              description: board.description,
                              isRetainer: board.isRetainer
                            });
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          title="Board settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setBoardToDelete({ id: board.id, name: board.name });
                          }}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete board"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{board.name}</h3>
                    {board.description && (
                      <p className="text-gray-600 text-sm mb-4">{board.description}</p>
                    )}
                    <div className="text-sm text-gray-500">
                      {board._count?.groups || 0} groups
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showCreateBoard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Board</h2>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Board Name
                </label>
                <input
                  type="text"
                  required
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  className="input"
                  placeholder="Project Board"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retainer Board
                  </label>
                  <input
                    type="checkbox"
                    checked={boardIsRetainer}
                    onChange={(e) => setBoardIsRetainer(e.target.checked)}
                    className="h-4 w-4 text-primary-700 focus:ring-primary-600 border-secondary-300"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Require hours when completing tasks.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={boardDescription}
                  onChange={(e) => setBoardDescription(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Example: Project type and stack (WordPress + ACF, React + Node, Shopify), hosting, SEO focus."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateBoard(false);
                    setBoardName('');
                    setBoardDescription('');
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBoardMutation.isPending}
                  className="flex-1 btn btn-primary"
                >
                  {createBoardMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Member</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="input"
                  placeholder="colleague@example.com"
                />
              </div>
              {addMemberMutation.isError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  Failed to add member. Make sure the email is registered.
                </div>
              )}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false);
                    setMemberEmail('');
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  className="flex-1 btn btn-primary"
                >
                  {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {boardToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Board</h2>
            <p className="text-sm text-gray-600 mb-4">
              Type <span className="font-semibold text-gray-900">{boardToDelete.name}</span> to confirm deletion.
            </p>
            <input
              type="text"
              value={confirmBoardName}
              onChange={(e) => setConfirmBoardName(e.target.value)}
              className="input mb-4"
              placeholder="Board name"
            />
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setBoardToDelete(null);
                  setConfirmBoardName('');
                }}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteBoardMutation.mutate(boardToDelete.id)}
                disabled={confirmBoardName !== boardToDelete.name || deleteBoardMutation.isPending}
                className="flex-1 btn btn-primary"
              >
                {deleteBoardMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {boardToConfigure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Board Settings</h2>
            <p className="text-sm text-gray-600 mb-4">{boardToConfigure.name}</p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={boardToConfigure.description || ''}
                onChange={(e) =>
                  setBoardToConfigure((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev
                  )
                }
                className="input"
                rows={3}
                placeholder="Example: Project type and stack (WordPress + ACF, React + Node, Shopify), hosting, SEO focus."
              />
            </div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm font-medium text-gray-900">Retainer Board</div>
                <div className="text-xs text-gray-500">Require hours when completing tasks.</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(boardToConfigure.isRetainer)}
                onChange={(e) =>
                  setBoardToConfigure((prev) =>
                    prev ? { ...prev, isRetainer: e.target.checked } : prev
                  )
                }
                className="h-4 w-4 text-primary-700 focus:ring-primary-600 border-secondary-300"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setBoardToConfigure(null)}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  updateBoardMutation.mutate({
                    boardId: boardToConfigure.id,
                    isRetainer: Boolean(boardToConfigure.isRetainer),
                    description: boardToConfigure.description || ''
                  })
                }
                disabled={updateBoardMutation.isPending}
                className="flex-1 btn btn-primary"
              >
                {updateBoardMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
