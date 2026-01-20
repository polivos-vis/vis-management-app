import React, { useMemo } from 'react';
import { BoardRoadmapEntry } from '../types';

interface WorkspaceRoadmapViewProps {
  entries: BoardRoadmapEntry[];
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const WorkspaceRoadmapView: React.FC<WorkspaceRoadmapViewProps> = ({ entries }) => {
  const { timelineEntries, startDate, endDate } = useMemo(() => {
    if (!entries.length) {
      return { timelineEntries: [], startDate: new Date(), endDate: new Date() };
    }

    const dates = entries.flatMap((entry) => [
      startOfDay(new Date(entry.startDate)),
      startOfDay(new Date(entry.endDate))
    ]);
    const minDate = new Date(Math.min(...dates.map((date) => date.getTime())));
    const maxDate = new Date(Math.max(...dates.map((date) => date.getTime())));

    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    return {
      timelineEntries: entries,
      startDate: minDate,
      endDate: maxDate
    };
  }, [entries]);

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

  if (timelineEntries.length === 0) {
    return (
      <div className="text-center py-12 card">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Roadmap Data</h3>
        <p className="text-gray-600">
          Add task dates to your boards to see them on the roadmap.
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
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Workspace Roadmap</h3>
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
              Board
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
            {timelineEntries.map((entry) => {
              const startIndex = getDayIndex(new Date(entry.startDate));
              const endIndex = getDayIndex(new Date(entry.endDate));
              const barLeft = Math.max(0, startIndex) * cellWidth;
              const barWidth = Math.max(1, (endIndex - startIndex + 1)) * cellWidth;

              return (
                <div key={entry.id} className="flex border-b border-gray-100">
                  <div
                    className="sticky left-0 z-10 border-r border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 truncate"
                    style={{ width: labelWidth }}
                  >
                    {entry.name}
                  </div>
                  <div className="relative" style={{ width: timelineWidth, height: 44 }}>
                    <div className="absolute inset-0 flex">
                      {dayCells.map((cell, index) => (
                        <div
                          key={`cell-${entry.id}-${index}`}
                          className={`border-r border-gray-100 h-full ${cell.isWeekend ? 'bg-gray-50' : ''}`}
                          style={{ width: cellWidth }}
                        />
                      ))}
                    </div>
                    <div
                      className={`absolute top-1 bottom-1 rounded-lg ${getEntryColor(entry.id)} opacity-90 shadow-md`}
                      style={{ left: barLeft, width: barWidth }}
                      title={`${entry.name}\n${new Date(entry.startDate).toLocaleDateString()} - ${new Date(entry.endDate).toLocaleDateString()}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
  const palette = ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500'];

  const getEntryColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) {
      hash = (hash * 31 + id.charCodeAt(i)) % palette.length;
    }
    return palette[hash];
  };
