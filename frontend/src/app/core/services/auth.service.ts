import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MenuItem } from '../models/menu.model';

export interface UserLocation {
  location_id: string;
  name: string;
  code: string;
  type: string;
  is_default: boolean;
  organization: { id: string; name: string };
}

interface LoginResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  user: User;
  menu: MenuItem[];
  permissions: Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>;
  locations: UserLocation[];
  default_location_id: string | null;
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  user_group_id: string;
  last_login: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password }).pipe(
      tap((res) => {
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token);
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('menu', JSON.stringify(res.menu));
        localStorage.setItem('permissions', JSON.stringify(res.permissions));
        localStorage.setItem('locations', JSON.stringify(res.locations));
        localStorage.setItem('active_location', res.default_location_id || '');
        this.currentUserSubject.next(res.user);
      })
    );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
      complete: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }

  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('menu');
    localStorage.removeItem('permissions');
    localStorage.removeItem('locations');
    localStorage.removeItem('active_location');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/sign-in']);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getPermissions(): Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }> {
    const perms = localStorage.getItem('permissions');
    return perms ? JSON.parse(perms) : {};
  }

  hasPermission(moduleCode: string, action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' = 'can_view'): boolean {
    const perms = this.getPermissions();
    return perms[moduleCode]?.[action] || false;
  }

  private getStoredUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}
