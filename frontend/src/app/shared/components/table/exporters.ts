import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ColumnConfig } from './services/table-filter.service';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

/**
 * Export the given rows using the table's (visible) column config.
 * Each exporter uses the same column.label / column.key pair so the file
 * structure matches what the user sees on screen.
 */
export function exportRows(
  rows: readonly unknown[],
  columns: readonly ColumnConfig[],
  filename: string,
  format: ExportFormat,
): void {
  const safeName = filename.replace(/[^A-Za-z0-9_-]+/g, '-') || 'export';

  const headers = columns.map((c) => c.label);
  const body = rows.map((row) =>
    columns.map((c) => stringifyCell((row as Record<string, unknown>)[c.key], c))
  );

  switch (format) {
    case 'csv':
      return downloadBlob(
        buildCsv(headers, body),
        `${safeName}.csv`,
        'text/csv;charset=utf-8;',
      );
    case 'xlsx': {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, `${safeName}.xlsx`);
      return;
    }
    case 'pdf': {
      const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' });
      doc.setFontSize(12);
      doc.text(filename, 14, 14);
      autoTable(doc, {
        head: [headers],
        body,
        startY: 20,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [225, 29, 72] },
      });
      doc.save(`${safeName}.pdf`);
      return;
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────

function stringifyCell(value: unknown, col: ColumnConfig): string {
  if (value === null || value === undefined || value === '') return '';
  if (col.type === 'badge' && col.badgeMap) {
    const key = String(value);
    return col.badgeMap[key]?.label ?? key;
  }
  if (col.type === 'date') {
    const date = new Date(value as string);
    return isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function buildCsv(headers: readonly string[], rows: readonly string[][]): string {
  const escape = (s: string) => {
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) lines.push(row.map(escape).join(','));
  return lines.join('\n');
}

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
