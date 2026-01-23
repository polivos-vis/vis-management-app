import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bold, Italic, Link2, List, ListOrdered, Pencil, Plus, Trash2, Underline, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiService, checklistService, commentService, itemService } from '../services';
import { AiBriefResponse, ChecklistItem, Comment, Item } from '../types';
import { useAuthStore } from '../stores/authStore';

interface ItemDetailsModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardDescription?: string;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  item,
  isOpen,
  onClose,
  boardId,
  boardDescription
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [_descriptionHtml, setDescriptionHtml] = useState(item.description || item.notes || '');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistHours, setNewChecklistHours] = useState('');
  const [newComment, setNewComment] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');
  const [editingChecklistHours, setEditingChecklistHours] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isHoveringLink, setIsHoveringLink] = useState(false);
  const [linkTooltipPos, setLinkTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const { data: checklist } = useQuery({
    queryKey: ['checklist', item.id],
    queryFn: () => checklistService.getByItem(item.id),
    enabled: isOpen,
  });

  const { data: comments } = useQuery({
    queryKey: ['comments', item.id],
    queryFn: () => commentService.getByItem(item.id),
    enabled: isOpen,
  });

  const updateItemMutation = useMutation({
    mutationFn: (data: { description?: string }) => itemService.update(item.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'archived'] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'timeline'] });
      setSaveState('saved');
    },
    onError: () => {
      setSaveState('error');
    }
  });

  const createChecklistMutation = useMutation({
    mutationFn: checklistService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', item.id] });
      setNewChecklistText('');
      setNewChecklistHours('');
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { text?: string; isDone?: boolean; hours?: number | null } }) =>
      checklistService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', item.id] });
    },
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: checklistService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', item.id] });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: (content: string) => commentService.create({ content, itemId: item.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', item.id] });
      setNewComment('');
    },
  });

  const aiBriefMutation = useMutation({
    mutationFn: (payload: { inputText: string; context?: string }) => aiService.generateBrief(payload)
  });

  const handleSaveDescription = () => {
    const html = editorRef.current?.innerHTML || '';
    setDescriptionHtml(html);
    setSaveState('saving');
    updateItemMutation.mutate({ description: html });
  };

  const parseHours = (value: string): number | null => {
    if (value.trim() === '') {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    if (parsed < 0) {
      return null;
    }
    return parsed;
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const renderList = (items: string[]) =>
    items.map((itemText) => `<li>${escapeHtml(itemText)}</li>`).join('');

  const buildBriefHtml = (brief: AiBriefResponse) => {
    const blocks: string[] = [];
    blocks.push(`<p><strong>Resumen</strong></p><p>${escapeHtml(brief.summary)}</p>`);
    blocks.push(
      `<p><strong>Explicacion amigable</strong></p><p>${escapeHtml(brief.friendlyExplanation)}</p>`
    );
    if (brief.implementationNotes) {
      blocks.push(
        `<p><strong>Como se implementa</strong></p><p>${escapeHtml(brief.implementationNotes)}</p>`
      );
    }
    blocks.push(`<p><strong>Tipo de tarea</strong></p><p>${escapeHtml(brief.taskType)}</p>`);
    const roleLine = brief.roleReason
      ? `${brief.role} - ${brief.roleReason}`
      : brief.role;
    blocks.push(`<p><strong>Rol sugerido</strong></p><p>${escapeHtml(roleLine)}</p>`);

    if (brief.steps.length > 0) {
      blocks.push(`<p><strong>Pasos sugeridos</strong></p><ul>${renderList(brief.steps)}</ul>`);
    }
    if (brief.acceptanceCriteria.length > 0) {
      blocks.push(
        `<p><strong>Criterios de aceptacion</strong></p><ul>${renderList(brief.acceptanceCriteria)}</ul>`
      );
    }
    if (brief.questions.length > 0) {
      blocks.push(
        `<p><strong>Preguntas pendientes</strong></p><ul>${renderList(brief.questions)}</ul>`
      );
    }

    return blocks.join('');
  };

  const handleGenerateBrief = async () => {
    const trimmed = aiInput.trim();
    if (trimmed.length < 10) {
      setAiError('Add more detail to generate the brief.');
      return;
    }
    if (!user?.hasGroqApiKey) {
      setAiError('Configure your Groq API key before generating the brief.');
      return;
    }
    setAiError(null);
    try {
      const brief = await aiBriefMutation.mutateAsync({
        inputText: trimmed,
        context: boardDescription
      });
      const html = buildBriefHtml(brief);
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
      }
      setDescriptionHtml(html);
      setSaveState('saving');
      updateItemMutation.mutate({ description: html });
      if (brief.steps.length > 0) {
        await Promise.all(
          brief.steps.map((step) =>
            checklistService.create({
              itemId: item.id,
              text: step
            })
          )
        );
        queryClient.invalidateQueries({ queryKey: ['checklist', item.id] });
      }
      setAiInput('');
      setIsAiPanelOpen(false);
    } catch (error) {
      setAiError('Could not generate the brief. Try again.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDescriptionHtml(item.description || item.notes || '');
      if (editorRef.current) {
        editorRef.current.innerHTML = item.description || item.notes || '';
      }
      setSaveState('idle');
      setEditingChecklistId(null);
    }
  }, [isOpen, item.description, item.notes]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const timeout = window.setTimeout(() => {
      setSaveState('idle');
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [saveState]);

  const ensureEditorFocus = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    if (!selection || !editor.contains(selection.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  const applyCommand = (command: string) => {
    ensureEditorFocus();
    document.execCommand(command);
    if (editorRef.current) {
      setDescriptionHtml(editorRef.current.innerHTML);
    }
  };

  const handleAddLink = () => {
    const url = window.prompt('Enter URL');
    if (!url) return;
    ensureEditorFocus();
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().length > 0;
    if (hasSelection) {
      document.execCommand('createLink', false, url);
    } else {
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${url}" target="_blank" rel="noreferrer">${url}</a>`
      );
    }
    if (editorRef.current) {
      setDescriptionHtml(editorRef.current.innerHTML);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{item.title}</h2>
            <p className="text-sm text-gray-500">
              {item.group?.board.name} · {item.group?.name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Description</h3>
              <button
                type="button"
                onClick={() => setIsAiPanelOpen((prev) => !prev)}
                className="text-sm text-primary-700 hover:text-primary-800"
              >
                {isAiPanelOpen ? 'Hide AI brief' : 'Generate AI brief'}
              </button>
            </div>
            {isAiPanelOpen && (
              <div className="mb-3 rounded-lg border border-secondary-200 bg-secondary-50 p-3 space-y-3">
                {!user?.hasGroqApiKey && (
                  <div className="rounded-md border border-secondary-200 bg-white p-3 text-xs text-gray-600">
                    To generate a brief, configure your Groq API key in{' '}
                    <Link to="/settings" className="text-primary-700 hover:text-primary-800 underline">
                      Settings
                    </Link>
                    .
                  </div>
                )}
                {user?.hasGroqApiKey && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      Paste the client request and context
                    </label>
                    <textarea
                      value={aiInput}
                      onChange={(event) => setAiInput(event.target.value)}
                      rows={4}
                      className="input mt-2"
                      placeholder="Describe the request, goals, and any key details..."
                    />
                  </div>
                )}
                {aiError && <p className="text-xs text-red-600">{aiError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiPanelOpen(false);
                      setAiError(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateBrief}
                    className="btn btn-primary"
                    disabled={aiBriefMutation.isPending || !user?.hasGroqApiKey}
                  >
                  {aiBriefMutation.isPending ? 'Generating...' : 'Generate brief'}
                  </button>
                </div>
              </div>
            )}
            <div className="border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 text-gray-500">
                <button
                  type="button"
                  onClick={() => applyCommand('bold')}
                  onMouseDown={(event) => event.preventDefault()}
                  className="hover:text-gray-700"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => applyCommand('italic')}
                  onMouseDown={(event) => event.preventDefault()}
                  className="hover:text-gray-700"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => applyCommand('underline')}
                  onMouseDown={(event) => event.preventDefault()}
                  className="hover:text-gray-700"
                  title="Underline"
                >
                  <Underline className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-gray-200" />
                <button
                  type="button"
                  onClick={() => applyCommand('insertUnorderedList')}
                  onMouseDown={(event) => event.preventDefault()}
                  className="hover:text-gray-700"
                  title="Bulleted list"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => applyCommand('insertOrderedList')}
                  onMouseDown={(event) => event.preventDefault()}
                  className="hover:text-gray-700"
                  title="Numbered list"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-gray-200" />
                <button
                  type="button"
                  onClick={handleAddLink}
                  onMouseDown={(event) => event.preventDefault()}
                  className="hover:text-gray-700"
                  title="Insert link"
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
              <div
                ref={editorRef}
                contentEditable
                onInput={(event) => setDescriptionHtml((event.target as HTMLDivElement).innerHTML)}
                onClick={(event) => {
                  const target = event.target as HTMLElement | null;
                  const link = target?.closest('a') as HTMLAnchorElement | null;
                  if (!link?.href) return;
                  if (!(event.metaKey || event.ctrlKey)) return;
                  event.preventDefault();
                  event.stopPropagation();
                  window.open(link.href, '_blank', 'noreferrer');
                }}
                onMouseOver={(event) => {
                  const target = event.target as HTMLElement | null;
                  const isLink = !!target?.closest('a');
                  setIsHoveringLink(isLink);
                  if (!isLink) {
                    setLinkTooltipPos(null);
                  }
                }}
                onMouseMove={(event) => {
                  if (!isHoveringLink) return;
                  setLinkTooltipPos({ x: event.clientX + 10, y: event.clientY + 12 });
                }}
                onMouseOut={() => {
                  setIsHoveringLink(false);
                  setLinkTooltipPos(null);
                }}
                className="w-full p-3 text-sm outline-none rounded-b-lg min-h-[140px] desc-editor"
                data-placeholder="Add a description..."
                suppressContentEditableWarning
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleSaveDescription}
                className="btn btn-primary"
              >
                {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Save'}
              </button>
              {saveState === 'saved' && (
                <span className="text-sm text-green-600">Saved</span>
              )}
              {saveState === 'error' && (
                <span className="text-sm text-red-600">Save failed</span>
              )}
            </div>
            {isHoveringLink && linkTooltipPos && (
              <div
                className="fixed z-[60] rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg"
                style={{ left: linkTooltipPos.x, top: linkTooltipPos.y }}
              >
                Cmd/Ctrl + click to open
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Checklist</h3>
              <button
                onClick={() => {
                  if (newChecklistText.trim()) {
                    const hoursValue = parseHours(newChecklistHours);
                    createChecklistMutation.mutate({
                      itemId: item.id,
                      text: newChecklistText.trim(),
                      ...(hoursValue !== null ? { hours: hoursValue } : {})
                    });
                  }
                }}
                className="text-sm text-primary-700 hover:text-primary-800 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add item</span>
              </button>
            </div>
            <div className="space-y-2">
              {(checklist || []).map((checkItem: ChecklistItem) => {
                const isEditing = editingChecklistId === checkItem.id;
                return (
                  <div
                    key={checkItem.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between bg-secondary-50 rounded-lg px-3 py-2 gap-3"
                  >
                    <label className="flex flex-1 flex-wrap items-center gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={checkItem.isDone}
                        onChange={(e) =>
                          updateChecklistMutation.mutate({ id: checkItem.id, data: { isDone: e.target.checked } })
                        }
                        className="h-4 w-4 rounded border-secondary-300"
                      />
                      {isEditing ? (
                        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            value={editingChecklistText}
                            onChange={(e) => setEditingChecklistText(e.target.value)}
                            className="input py-1 text-sm flex-1 min-w-[12rem]"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            value={editingChecklistHours}
                            onChange={(e) => setEditingChecklistHours(e.target.value)}
                            className="input py-1 text-sm w-full sm:w-28"
                            placeholder="Hours"
                          />
                        </div>
                      ) : (
                        <span className={checkItem.isDone ? 'line-through text-gray-400' : ''}>
                          {checkItem.text}
                        </span>
                      )}
                      {!isEditing && checkItem.hours !== null && checkItem.hours !== undefined ? (
                        <span className="text-xs font-semibold text-secondary-900 bg-primary-100 px-2 py-0.5 rounded-full">
                          {checkItem.hours}h
                        </span>
                      ) : null}
                    </label>
                    <div className="flex items-center gap-2 sm:pl-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => {
                              const trimmedText = editingChecklistText.trim();
                              if (!trimmedText) {
                                return;
                              }
                              const hoursValue = parseHours(editingChecklistHours);
                              updateChecklistMutation.mutate({
                                id: checkItem.id,
                                data: {
                                  text: trimmedText,
                                  ...(hoursValue !== null ? { hours: hoursValue } : {})
                                }
                              });
                              setEditingChecklistId(null);
                            }}
                            className="text-primary-700 hover:text-primary-800 text-xs font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingChecklistId(null)}
                            className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingChecklistId(checkItem.id);
                              setEditingChecklistText(checkItem.text);
                              setEditingChecklistHours(
                                checkItem.hours !== null && checkItem.hours !== undefined ? String(checkItem.hours) : ''
                              );
                            }}
                            className="text-gray-400 hover:text-primary-700"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteChecklistMutation.mutate(checkItem.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  className="input flex-1"
                  placeholder="Add checklist item..."
                />
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={newChecklistHours}
                  onChange={(e) => setNewChecklistHours(e.target.value)}
                  className="input w-full sm:w-28"
                  placeholder="Hours"
                />
                <button
                  onClick={() => {
                    if (newChecklistText.trim()) {
                      const hoursValue = parseHours(newChecklistHours);
                      createChecklistMutation.mutate({
                        itemId: item.id,
                        text: newChecklistText.trim(),
                        ...(hoursValue !== null ? { hours: hoursValue } : {})
                      });
                    }
                  }}
                  className="btn btn-primary"
                >
                  Add
                </button>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Comments</h3>
            </div>
            <div className="space-y-3">
              {(comments || []).map((comment: Comment) => (
                <div key={comment.id} className="bg-secondary-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{comment.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {comment.user?.name || 'User'} · {new Date(comment.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="input w-full resize-none"
                placeholder="Write a comment..."
              />
              <button
                onClick={() => {
                  if (newComment.trim()) {
                    createCommentMutation.mutate(newComment.trim());
                  }
                }}
                className="btn btn-primary"
              >
                Add comment
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
