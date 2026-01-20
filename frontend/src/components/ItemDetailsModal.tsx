import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Link2, List, ListOrdered, Plus, Trash2, Underline, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checklistService, commentService, itemService } from '../services';
import { ChecklistItem, Comment, Item } from '../types';

interface ItemDetailsModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({ item, isOpen, onClose, boardId }) => {
  const queryClient = useQueryClient();
  const [descriptionHtml, setDescriptionHtml] = useState(item.description || item.notes || '');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newComment, setNewComment] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isHoveringLink, setIsHoveringLink] = useState(false);
  const [linkTooltipPos, setLinkTooltipPos] = useState<{ x: number; y: number } | null>(null);
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
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { text?: string; isDone?: boolean } }) =>
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

  const handleSaveDescription = () => {
    const html = editorRef.current?.innerHTML || '';
    setDescriptionHtml(html);
    setSaveState('saving');
    updateItemMutation.mutate({ description: html });
  };

  useEffect(() => {
    if (isOpen) {
      setDescriptionHtml(item.description || item.notes || '');
      if (editorRef.current) {
        editorRef.current.innerHTML = item.description || item.notes || '';
      }
      setSaveState('idle');
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
            </div>
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
                    createChecklistMutation.mutate({ itemId: item.id, text: newChecklistText.trim() });
                  }
                }}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add item</span>
              </button>
            </div>
            <div className="space-y-2">
              {(checklist || []).map((checkItem: ChecklistItem) => (
                <div key={checkItem.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <label className="flex items-center gap-3 text-sm text-gray-700 flex-1">
                    <input
                      type="checkbox"
                      checked={checkItem.isDone}
                      onChange={(e) =>
                        updateChecklistMutation.mutate({ id: checkItem.id, data: { isDone: e.target.checked } })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className={checkItem.isDone ? 'line-through text-gray-400' : ''}>
                      {checkItem.text}
                    </span>
                  </label>
                  <button
                    onClick={() => deleteChecklistMutation.mutate(checkItem.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  className="input flex-1"
                  placeholder="Add checklist item..."
                />
                <button
                  onClick={() => {
                    if (newChecklistText.trim()) {
                      createChecklistMutation.mutate({ itemId: item.id, text: newChecklistText.trim() });
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
                <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
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
