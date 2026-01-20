import React, { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itemService } from '../services';
import { Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Item } from '../types';

export const MyTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useQuery({
    queryKey: ['my-items'],
    queryFn: itemService.getMyItems,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => itemService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
    },
  });

  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = startOfDay(new Date());

  const groupedItems = useMemo(() => {
    const overdue: Item[] = [];
    const todayItems: Item[] = [];
    const upcoming: Item[] = [];
    const undated: Item[] = [];

    (items || []).forEach((item) => {
      const startDate = item.startDate ? startOfDay(new Date(item.startDate)) : null;
      const dueDate = item.dueDate ? startOfDay(new Date(item.dueDate)) : null;

      if (!startDate && !dueDate) {
        undated.push(item);
        return;
      }

      const start = startDate || dueDate!;
      const due = dueDate || startDate!;

      if (today > due) {
        overdue.push(item);
      } else if (start <= today && due >= today) {
        todayItems.push(item);
      } else {
        upcoming.push(item);
      }
    });

    const sortByStart = (a: Item, b: Item) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : Infinity;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : Infinity;
      return aDate - bDate;
    };

    overdue.sort(sortByStart);
    todayItems.sort(sortByStart);
    upcoming.sort(sortByStart);

    return { overdue, todayItems, upcoming, undated };
  }, [items, today]);

  const handleStatusChange = (item: Item, status: string) => {
    updateStatusMutation.mutate({ id: item.id, data: { status } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const renderTaskCard = (item: Item, isOverdue?: boolean) => (
    <div key={item.id} className="card !py-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 rounded-full border-gray-300 text-primary-600 focus:ring-primary-500"
          onClick={(e) => e.stopPropagation()}
          onChange={() => handleStatusChange(item, 'done')}
        />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3
                className="text-base font-semibold text-gray-900 cursor-pointer hover:text-gray-700"
                onClick={() => navigate(`/boards/${item.group?.board.id}`)}
              >
                {item.title}
              </h3>
              {item.dueDate && (
                <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {item.startDate && (
                      <>
                        {new Date(item.startDate).toLocaleDateString()} -{' '}
                      </>
                    )}
                    {new Date(item.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            {isOverdue && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Overdue
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {item.group?.board.workspace?.name} · {item.group?.board.name} · {item.group?.name}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-600 mt-2">Your daily reminders and upcoming work</p>
      </div>

      {items && items.length === 0 ? (
        <div className="text-center py-12 card">
          <CheckCircle2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks assigned</h3>
          <p className="text-gray-600">You don't have any tasks assigned to you yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Today</h2>
            {groupedItems.overdue.length === 0 && groupedItems.todayItems.length === 0 ? (
              <div className="text-sm text-gray-500">No tasks for today.</div>
            ) : (
              <div className="space-y-4">
                {groupedItems.overdue.map((item) => renderTaskCard(item, true))}
                {groupedItems.todayItems.map((item) => renderTaskCard(item, false))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Upcoming</h2>
            {groupedItems.upcoming.length === 0 ? (
              <div className="text-sm text-gray-500">No upcoming tasks.</div>
            ) : (
              <div className="space-y-4">
                {groupedItems.upcoming.map((item) => renderTaskCard(item))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">No Date Assigned</h2>
            {groupedItems.undated.length === 0 ? (
              <div className="text-sm text-gray-500">No tasks without dates.</div>
            ) : (
              <div className="space-y-4">
                {groupedItems.undated.map((item) => renderTaskCard(item))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
