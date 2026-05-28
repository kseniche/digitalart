import React from 'react';

export const REPORT_PERIOD_OPTIONS = [
  { value: 'week', label: 'За неделю' },
  { value: 'month', label: 'За месяц' },
  { value: 'quarter', label: 'За квартал' },
  { value: 'year', label: 'За год' },
  { value: 'all', label: 'За всё время' },
];

/** Имя файла (латиница) — согласовано с AdminController::reportPeriodFilenamePart */
export const REPORT_PERIOD_FILENAME_PART = {
  week: 'za-nedelyu',
  month: 'za-mesyac',
  quarter: 'za-kvartal',
  year: 'za-god',
  all: 'za-vse-vremya',
};

function ReportPeriodModal({
  open,
  period,
  onPeriodChange,
  onConfirm,
  onClose,
  isLoading = false,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-period-modal-title"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px' }}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <h2 id="report-period-modal-title" className="ui-modal-title">
          Формирование отчёта
        </h2>
        <p className="ui-modal-text" style={{ marginBottom: '1rem' }}>
          Выберите период. Сводка и таблицы в CSV будут построены только по данным за выбранный интервал.
        </p>
        <label
          htmlFor="report-period-select"
          style={{
            display: 'block',
            marginBottom: '0.4rem',
            color: '#374151',
            fontSize: '0.875rem',
          }}
        >
          Период отчёта
        </label>
        <select
          id="report-period-select"
          className="filter-select"
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          disabled={isLoading}
          style={{ width: '100%', marginBottom: '1.25rem' }}
        >
          {REPORT_PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="ui-actions-row">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isLoading}>
            Отмена
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Формирование…' : 'Скачать отчёт'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportPeriodModal;
