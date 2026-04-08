import { Injectable, signal } from '@angular/core';
import { UserLocation } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private _locations = signal<UserLocation[]>([]);
  private _activeLocationId = signal<string | null>(null);

  constructor() {
    this.loadFromStorage();
  }

  get locations() {
    return this._locations();
  }

  get activeLocationId() {
    return this._activeLocationId();
  }

  get activeLocation(): UserLocation | undefined {
    return this._locations().find((l) => l.location_id === this._activeLocationId());
  }

  /** Initialize after login */
  initialize(locations: UserLocation[], defaultLocationId: string | null): void {
    this._locations.set(locations);
    this._activeLocationId.set(defaultLocationId || locations[0]?.location_id || null);
    localStorage.setItem('locations', JSON.stringify(locations));
    localStorage.setItem('active_location', this._activeLocationId() || '');
  }

  /** Switch active location */
  switchLocation(locationId: string): void {
    this._activeLocationId.set(locationId);
    localStorage.setItem('active_location', locationId);
  }

  /** Load from localStorage (on page refresh) */
  private loadFromStorage(): void {
    const stored = localStorage.getItem('locations');
    const activeId = localStorage.getItem('active_location');
    if (stored) {
      try {
        this._locations.set(JSON.parse(stored));
      } catch {
        this._locations.set([]);
      }
    }
    this._activeLocationId.set(activeId || null);
  }

  /** Clear on logout */
  clear(): void {
    this._locations.set([]);
    this._activeLocationId.set(null);
  }
}
