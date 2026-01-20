import React, { useEffect, useState } from 'react';
import { Group, User } from '../types';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupService, itemService } from '../services';
import { ItemRow } from './ItemRow';

interface GroupComponentProps {
  group: Group;
  boardId: string;
  workspaceMembers: User[];
  isRetainerBoard?: boolean;
  isArchivedView?: boolean;
}

export const GroupComponent: React.FC<GroupComponentProps> = ({
  group,
  boardId,
  workspaceMembers,
  isRetainerBoard,
  isArchivedView
}) => {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const queryClient = useQueryClient();

  const createItemMutation = useMutation({
    mutationFn: itemService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setNewItemTitle('');
      setIsAddingItem(false);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: () => groupService.delete(group.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: (data: { name: string }) => groupService.update(group.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setIsEditingName(false);
    },
  });

  useEffect(() => {
    setGroupName(group.name);
  }, [group.name]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemTitle.trim()) {
      createItemMutation.mutate({
        title: newItemTitle,
        groupId: group.id,
      });
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center space-x-2">
          {isEditingName && !isArchivedView ? (
            <>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="input py-1 text-sm font-semibold"
              />
              <button
                onClick={() => {
                  if (groupName.trim()) {
                    updateGroupMutation.mutate({ name: groupName });
                  }
                }}
                className="text-primary-600 hover:text-primary-700"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setGroupName(group.name);
                  setIsEditingName(false);
                }}
                className="text-gray-400 hover:text-gray-600"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <h3
              className={`text-lg font-semibold text-gray-900 ${isArchivedView ? 'cursor-default' : 'cursor-text hover:text-gray-700'}`}
              onClick={() => {
                if (!isArchivedView) {
                  setIsEditingName(true);
                }
              }}
            >
              {group.name}
            </h3>
          )}
        </div>
        {!isArchivedView && (
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this group?')) {
                deleteGroupMutation.mutate();
              }
            }}
            className="text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="card !p-0">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
          <div className="col-span-2">Title</div>
          <div className="col-span-3">Notes</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-1">Assignee</div>
          <div className="col-span-1">Start</div>
          <div className="col-span-1">Due</div>
          <div className="col-span-1"></div>
        </div>

        {group.items?.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            boardId={boardId}
            workspaceMembers={workspaceMembers}
            isRetainerBoard={isRetainerBoard}
            isArchivedView={isArchivedView}
          />
        ))}

        {!isArchivedView && isAddingItem ? (
          <form onSubmit={handleAddItem} className="px-4 py-3 border-t border-gray-100">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Item title..."
                className="input flex-1"
                autoFocus
              />
              <button type="submit" className="btn btn-primary">
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingItem(false);
                  setNewItemTitle('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : !isArchivedView ? (
          <button
            onClick={() => setIsAddingItem(true)}
            className="w-full px-4 py-3 text-left text-gray-600 hover:bg-gray-50 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};
