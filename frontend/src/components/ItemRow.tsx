import React, { useState } from 'react';
import { Item, User } from '../types';
import { FileText, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { itemService } from '../services';
import { ItemDetailsModal } from './ItemDetailsModal';

interface ItemRowProps {
  item: Item;
  boardId: string;
  workspaceMembers: User[];
  isRetainerBoard?: boolean;
  isArchivedView?: boolean;
}

const statusOptions = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'done', label: 'Done', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'complete', label: 'Complete', color: 'bg-green-100 text-green-700' },
  { value: 'stuck', label: 'Stuck', color: 'bg-red-100 text-red-700' },
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

export const ItemRow: React.FC<ItemRowProps> = ({ item, boardId, workspaceMembers, isRetainerBoard, isArchivedView }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [showDetails, setShowDetails] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [hoursValue, setHoursValue] = useState(
    item.retainerHours !== null && item.retainerHours !== undefined ? String(item.retainerHours) : ''
  );
  const queryClient = useQueryClient();
  const readOnly = isArchivedView === true;

  const updateMutation = useMutation({
    mutationFn: (data: any) => itemService.update(item.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'archived'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => itemService.delete(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId, 'archived'] });
    },
  });

  const handleTitleSave = () => {
    if (title.trim() && title !== item.title) {
      updateMutation.mutate({ title });
    }
    setIsEditing(false);
  };


  const handleStatusChange = (status: string) => {
    if (isRetainerBoard && status === 'complete') {
      setShowHoursModal(true);
      return;
    }
    updateMutation.mutate({ status });
  };

  const handlePriorityChange = (priority: string) => {
    updateMutation.mutate({ priority });
  };

  const handleAssigneeChange = (userId: string) => {
    updateMutation.mutate({ assignedTo: userId || null });
  };

  const handleDateChange = (date: string, type: 'start' | 'due') => {
    if (type === 'start') {
      updateMutation.mutate({ startDate: date || null });
    } else {
      updateMutation.mutate({ dueDate: date || null });
    }
  };

  const hasNotes = Boolean(item.description || item.notes);

  const currentStatus = statusOptions.find(s => s.value === item.status) || statusOptions[0];
  const currentPriority = priorityOptions.find(p => p.value === item.priority) || priorityOptions[1];

  return (
    <div className="grid grid-cols-12 gap-4 py-3 px-4 hover:bg-gray-50 border-b border-gray-100 items-center min-w-[980px]">
      <div className="col-span-2">
        {isEditing && !readOnly ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave();
              if (e.key === 'Escape') {
                setTitle(item.title);
                setIsEditing(false);
              }
            }}
            className="input py-1"
            autoFocus
          />
        ) : (
          <div
            onClick={() => {
              if (!readOnly) {
                setIsEditing(true);
              }
            }}
            className={`font-medium ${readOnly ? 'cursor-default' : 'cursor-text'}`}
          >
            {item.title}
          </div>
        )}
      </div>

      <div className="col-span-3">
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className={`text-sm ${hasNotes ? 'text-primary-600' : 'text-gray-500'} hover:underline flex items-center space-x-2`}
        >
          <FileText className="w-4 h-4" />
          <span>Notes</span>
        </button>
      </div>

      <div className="col-span-2">
        <select
          value={item.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={updateMutation.isPending}
          className={`px-3 py-1 rounded-full text-sm font-medium ${currentStatus.color} cursor-pointer`}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="col-span-1">
        <select
          value={item.priority}
          onChange={(e) => handlePriorityChange(e.target.value)}
          disabled={readOnly || updateMutation.isPending}
          className={`px-3 py-1 rounded-full text-sm font-medium ${currentPriority.color} ${readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="col-span-1">
        <select
          value={item.assignedTo || ''}
          onChange={(e) => handleAssigneeChange(e.target.value)}
          disabled={readOnly || updateMutation.isPending}
          className="input py-1 text-sm"
        >
          <option value="">Unassigned</option>
          {workspaceMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div className="col-span-1">
        <input
          type="date"
          value={item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : ''}
          onChange={(e) => handleDateChange(e.target.value, 'start')}
          disabled={readOnly || updateMutation.isPending}
          className="input py-1 text-sm"
          placeholder="Start"
          title="Start Date"
        />
      </div>

      <div className="col-span-1">
        <input
          type="date"
          value={item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : ''}
          onChange={(e) => handleDateChange(e.target.value, 'due')}
          disabled={readOnly || updateMutation.isPending}
          className="input py-1 text-sm"
          placeholder="Due"
          title="Due Date"
        />
      </div>

      <div className="col-span-1 flex items-center justify-end space-x-2">
        {!readOnly && (
          <button
            onClick={() => deleteMutation.mutate()}
            className="text-gray-400 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDetails && (
        <ItemDetailsModal
          item={item}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          boardId={boardId}
        />
      )}

      {showHoursModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Log Hours</h2>
            <p className="text-sm text-gray-600 mb-4">
              Add the hours spent before marking this task as complete.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={hoursValue}
                  onChange={(e) => setHoursValue(e.target.value)}
                  className="input"
                  placeholder="e.g. 3.5"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowHoursModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (hoursValue.trim() === '') {
                      return;
                    }
                    const parsedHours = Number(hoursValue);
                    if (!Number.isFinite(parsedHours)) {
                      return;
                    }
                    updateMutation.mutate({ status: 'complete', retainerHours: parsedHours });
                    setShowHoursModal(false);
                  }}
                  className="flex-1 btn btn-primary"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
