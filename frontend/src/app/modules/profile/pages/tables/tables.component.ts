import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserPreferencesService } from '../../../../core/services/user-preferences.service';
import { PAGE_SIZE_OPTIONS } from '../../../../shared/utils/page-size-options';

@Component({
  selector: 'app-profile-tables',
  templateUrl: './tables.component.html',
  imports: [FormsModule],
})
export class TablesComponent {
  private prefs = inject(UserPreferencesService);

  pageSizeOptions = PAGE_SIZE_OPTIONS;

  tables = this.prefs.tables;

  overrides = computed(() => {
    const map = this.tables().perTable;
    return Object.keys(map)
      .sort()
      .map((key) => ({ key, size: map[key] }));
  });

  // Preview: when global changes we show a warning so the user knows all per-table
  // overrides will be cleared (spec §3).
  pendingGlobalChange = false;

  onGlobalChange(event: Event) {
    const val = Number((event.target as HTMLSelectElement).value);
    this.prefs.setDefaultPageSize(val);
    this.pendingGlobalChange = true;
    setTimeout(() => (this.pendingGlobalChange = false), 3000);
  }

  onOverrideChange(key: string, event: Event) {
    const val = Number((event.target as HTMLSelectElement).value);
    this.prefs.setTablePageSize(key, val);
  }

  resetOverride(key: string) {
    this.prefs.clearTableOverride(key);
  }

  prettyKey(key: string): string {
    // Try to present a cleaner label — e.g. "/users" from "/users" or an API URL.
    return key.replace(/^\/api\/v\d+/, '');
  }
}
