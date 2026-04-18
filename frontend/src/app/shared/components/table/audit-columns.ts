import { ColumnConfig } from './services/table-filter.service';

/**
 * Standard audit columns appended to every table.
 * Only "Updated By" is visible by default — the rest can be toggled on
 * via the Columns dropdown.
 */
export const AUDIT_COLUMNS: ColumnConfig[] = [
  { key: 'created_by_name', label: 'Created By', sortable: false, type: 'text', visible: false },
  { key: 'created_at', label: 'Created At', sortable: false, type: 'date', visible: false },
  { key: 'updated_by_name', label: 'Updated By', sortable: false, type: 'text', visible: true },
  { key: 'updated_at', label: 'Updated At', sortable: false, type: 'date', visible: false },
];
