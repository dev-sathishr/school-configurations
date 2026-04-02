import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface UserRecord {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_by_name: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
}

export interface UserListResponse {
  data: UserRecord[];
  pagination: Pagination;
}

export interface UserListParams {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
  order?: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: string;
  is_active: boolean;
}

export interface UpdateUserPayload {
  username?: string;
  password?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAll(params: UserListParams = {}): Observable<UserListResponse> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.size) httpParams = httpParams.set('size', params.size);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.order) httpParams = httpParams.set('order', params.order);

    return this.http.get<UserListResponse>(this.apiUrl, { params: httpParams });
  }

  getById(id: string): Observable<UserRecord> {
    return this.http.get<UserRecord>(`${this.apiUrl}/${id}`);
  }

  create(data: CreateUserPayload): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  update(id: string, data: UpdateUserPayload): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
