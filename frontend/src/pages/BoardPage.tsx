import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { boardService } from '../services/boardService';
import { workspaceService } from '../services/workspaceService';
import { groupService } from '../services';
import { ArrowLeft, LayoutGrid, Calendar, Clock, Archive, Check, X } from 'lucide-react';
import { GroupComponent } from '../components/GroupComponent';
import { TimelineView } from '../components/TimelineView';
import { RetainerHoursView } from '../components/RetainerHoursView';
import { User } from '../types';

export const BoardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'timeline' | 'retainer' | 'archived'>('table');
  const [isEditingName, setIsEditingName] = useState(false);
  const [boardName, setBoardName] = useState('');

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', id],
    queryFn: () => boardService.getById(id!),
    enabled: !!id,
  });

  const { data: timelineBoard, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ['board', id, 'timeline'],
    queryFn: () => boardService.getById(id!, 'all'),
    enabled: !!id && viewMode === 'timeline',
  });

  const { data: archivedBoard, isLoading: isLoadingArchived } = useQuery({
    queryKey: ['board', id, 'archived'],
    queryFn: () => boardService.getById(id!, true),
    enabled: !!id && (viewMode === 'archived' || viewMode === 'retainer'),
  });

  const { data: membersData } = useQuery({
    queryKey: ['workspace-members', board?.workspaceId],
    queryFn: () => workspaceService.getMembers(board!.workspaceId),
    enabled: !!board?.workspaceId,
  });

  const createGroupMutation = useMutation({
    mutationFn: groupService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', id] });
      setShowCreateGroup(false);
      setGroupName('');
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: (data: { name?: string; isRetainer?: boolean }) => boardService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', id] });
      queryClient.invalidateQueries({ queryKey: ['board', id, 'archived'] });
      setIsEditingName(false);
    },
  });

  useEffect(() => {
    if (board?.name) {
      setBoardName(board.name);
    }
  }, [board?.name]);

  useEffect(() => {
    if (viewMode === 'retainer' && board?.isRetainer === false) {
      setViewMode('table');
    }
  }, [viewMode, board?.isRetainer]);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim() && id) {
      createGroupMutation.mutate({
        name: groupName,
        boardId: id,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (!board) {
    return <div>Board not found</div>;
  }

  const allMembers: User[] = [
    ...(membersData?.owner ? [membersData.owner] : []),
    ...(membersData?.members?.map(m => m.user) || []),
  ];

  const displayedBoard = viewMode === 'archived' || viewMode === 'retainer' ? archivedBoard : board;
  const timelineDisplayedBoard = timelineBoard || board;

  return (
    <div>
      <button
        onClick={() => navigate(`/workspaces/${board.workspaceId}`)}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to {board.workspace?.name}</span>
      </button>

      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start mb-8">
        <div>
          <div className="flex items-center space-x-3">
            {isEditingName ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  className="input py-1 text-lg font-semibold"
                />
                <button
                  onClick={() => {
                    if (boardName.trim()) {
                      updateBoardMutation.mutate({ name: boardName });
                    }
                  }}
                  className="text-primary-700 hover:text-primary-800"
                  title="Save"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setBoardName(board.name);
                    setIsEditingName(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Cancel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <h1
                className="text-3xl font-bold text-gray-900 cursor-text hover:text-gray-700"
                onClick={() => setIsEditingName(true)}
              >
                {board.name}
              </h1>
            )}
          </div>
          {board.description && (
            <p className="text-gray-600 mt-2">{board.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary-50 text-primary-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-primary-50 text-primary-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Timeline</span>
            </button>
            <button
              onClick={() => setViewMode('retainer')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'retainer'
                  ? 'bg-primary-50 text-primary-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              } ${board.isRetainer ? '' : 'opacity-60'}`}
              disabled={!board.isRetainer}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Retainer</span>
            </button>
            <button
              onClick={() => setViewMode('archived')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'archived'
                  ? 'bg-primary-50 text-primary-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">Archived</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'timeline' && (
        <>
          {isLoadingTimeline ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
            </div>
          ) : (
            <TimelineView board={timelineDisplayedBoard} allMembers={allMembers} />
          )}
        </>
      )}

      {viewMode === 'retainer' && (
        <>
          {isLoadingArchived ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
            </div>
          ) : displayedBoard ? (
            <RetainerHoursView board={displayedBoard} />
          ) : null}
        </>
      )}

      {viewMode === 'archived' && (
        <>
          {isLoadingArchived ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
            </div>
          ) : (
            <>
              {displayedBoard?.groups && displayedBoard.groups.length === 0 ? (
                <div className="text-center py-12 card">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No archived tasks</h3>
                  <p className="text-gray-600">Completed tasks will appear here.</p>
                </div>
              ) : (
                <div>
                  {displayedBoard?.groups
                    ?.filter((group) => (group.items?.length || 0) > 0)
                    .map((group) => (
                    <GroupComponent
                      key={group.id}
                      group={group}
                      boardId={board.id}
                      workspaceMembers={allMembers}
                      isRetainerBoard={board.isRetainer}
                      isArchivedView
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {viewMode === 'table' && (
        <>
          <div>
            {board.groups && board.groups.length === 0 ? (
              <div className="text-center py-12 card">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
                <p className="text-gray-600 mb-6">Create your first group to start organizing items</p>
              </div>
            ) : (
              board.groups?.map((group) => (
                <GroupComponent
                  key={group.id}
                  group={group}
                  boardId={board.id}
                  workspaceMembers={allMembers}
                  isRetainerBoard={board.isRetainer}
                />
              ))
            )}
            <div className="card !p-0 mt-4">
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-full px-4 py-3 text-left text-gray-500 hover:text-gray-700 hover:bg-secondary-50 border border-dashed border-gray-200"
              >
                + New group
              </button>
            </div>
          </div>
        </>
      )}

      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="input"
                  placeholder="Tasks"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setGroupName('');
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isPending}
                  className="flex-1 btn btn-primary"
                >
                  {createGroupMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
