import React from 'react';

function AdminModerationStats({ items }) {
  if (!items?.length) return null;

  return (
    <div className="admin-stats-row">
      {items.map((item) => (
        <div key={item.label} className="admin-stat-card">
          <span className="admin-stat-value">{item.value ?? 0}</span>
          <span className="admin-stat-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default AdminModerationStats;
