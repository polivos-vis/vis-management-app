import React, { useMemo } from 'react';
import { Board, Item, User } from '../types';

interface TimelineViewProps {
  board: Board;
  allMembers: User[];
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const TimelineView: React.FC<TimelineViewProps> = ({ board, allMembers }) => {
  const { timelineGroups, startDate, endDate } = useMemo(() => {
    // Obtener todos los items con fechas
    const groups: { id: string; name: string; items: Item[] }[] = [];
    board.groups?.forEach(group => {
      const groupItems: Item[] = [];
      group.items?.forEach(item => {
        if (item.startDate && item.dueDate) {
          groupItems.push(item);
        }
      });
      if (groupItems.length > 0) {
        groups.push({ id: group.id, name: group.name, items: groupItems });
      }
    });

    if (groups.length === 0) {
      return { timelineGroups: [], startDate: new Date(), endDate: new Date() };
    }

    // Encontrar fecha mínima y máxima
    const dates = groups.flatMap(group =>
      group.items.flatMap(item => [
        startOfDay(new Date(item.startDate!)),
        startOfDay(new Date(item.dueDate!))
      ])
    );

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Agregar padding de una semana
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    return {
      timelineGroups: groups,
      startDate: minDate,
      endDate: maxDate
    };
  }, [board]);

  const dayCells = useMemo(() => {
    const cells: { date: Date; labelDay: string; labelNum: string; isWeekend: boolean }[] = [];
    const current = startOfDay(new Date(startDate));
    const last = startOfDay(new Date(endDate));

    while (current <= last) {
      const dayIndex = current.getDay();
      cells.push({
        date: new Date(current),
        labelDay: current.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        labelNum: String(current.getDate()),
        isWeekend: dayIndex === 0 || dayIndex === 6
      });
      current.setDate(current.getDate() + 1);
    }

    return cells;
  }, [startDate, endDate]);

  const monthSpans = useMemo(() => {
    const spans: { label: string; span: number }[] = [];
    let currentLabel = '';
    let currentSpan = 0;

    dayCells.forEach((cell) => {
      const label = cell.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (label !== currentLabel) {
        if (currentSpan > 0) {
          spans.push({ label: currentLabel, span: currentSpan });
        }
        currentLabel = label;
        currentSpan = 1;
      } else {
        currentSpan += 1;
      }
    });

    if (currentSpan > 0) {
      spans.push({ label: currentLabel, span: currentSpan });
    }

    return spans;
  }, [dayCells]);

  const getDayIndex = (date: Date) => {
    const start = startOfDay(new Date(startDate));
    const target = startOfDay(date);
    const diffMs = target.getTime() - start.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const palette = ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500'];

  const getItemColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) {
      hash = (hash * 31 + id.charCodeAt(i)) % palette.length;
    }
    return palette[hash];
  };

  const getUserColor = (userId?: string) => {
    if (!userId) return 'bg-gray-400';
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
    ];
    const index = allMembers.findIndex(m => m.id === userId);
    return colors[index % colors.length];
  };

  if (timelineGroups.length === 0) {
    return (
      <div className="text-center py-12 card">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Data</h3>
        <p className="text-gray-600">
          Add start and due dates to your tasks to see them in the timeline view.
        </p>
      </div>
    );
  }

  const cellWidth = 24;
  const labelWidth = 220;
  const timelineWidth = dayCells.length * cellWidth;

  return (
    <div className="card">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Project Timeline</h3>
        <p className="text-sm text-gray-600">
          {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block" style={{ minWidth: labelWidth + timelineWidth }}>
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div
              className="sticky left-0 z-30 border-r border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-50"
              style={{ width: labelWidth }}
            >
              Task
            </div>
            <div className="flex">
              {monthSpans.map((month, index) => (
                <div
                  key={`${month.label}-${index}`}
                  className="border-r border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600"
                  style={{ width: month.span * cellWidth }}
                >
                  {month.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex border-b border-gray-200 bg-white">
            <div
              className="sticky left-0 z-20 border-r border-gray-200 bg-white"
              style={{ width: labelWidth }}
            />
            <div className="flex">
              {dayCells.map((cell, index) => (
                <div
                  key={`${cell.labelNum}-${index}`}
                  className={`border-r border-gray-200 text-[10px] text-gray-500 flex flex-col items-center py-1 ${
                    cell.isWeekend ? 'bg-gray-50' : ''
                  }`}
                  style={{ width: cellWidth }}
                >
                  <span>{cell.labelDay}</span>
                  <span className="font-semibold text-gray-700">{cell.labelNum}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            {timelineGroups.map((group) => (
              <div key={group.id} className="border-b border-gray-200">
                <div className="flex bg-gray-50">
                  <div
                    className="sticky left-0 z-20 border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50"
                    style={{ width: labelWidth }}
                  >
                    {group.name}
                  </div>
                  <div className="relative" style={{ width: timelineWidth, height: 34 }}>
                    <div className="absolute inset-0 flex">
                      {dayCells.map((cell, index) => (
                        <div
                          key={`group-cell-${group.id}-${index}`}
                          className={`border-r border-gray-100 h-full ${cell.isWeekend ? 'bg-gray-50' : ''}`}
                          style={{ width: cellWidth }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {group.items.map((item) => {
                  const startIndex = getDayIndex(new Date(item.startDate!));
                  const endIndex = getDayIndex(new Date(item.dueDate!));
                  const assignedUser = allMembers.find(m => m.id === item.assignedTo);
                  const barLeft = Math.max(0, startIndex) * cellWidth;
                  const barWidth = Math.max(1, (endIndex - startIndex + 1)) * cellWidth;
                  const barColor = getItemColor(item.id);

                  return (
                    <div key={item.id} className="flex border-t border-gray-100">
                      <div
                        className="sticky left-0 z-10 border-r border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 truncate"
                        style={{ width: labelWidth }}
                      >
                        {item.title}
                      </div>
                      <div className="relative" style={{ width: timelineWidth, height: 44 }}>
                        <div className="absolute inset-0 flex">
                          {dayCells.map((cell, index) => (
                            <div
                              key={`cell-${item.id}-${index}`}
                              className={`border-r border-gray-100 h-full ${cell.isWeekend ? 'bg-gray-50' : ''}`}
                              style={{ width: cellWidth }}
                            />
                          ))}
                        </div>
                        <div
                          className={`absolute top-1 bottom-1 rounded-lg ${barColor} opacity-90 shadow-md`}
                          style={{ left: barLeft, width: barWidth }}
                          title={`${item.title}\n${new Date(item.startDate!).toLocaleDateString()} - ${new Date(item.dueDate!).toLocaleDateString()}`}
                        >
                          <div className="flex items-center justify-between h-full px-3 text-white text-xs">
                            <span className="truncate">{item.title}</span>
                            {assignedUser && (
                              <div
                                className="w-6 h-6 rounded-full bg-white text-gray-900 flex items-center justify-center font-medium ml-2"
                                title={assignedUser.name}
                              >
                                {assignedUser.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Team Members</h4>

        {allMembers.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-3">
              {allMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full ${getUserColor(member.id)} flex items-center justify-center text-white text-xs font-medium`}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-600">{member.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
