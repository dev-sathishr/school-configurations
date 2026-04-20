import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';

export interface AppearancePrefs {
  menu: 'sidebar' | 'header';
  mode: 'light' | 'dark';
  direction: 'ltr' | 'rtl';
  color: string;
}

export interface TablesPrefs {
  defaultPageSize: number;
  perTable: Record<string, number>;
}

export interface FavoritesPrefs {
  modules: string[];
  pinnedMenus: string[];
}

export interface UsageEntry {
  count: number;
  lastAccessed: string;
}

export interface UsagePrefs {
  menus: Record<string, UsageEntry>;
  modules: Record<string, UsageEntry>;
}

export interface UserPreferences {
  appearance: AppearancePrefs;
  tables: TablesPrefs;
  favorites: FavoritesPrefs;
  usage: UsagePrefs;
}

const DEFAULTS: UserPreferences = {
  appearance: { menu: 'sidebar', mode: 'light', direction: 'ltr', color: 'base' },
  tables: { defaultPageSize: 10, perTable: {} },
  favorites: { modules: [], pinnedMenus: [] },
  usage: { menus: {}, modules: {} },
};

const CACHE_KEY = 'userPreferencesCache';
const DEBOUNCE_MS = 150;
type DirtySection = 'appearance' | 'tables' | 'favorites';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  const out: any = { ...target };
  for (const key of Object.keys(source || {})) {
    const sv = (source as any)[key];
    const tv = out[key];
    if (isPlainObject(sv) && isPlainObject(tv)) {
      out[key] = deepMerge(tv, sv);
    } else {
      out[key] = sv;
    }
  }
  return out;
}

function mergeWithDefaults(raw: Partial<UserPreferences> | null | undefined): UserPreferences {
  return deepMerge(DEFAULTS, (raw as Partial<UserPreferences>) || {});
}

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private _prefs = signal<UserPreferences>(this.readCache());
  readonly prefs = this._prefs.asReadonly();

  readonly appearance = computed(() => this._prefs().appearance);
  readonly tables = computed(() => this._prefs().tables);
  readonly favorites = computed(() => this._prefs().favorites);
  readonly usage = computed(() => this._prefs().usage);

  private dirty = new Set<DirtySection>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private loaded = false;

  constructor() {
    const flushOnHide = () => {
      if (document.visibilityState === 'hidden') this.flushKeepalive();
    };
    window.addEventListener('pagehide', () => this.flushKeepalive());
    document.addEventListener('visibilitychange', flushOnHide);
  }

  load(): Observable<UserPreferences> {
    return this.http
      .get<{ data: UserPreferences }>(`${environment.apiUrl}/me/preferences`)
      .pipe(
        map((res) => mergeWithDefaults(res.data)),
        tap((merged) => {
          this._prefs.set(merged);
          this.writeCache(merged);
          this.loaded = true;
        }),
      );
  }

  clear(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.dirty.clear();
    this.loaded = false;
    this._prefs.set({ ...DEFAULTS });
    try { localStorage.removeItem(CACHE_KEY); } catch {}
  }

  // ─── Appearance ────────────────────────────────────────

  setAppearance(patch: Partial<AppearancePrefs>): void {
    this._prefs.update((p) => ({ ...p, appearance: { ...p.appearance, ...patch } }));
    this.markDirty('appearance');
  }

  // ─── Tables ────────────────────────────────────────────

  setDefaultPageSize(size: number): void {
    // Changing the global default wipes all per-table overrides (spec §3).
    this._prefs.update((p) => ({
      ...p,
      tables: { defaultPageSize: size, perTable: {} },
    }));
    this.markDirty('tables');
  }

  setTablePageSize(tableKey: string, size: number): void {
    this._prefs.update((p) => ({
      ...p,
      tables: {
        ...p.tables,
        perTable: { ...p.tables.perTable, [tableKey]: size },
      },
    }));
    this.markDirty('tables');
  }

  clearTableOverride(tableKey: string): void {
    this._prefs.update((p) => {
      const next = { ...p.tables.perTable };
      delete next[tableKey];
      return { ...p, tables: { ...p.tables, perTable: next } };
    });
    this.markDirty('tables');
  }

  effectivePageSize(tableKey: string): number {
    const t = this._prefs().tables;
    return t.perTable[tableKey] ?? t.defaultPageSize ?? 10;
  }

  // ─── Favorites & pinned ────────────────────────────────

  setFavoriteModules(modules: string[]): void {
    this._prefs.update((p) => ({ ...p, favorites: { ...p.favorites, modules: [...modules] } }));
    this.markDirty('favorites');
  }

  setPinnedMenus(routes: string[]): void {
    this._prefs.update((p) => ({ ...p, favorites: { ...p.favorites, pinnedMenus: [...routes] } }));
    this.markDirty('favorites');
  }

  togglePinnedMenu(route: string): void {
    const current = this._prefs().favorites.pinnedMenus;
    const next = current.includes(route) ? current.filter((r) => r !== route) : [...current, route];
    this.setPinnedMenus(next);
  }

  movePinnedMenu(route: string, direction: -1 | 1): void {
    const arr = [...this._prefs().favorites.pinnedMenus];
    const i = arr.indexOf(route);
    if (i < 0) return;
    const j = i + direction;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this.setPinnedMenus(arr);
  }

  // ─── Usage tracking ────────────────────────────────────

  track(type: 'menu' | 'module', id: string): void {
    // Local bump so sort order is correct immediately after reload of the sorter;
    // consumers should read usage untracked to avoid re-sorting on every nav.
    this._prefs.update((p) => {
      const bucket = type === 'menu' ? 'menus' : 'modules';
      const prev = p.usage[bucket][id];
      const entry: UsageEntry = {
        count: (prev?.count ?? 0) + 1,
        lastAccessed: new Date().toISOString(),
      };
      return {
        ...p,
        usage: { ...p.usage, [bucket]: { ...p.usage[bucket], [id]: entry } },
      };
    });
    this.writeCache(this._prefs());

    // Atomic server-side increment — fire & forget.
    this.http
      .post(`${environment.apiUrl}/me/preferences/track`, { type, id })
      .subscribe({ error: () => {} });
  }

  // ─── Debounced flush ───────────────────────────────────

  private markDirty(section: DirtySection): void {
    this.dirty.add(section);
    this.writeCache(this._prefs());
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), DEBOUNCE_MS);
  }

  private buildPatch(): Partial<UserPreferences> {
    const p = this._prefs();
    const patch: Partial<UserPreferences> = {};
    for (const key of this.dirty) {
      (patch as any)[key] = p[key];
    }
    return patch;
  }

  private flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.dirty.size === 0) return;
    const patch = this.buildPatch();
    this.dirty.clear();
    this.http
      .patch<{ preferences: UserPreferences }>(`${environment.apiUrl}/me/preferences`, patch)
      .subscribe({ error: () => {} });
  }

  private flushKeepalive(): void {
    if (this.dirty.size === 0) return;
    const patch = this.buildPatch();
    this.dirty.clear();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    const token = this.auth.getToken();
    if (!token) return;
    try {
      fetch(`${environment.apiUrl}/me/preferences`, {
        method: 'PATCH',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      }).catch(() => {});
    } catch {
      // Ignore — best-effort flush during unload.
    }
  }

  // ─── Cache (instant paint only; server is source of truth) ─

  private readCache(): UserPreferences {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return { ...DEFAULTS };
      return mergeWithDefaults(JSON.parse(raw));
    } catch {
      return { ...DEFAULTS };
    }
  }

  private writeCache(p: UserPreferences): void {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(p)); } catch {}
  }
}
