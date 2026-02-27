import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListTodo,
  LogOut,
  Pencil,
  Plus,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { itemService } from '../services';
import { boardService } from '../services/boardService';
import { workspaceService } from '../services/workspaceService';
import { Item } from '../types';
import { useAuthStore } from '../stores/authStore';
import { ItemDetailsModal } from '../components/ItemDetailsModal';

type ViewFilter = 'today' | 'upcoming' | 'overdue' | 'no_date' | 'all';
type LocalDraft = {
  id: string;
  title: string;
  status: string;
  priority: string;
  startDate?: string;
  dueDate?: string;
  description?: string;
  workspaceId?: string;
  boardId?: string;
  groupId?: string;
  createdAt: string;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const getDraftStorageKey = (userId?: string) => `desktop-task-drafts:${userId || 'anonymous'}`;

export const DesktopTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();

  const [selectedView, setSelectedView] = useState<ViewFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('all');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [localDrafts, setLocalDrafts] = useState<LocalDraft[]>([]);
  const [quickDraftTitle, setQuickDraftTitle] = useState('');
  const [draftEditingId, setDraftEditingId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newWorkspaceId, setNewWorkspaceId] = useState('');
  const [newBoardId, setNewBoardId] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [newStatus, setNewStatus] = useState('todo');
  const [newPriority, setNewPriority] = useState('medium');
  const [newStartDate, setNewStartDate] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(getDraftStorageKey(user?.id));
    if (!raw) {
      setLocalDrafts([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as LocalDraft[];
      setLocalDrafts(Array.isArray(parsed) ? parsed : []);
    } catch {
      setLocalDrafts([]);
    }
  }, [user?.id]);

  useEffect(() => {
    localStorage.setItem(getDraftStorageKey(user?.id), JSON.stringify(localDrafts));
  }, [localDrafts, user?.id]);

  const isForcedCollapsed = viewportWidth < 920;
  const sidebarCollapsed = isForcedCollapsed || isSidebarCollapsed;

  const { data: myItems, isLoading } = useQuery({
    queryKey: ['my-items'],
    queryFn: itemService.getMyItems
  });

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceService.getAll
  });

  const { data: workspaceBoards } = useQuery({
    queryKey: ['workspace-boards', newWorkspaceId],
    queryFn: () => boardService.getByWorkspace(newWorkspaceId),
    enabled: !!newWorkspaceId
  });

  const { data: selectedBoard } = useQuery({
    queryKey: ['board', newBoardId],
    queryFn: () => boardService.getById(newBoardId),
    enabled: !!newBoardId
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => itemService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
    }
  });

  const createItemMutation = useMutation({
    mutationFn: itemService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      setShowCreateModal(false);
      setDraftEditingId(null);
      setNewTitle('');
      setNewWorkspaceId('');
      setNewBoardId('');
      setNewGroupId('');
      setNewStatus('todo');
      setNewPriority('medium');
      setNewStartDate('');
      setNewDueDate('');
      setNewDescription('');
    }
  });

  const boardTree = useMemo(() => {
    const map = new Map<string, { workspaceName: string; boards: Map<string, { boardName: string; count: number }> }>();
    (myItems || []).forEach((item) => {
      const workspaceId = item.group?.board.workspace?.id;
      const workspaceName = item.group?.board.workspace?.name || 'Unknown workspace';
      const boardId = item.group?.board.id;
      const boardName = item.group?.board.name || 'Unknown board';
      if (!workspaceId || !boardId) {
        return;
      }
      if (!map.has(workspaceId)) {
        map.set(workspaceId, { workspaceName, boards: new Map() });
      }
      const workspaceEntry = map.get(workspaceId)!;
      const boardEntry = workspaceEntry.boards.get(boardId) || { boardName, count: 0 };
      boardEntry.count += 1;
      workspaceEntry.boards.set(boardId, boardEntry);
    });
    return Array.from(map.entries());
  }, [myItems]);

  const today = startOfDay(new Date());

  const matchesViewFilter = (startDateValue?: string, dueDateValue?: string) => {
    const startDate = startDateValue ? startOfDay(new Date(startDateValue)) : null;
    const dueDate = dueDateValue ? startOfDay(new Date(dueDateValue)) : null;

    if (selectedView === 'all') return true;
    if (selectedView === 'no_date') return !startDate && !dueDate;
    if (!startDate && !dueDate) return false;

    const start = startDate || dueDate!;
    const due = dueDate || startDate!;

    if (selectedView === 'overdue') return today > due;
    if (selectedView === 'today') return start <= today && due >= today;
    if (selectedView === 'upcoming') return start > today;
    return true;
  };

  const filteredItems = useMemo(() => {
    let items = [...(myItems || [])];

    if (selectedBoardId !== 'all') {
      items = items.filter((item) => item.group?.board.id === selectedBoardId);
    }

    if (searchText.trim()) {
      const query = searchText.trim().toLowerCase();
      items = items.filter((item) => {
        const boardName = item.group?.board.name?.toLowerCase() || '';
        const workspaceName = item.group?.board.workspace?.name?.toLowerCase() || '';
        return item.title.toLowerCase().includes(query) || boardName.includes(query) || workspaceName.includes(query);
      });
    }

    items = items.filter((item) => matchesViewFilter(item.startDate, item.dueDate));

    return items.sort((a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    });
  }, [myItems, selectedBoardId, searchText, selectedView, today]);

  const filteredDrafts = useMemo(() => {
    let drafts = [...localDrafts];

    if (selectedBoardId !== 'all') {
      drafts = drafts.filter((draft) => draft.boardId === selectedBoardId);
    }

    if (searchText.trim()) {
      const query = searchText.trim().toLowerCase();
      drafts = drafts.filter((draft) => draft.title.toLowerCase().includes(query));
    }

    drafts = drafts.filter((draft) => matchesViewFilter(draft.startDate, draft.dueDate));

    return drafts.sort((a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    });
  }, [localDrafts, selectedBoardId, searchText, selectedView, today]);

  const handleToggleDone = (item: Item) => {
    updateItemMutation.mutate({ id: item.id, data: { status: 'done' } });
  };

  const openCreateModal = () => {
    setDraftEditingId(null);
    setNewTitle('');
    setNewWorkspaceId('');
    setNewBoardId('');
    setNewGroupId('');
    setNewStatus('todo');
    setNewPriority('medium');
    setNewStartDate('');
    setNewDueDate('');
    setNewDescription('');
    setShowCreateModal(true);
  };

  const openDraftModal = (draft: LocalDraft) => {
    setDraftEditingId(draft.id);
    setNewTitle(draft.title);
    setNewWorkspaceId(draft.workspaceId || '');
    setNewBoardId(draft.boardId || '');
    setNewGroupId(draft.groupId || '');
    setNewStatus(draft.status || 'todo');
    setNewPriority(draft.priority || 'medium');
    setNewStartDate(draft.startDate || '');
    setNewDueDate(draft.dueDate || '');
    setNewDescription(draft.description || '');
    setShowCreateModal(true);
  };

  const handleQuickDraftCreate = () => {
    const trimmed = quickDraftTitle.trim();
    if (!trimmed) return;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newDraft: LocalDraft = {
      id,
      title: trimmed,
      status: 'todo',
      priority: 'medium',
      createdAt: new Date().toISOString()
    };
    setLocalDrafts((current) => [newDraft, ...current]);
    setQuickDraftTitle('');
    setSelectedView('all');
    setSelectedBoardId('all');
  };

  const handleDeleteDraft = (draftId: string) => {
    setLocalDrafts((current) => current.filter((draft) => draft.id !== draftId));
    if (draftEditingId === draftId) {
      setDraftEditingId(null);
      setShowCreateModal(false);
    }
  };

  const handleStartEditTitle = (item: Item) => {
    setEditingTitleId(item.id);
    setEditingTitle(item.title);
  };

  const handleSaveEditTitle = (itemId: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingTitleId(null);
      return;
    }
    updateItemMutation.mutate({ id: itemId, data: { title: trimmed } });
    setEditingTitleId(null);
  };

  const handleCreateTask = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim()) {
      return;
    }

    if (draftEditingId && !newGroupId) {
      setLocalDrafts((current) =>
        current.map((draft) =>
          draft.id === draftEditingId
            ? {
                ...draft,
                title: newTitle.trim(),
                status: newStatus,
                priority: newPriority,
                startDate: newStartDate || undefined,
                dueDate: newDueDate || undefined,
                description: newDescription || undefined,
                workspaceId: newWorkspaceId || undefined,
                boardId: newBoardId || undefined
              }
            : draft
        )
      );
      setShowCreateModal(false);
      setDraftEditingId(null);
      return;
    }

    if (!newGroupId) {
      return;
    }

    createItemMutation.mutate(
      {
        title: newTitle.trim(),
        groupId: newGroupId,
        status: newStatus,
        priority: newPriority,
        startDate: newStartDate || undefined,
        dueDate: newDueDate || undefined,
        description: newDescription || undefined,
        assignedTo: user?.id
      },
      {
        onSuccess: () => {
          if (draftEditingId) {
            setLocalDrafts((current) => current.filter((draft) => draft.id !== draftEditingId));
          }
        }
      }
    );
  };

  const viewCounts = useMemo(() => {
    const counts = {
      today: 0,
      upcoming: 0,
      overdue: 0,
      no_date: 0,
      all: (myItems || []).length + localDrafts.length
    };

    (myItems || []).forEach((item) => {
      const startDate = item.startDate ? startOfDay(new Date(item.startDate)) : null;
      const dueDate = item.dueDate ? startOfDay(new Date(item.dueDate)) : null;

      if (!startDate && !dueDate) {
        counts.no_date += 1;
        return;
      }

      const start = startDate || dueDate!;
      const due = dueDate || startDate!;

      if (today > due) {
        counts.overdue += 1;
      } else if (start <= today && due >= today) {
        counts.today += 1;
      } else if (start > today) {
        counts.upcoming += 1;
      }
    });

    localDrafts.forEach((draft) => {
      const startDate = draft.startDate ? startOfDay(new Date(draft.startDate)) : null;
      const dueDate = draft.dueDate ? startOfDay(new Date(draft.dueDate)) : null;

      if (!startDate && !dueDate) {
        counts.no_date += 1;
        return;
      }

      const start = startDate || dueDate!;
      const due = dueDate || startDate!;

      if (today > due) {
        counts.overdue += 1;
      } else if (start <= today && due >= today) {
        counts.today += 1;
      } else if (start > today) {
        counts.upcoming += 1;
      }
    });

    return counts;
  }, [myItems, localDrafts, today]);

  const filterEntries = [
    { key: 'all' as ViewFilter, label: 'All', count: viewCounts.all, icon: ListTodo },
    { key: 'today' as ViewFilter, label: 'Today', count: viewCounts.today, icon: Calendar },
    { key: 'upcoming' as ViewFilter, label: 'Upcoming', count: viewCounts.upcoming, icon: Clock3 },
    { key: 'overdue' as ViewFilter, label: 'Overdue', count: viewCounts.overdue, icon: AlertTriangle },
    { key: 'no_date' as ViewFilter, label: 'No Date', count: viewCounts.no_date, icon: Calendar }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login?client=desktop');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <div
        className="h-10 border-b border-secondary-200 bg-secondary-50 flex items-center justify-center text-xs font-semibold tracking-wide text-gray-600 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        INSAIDEM
      </div>
      <div
        className="grid flex-1 min-h-0"
        style={{ gridTemplateColumns: sidebarCollapsed ? '74px 1fr' : '300px 1fr' }}
      >
          <aside className="border-r border-secondary-200 bg-secondary-50 p-3 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              {!sidebarCollapsed ? (
                <>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
                    <p className="text-xs text-gray-500">{user?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isForcedCollapsed && (
                      <button
                        type="button"
                        onClick={() => setIsSidebarCollapsed(true)}
                        className="text-gray-500 hover:text-gray-700"
                        title="Collapse sidebar"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full flex flex-col items-center">
                  {!isForcedCollapsed && (
                    <button
                      type="button"
                      onClick={() => setIsSidebarCollapsed(false)}
                      className="text-gray-500 hover:text-gray-700"
                      title="Expand sidebar"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {!sidebarCollapsed && (
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  className="input pl-9"
                  placeholder="Search tasks"
                />
              </div>
            )}

            <div className="space-y-2 mb-6">
              {filterEntries.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => {
                    setSelectedView(entry.key as ViewFilter);
                    setSelectedBoardId('all');
                  }}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} rounded-lg px-3 py-2 text-sm transition-colors ${
                    selectedView === entry.key && selectedBoardId === 'all'
                      ? 'bg-primary-50 text-primary-800'
                      : 'text-gray-600 hover:bg-secondary-100'
                  }`}
                  title={entry.label}
                >
                  {!sidebarCollapsed ? (
                    <>
                      <span className="inline-flex items-center gap-2">
                        <entry.icon className="w-4 h-4" />
                        <span>{entry.label}</span>
                      </span>
                      <span className="font-semibold">{entry.count}</span>
                    </>
                  ) : (
                    <span className="relative inline-flex items-center justify-center">
                      <entry.icon className="w-4 h-4" />
                      <span className="absolute -top-2 -right-2 text-[10px] font-semibold min-w-4 h-4 rounded-full bg-secondary-200 text-gray-700 inline-flex items-center justify-center px-1">
                        {entry.count}
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {!sidebarCollapsed && (
              <>
                <div className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">Projects</div>
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {boardTree.map(([workspaceId, workspaceEntry]) => (
                    <div key={workspaceId}>
                      <div className="text-xs text-gray-500 mb-1">{workspaceEntry.workspaceName}</div>
                      <div className="space-y-1">
                        {Array.from(workspaceEntry.boards.entries()).map(([boardId, boardEntry]) => (
                          <button
                            key={boardId}
                            type="button"
                            onClick={() => {
                              setSelectedBoardId(boardId);
                              setSelectedView('all');
                            }}
                            className={`w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors ${
                              selectedBoardId === boardId
                                ? 'bg-primary-50 text-primary-800'
                                : 'text-gray-700 hover:bg-secondary-100'
                            }`}
                          >
                            <span>{boardEntry.boardName}</span>
                            <span className="float-right text-xs text-gray-500">{boardEntry.count}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className={`mt-auto pt-3 border-t border-secondary-200 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
              <button
                onClick={handleLogout}
                className={`text-gray-500 hover:text-gray-700 text-sm inline-flex items-center gap-2 ${sidebarCollapsed ? '' : 'px-2 py-1'}`}
                title="Log out"
                type="button"
              >
                <LogOut className="w-4 h-4" />
                {!sidebarCollapsed && <span>Log out</span>}
              </button>
            </div>
          </aside>

          <main className="p-4 overflow-auto">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{selectedBoardId === 'all' ? 'My Tasks' : 'Project Tasks'}</h2>
                <p className="text-sm text-gray-600 mt-1">{filteredItems.length + filteredDrafts.length} tasks</p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Task
              </button>
            </div>

            <div className="rounded-xl border border-secondary-200 overflow-hidden">
              <div className="border-b border-secondary-200 px-4 py-3 bg-secondary-50">
                <input
                  value={quickDraftTitle}
                  onChange={(event) => setQuickDraftTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleQuickDraftCreate();
                    }
                  }}
                  className="w-full bg-transparent outline-none text-sm"
                  placeholder="Add a task quickly and assign project later..."
                />
              </div>
              {filteredItems.length === 0 && filteredDrafts.length === 0 ? (
                <div className="p-10 text-center text-gray-500">No tasks found for this view.</div>
              ) : (
                <div>
                  {filteredDrafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="grid grid-cols-[32px_1fr_auto] items-start gap-3 border-b border-secondary-200 px-4 py-3 bg-secondary-50/70"
                    >
                      <span className="inline-flex h-5 w-5 rounded-full border border-secondary-300 mt-1" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-left font-medium text-gray-900">{draft.title}</span>
                          <span className="text-[10px] uppercase tracking-wide bg-secondary-200 text-gray-600 px-2 py-0.5 rounded-full">
                            Draft
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Local draft · not shared yet</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openDraftModal(draft)}
                          className="text-xs font-medium text-primary-700 hover:text-primary-800"
                        >
                          Publish
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[32px_1fr] items-start gap-3 border-b border-secondary-200 px-4 py-3"
                    >
                      <button type="button" onClick={() => handleToggleDone(item)} className="text-gray-400 hover:text-primary-700">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>

                      <div>
                        {editingTitleId === item.id ? (
                          <input
                            value={editingTitle}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            onBlur={() => handleSaveEditTitle(item.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') handleSaveEditTitle(item.id);
                              if (event.key === 'Escape') setEditingTitleId(null);
                            }}
                            className="input py-1"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEditTitle(item)}
                              className="text-left font-medium text-gray-900 hover:text-gray-700"
                            >
                              {item.title}
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveItem(item)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Edit task details"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {item.group?.board.workspace?.name} · {item.group?.board.name} · {item.group?.name}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-3 text-xs text-gray-600">
                          {item.dueDate && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(item.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <span className="uppercase tracking-wide">{item.priority}</span>
                          <span className="capitalize">{item.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 inline-flex items-center gap-2">
                <ListTodo className="w-5 h-5" />
                {draftEditingId ? 'Publish Draft' : 'New Task'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setDraftEditingId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} className="input" required />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Workspace</label>
                  <select
                    value={newWorkspaceId}
                    onChange={(event) => {
                      setNewWorkspaceId(event.target.value);
                      setNewBoardId('');
                      setNewGroupId('');
                    }}
                    className="input"
                    required={!draftEditingId}
                  >
                    <option value="">Select</option>
                    {(workspaces || []).map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
                  <select
                    value={newBoardId}
                    onChange={(event) => {
                      setNewBoardId(event.target.value);
                      setNewGroupId('');
                    }}
                    className="input"
                    required={!draftEditingId}
                    disabled={!newWorkspaceId}
                  >
                    <option value="">Select</option>
                    {(workspaceBoards || []).map((board) => (
                      <option key={board.id} value={board.id}>{board.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                  <select
                    value={newGroupId}
                    onChange={(event) => setNewGroupId(event.target.value)}
                    className="input"
                    required={!draftEditingId}
                    disabled={!newBoardId}
                  >
                    <option value="">Select</option>
                    {(selectedBoard?.groups || []).map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={newStatus} onChange={(event) => setNewStatus(event.target.value)} className="input">
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="stuck">Stuck</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={newPriority} onChange={(event) => setNewPriority(event.target.value)} className="input">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <input type="date" value={newStartDate} onChange={(event) => setNewStartDate(event.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due</label>
                  <input type="date" value={newDueDate} onChange={(event) => setNewDueDate(event.target.value)} className="input" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} className="input" rows={3} />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setDraftEditingId(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createItemMutation.isPending}>
                  {createItemMutation.isPending ? 'Saving...' : draftEditingId ? 'Save / Publish' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeItem && (
        <ItemDetailsModal
          item={activeItem}
          isOpen={Boolean(activeItem)}
          onClose={() => setActiveItem(null)}
          boardId={activeItem.group?.board.id || ''}
          boardDescription={activeItem.group?.board.workspace?.name}
        />
      )}
    </div>
  );
};
