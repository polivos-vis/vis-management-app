import React, { useEffect, useMemo, useState } from 'react';
import { Board, Item } from '../types';

interface RetainerHoursViewProps {
  board: Board;
}

export const RetainerHoursView: React.FC<RetainerHoursViewProps> = ({ board }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const monthData = useMemo(() => {
    const items: Item[] = [];
    board.groups?.forEach((group) => {
      group.items?.forEach((item) => {
        if (item.completedAt && item.retainerHours !== null && item.retainerHours !== undefined) {
          items.push(item);
        }
      });
    });

    const months = new Map<string, { label: string; items: Item[] }>();
    items.forEach((item) => {
      const completedAt = new Date(item.completedAt!);
      const key = `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, '0')}`;
      const label = completedAt.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
      const entry = months.get(key) || { label, items: [] };
      entry.items.push(item);
      months.set(key, entry);
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
  const monthItems = monthEntry?.items || [];
  const totalHours = monthItems.reduce((sum, item) => sum + (item.retainerHours || 0), 0);

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
              <th className="py-2 pr-4 font-medium">Task</th>
              <th className="py-2 pr-4 font-medium">Date</th>
              <th className="py-2 font-medium text-right">Hours</th>
            </tr>
          </thead>
          <tbody>
            {monthItems.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-3 pr-4 text-gray-900">{item.title}</td>
                <td className="py-3 pr-4 text-gray-600">
                  {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : ''}
                </td>
                <td className="py-3 text-right text-gray-700">
                  {item.retainerHours?.toFixed(2)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-3 pr-4 font-semibold text-gray-900">Total</td>
              <td className="py-3 pr-4"></td>
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
