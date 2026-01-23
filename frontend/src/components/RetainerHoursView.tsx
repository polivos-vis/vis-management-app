import React, { useEffect, useMemo, useState } from 'react';
import { Board, Item } from '../types';

interface RetainerHoursViewProps {
  board: Board;
}

export const RetainerHoursView: React.FC<RetainerHoursViewProps> = ({ board }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const monthData = useMemo(() => {
    const months = new Map<
      string,
      { label: string; groups: { id: string; name: string; items: Item[] }[] }
    >();

    (board.groups || []).forEach((group) => {
      (group.items || [])
        .filter((item) => item.completedAt && item.retainerHours !== null && item.retainerHours !== undefined)
        .forEach((item) => {
          const completedAt = new Date(item.completedAt!);
          const key = `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, '0')}`;
          const label = completedAt.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          });
          const entry = months.get(key) || { label, groups: [] };
          let groupEntry = entry.groups.find((entryGroup) => entryGroup.id === group.id);
          if (!groupEntry) {
            groupEntry = { id: group.id, name: group.name, items: [] };
            entry.groups.push(groupEntry);
          }
          groupEntry.items.push(item);
          months.set(key, entry);
        });
    });

    months.forEach((entry) => {
      entry.groups.forEach((group) => {
        group.items.sort((a, b) => {
          const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return aDate - bDate;
        });
      });
    });

    const sortedKeys = Array.from(months.keys()).sort((a, b) => (a < b ? 1 : -1));
    return { months, sortedKeys };
  }, [board]);

  useEffect(() => {
    if (!selectedMonth && monthData.sortedKeys.length > 0) {
      setSelectedMonth(monthData.sortedKeys[0]);
    }
  }, [monthData.sortedKeys, selectedMonth]);

  if (monthData.sortedKeys.length === 0) {
    return (
      <div className="text-center py-12 card">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Retainer Hours Yet</h3>
        <p className="text-gray-600">
          Complete tasks and log hours to see them grouped by month.
        </p>
      </div>
    );
  }

  const monthEntry = monthData.months.get(selectedMonth);
  const monthGroups = monthEntry?.groups || [];
  const totalHours = monthGroups.reduce((sum, group) => {
    return (
      sum +
      group.items.reduce((groupSum, item) => groupSum + (item.retainerHours || 0), 0)
    );
  }, 0);

  return (
    <div className="card">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Retainer Hours</h3>
          <p className="text-sm text-gray-600">Ready to export month by month.</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="text-sm text-gray-600">Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input py-1 text-sm"
          >
            {monthData.sortedKeys.map((key) => (
              <option key={key} value={key}>
                {monthData.months.get(key)?.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b border-gray-200">
              <th className="py-2 pr-4 font-medium">Group</th>
              <th className="py-2 pr-4 font-medium">Task</th>
              <th className="py-2 pr-4 font-medium">Date</th>
              <th className="py-2 font-medium text-right">Hours</th>
            </tr>
          </thead>
          <tbody>
            {monthGroups.map((group, groupIndex) => {
              const groupBg = groupIndex % 2 === 0 ? 'bg-secondary-50' : 'bg-secondary-100';
              return group.items.map((item, index) => (
                <tr key={item.id} className={`${groupBg}`}>
                  {index === 0 && (
                    <td
                      className="py-3 pr-4 text-gray-900 font-semibold align-middle"
                      rowSpan={group.items.length}
                    >
                      {group.name}
                    </td>
                  )}
                  <td className="py-3 pr-4 text-gray-900">{item.title}</td>
                  <td className="py-3 pr-4 text-gray-600">
                    {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : ''}
                  </td>
                  <td className="py-3 text-right text-gray-700">
                    {item.retainerHours?.toFixed(2)}
                  </td>
                </tr>
              ));
            })}
            <tr>
              <td className="py-3 pr-4 font-semibold text-gray-900" colSpan={3}>
                Total
              </td>
              <td className="py-3 text-right font-semibold text-gray-900">
                {totalHours.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
