import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

function AdminDashboardCharts({ title, data, emptyMessage, dataKey = 'count', color = '#7B0000' }) {
  const hasData = Array.isArray(data) && data.some((row) => row.count > 0);

  return (
    <div className="admin-analytics-chart-card">
      <h3 className="admin-analytics-chart-card__title">{title}</h3>
      {!hasData ? (
        <p className="admin-analytics-chart-card__empty">{emptyMessage}</p>
      ) : (
        <div className="admin-analytics-chart-card__canvas">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D4D1CC" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} width={36} />
              <Tooltip
                formatter={(value) => [value, 'Количество']}
                labelFormatter={(label, payload) => {
                  const row = payload?.[0]?.payload;
                  return row?.date ? `Дата: ${row.date}` : label;
                }}
                contentStyle={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                }}
              />
              <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }} />
              <Line
                type="monotone"
                dataKey={dataKey}
                name="За день"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3, fill: color }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default AdminDashboardCharts;
