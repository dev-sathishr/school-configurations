import { computed, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { CommonService } from '../../shared/services/common/common.service';
import { AuthService } from './auth.service';

export interface PermittedLocation {
  id: string;
  name: string;
  code: string;
  is_default?: boolean;
}

/**
 * Holds the logged-in user's permitted locations and the subset currently
 * selected in the header multiselect. Consumed by any module that scopes
 * its list/form data by location. Persists selection to localStorage keyed
 * by user id so it survives reload and route changes, and re-intersects with
 * the permitted set on load so a revoked location silently drops out.
 */
@Injectable({ providedIn: 'root' })
export class LocationContextService {
  private readonly STORAGE_PREFIX = 'locationCtx:';

  readonly permitted = signal<PermittedLocation[]>([]);
  readonly selectedIds = signal<string[]>([]);
  readonly loaded = signal(false);

  readonly selectedCsv = computed(() => this.selectedIds().join(','));
  readonly selectedLocations = computed(() => {
    const ids = new Set(this.selectedIds());
    return this.permitted().filter((l) => ids.has(l.id));
  });
  readonly hasAny = computed(() => this.selectedIds().length > 0);

  // Value to send as the `location_ids` query param. Empty selection must
  // surface to the backend as "match nothing" rather than "no filter" —
  // otherwise deselecting everything would fall back to the user's full scope
  // and silently show all data. The `__none__` sentinel forces the intent.
  readonly scopeParam = computed<string>(() => {
    const ids = this.selectedIds();
    if (ids.length === 0) return '__none__';
    return ids.join(',');
  });

  /**
   * Best guess for the location a form should preselect when creating a
   * record. Resolution order:
   *   1. Exactly one location selected → that one
   *   2. User's default location (user_locations.is_default) if it's in the
   *      current selection
   *   3. null — caller should leave the field empty
   */
  readonly preferredLocationId = computed<string | null>(() => {
    const selected = this.selectedLocations();
    if (selected.length === 1) return selected[0].id;
    const defaultId = selected.find((l) => l.is_default)?.id;
    return defaultId || null;
  });

  /**
   * Drop-in value for TableComponent's `[extraParams]` — saves every list
   * from rewriting the same one-liner. Usage:
   *   <app-table [extraParams]="locationCtx.scopeExtraParams()" ...>
   */
  readonly scopeExtraParams = computed<Record<string, string>>(() => ({
    location_ids: this.scopeParam(),
  }));

  constructor(private cs: CommonService, private auth: AuthService) {}

  load(): Observable<any> {
    return this.cs.getService({ url: '/auth/me/locations' }).pipe(
      tap((res: any) => {
        const locations: PermittedLocation[] = res?.locations || [];
        this.permitted.set(locations);
        this.selectedIds.set(this.computeInitialSelection(locations));
        this.loaded.set(true);
      })
    );
  }

  setSelection(ids: string[]): void {
    const validIds = new Set(this.permitted().map((l) => l.id));
    const clean = ids.filter((id) => validIds.has(id));
    this.selectedIds.set(clean);
    this.persist(clean);
  }

  clear(): void {
    this.permitted.set([]);
    this.selectedIds.set([]);
    this.loaded.set(false);
  }

  private computeInitialSelection(locations: PermittedLocation[]): string[] {
    const stored = this.readStored();
    const valid = new Set(locations.map((l) => l.id));
    if (stored) {
      const intersected = stored.filter((id) => valid.has(id));
      if (intersected.length > 0) return intersected;
    }
    // Default: select all permitted locations so modules see everything the
    // user is allowed to see until they narrow it down.
    return locations.map((l) => l.id);
  }

  private readStored(): string[] | null {
    const key = this.storageKey();
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : null;
    } catch {
      return null;
    }
  }

  private persist(ids: string[]): void {
    const key = this.storageKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      // localStorage unavailable (private mode, quota) — selection stays in memory only
    }
  }

  private storageKey(): string | null {
    const userId = this.auth.currentUser?.id;
    return userId ? `${this.STORAGE_PREFIX}${userId}` : null;
  }
}
