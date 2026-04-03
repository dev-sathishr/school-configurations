import { inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { ApiService } from '../api/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../toast/toast.service';

@Injectable({ providedIn: 'root' })
export class CommonService {

  public userDetails: any = {};
  public userDetailsObs = new Subject();

  private toastService = inject(ToastService);

  constructor(
    private router: Router,
    public apiService: ApiService,
    private authService: AuthService,
  ) {
    this.userDetails = this.authService.currentUser;
    this.userDetailsObs.next(this.userDetails);
  }

  // ─── API Methods ─────────────────────────────────────

  getService({ url = '', params = {}, options = {} }:
    { url: string; params?: any; options?: any }): Observable<any> {
    return this.apiService.getService({ url, params, options });
  }

  postService({ url = '', payload = {}, params = {}, options = {} }:
    { url: string; payload?: any; params?: any; options?: any }): Observable<any> {
    return this.apiService.postService({ url, payload, params, options });
  }

  putService({ url = '', payload = {}, params = {}, options = {} }:
    { url: string; payload?: any; params?: any; options?: any }): Observable<any> {
    return this.apiService.putService({ url, payload, params, options });
  }

  patchService({ url = '', payload = {}, params = {}, options = {} }:
    { url: string; payload?: any; params?: any; options?: any }): Observable<any> {
    return this.apiService.patchService({ url, payload, params, options });
  }

  deleteService({ url = '', params = {} }:
    { url: string; params?: any }): Observable<any> {
    return this.apiService.deleteService({ url, params });
  }

  postFile({ url = '', formData = new FormData(), params = {}, options = {} }:
    { url: string; formData: any; params?: any; options?: any }): Observable<any> {
    return this.apiService.postFile({ url, formData, params, options });
  }

  putFile({ url = '', formData = new FormData(), params = {}, options = {} }:
    { url: string; formData: any; params?: any; options?: any }): Observable<any> {
    return this.apiService.putFile({ url, formData, params, options });
  }

  getFile({ url = '' }: { url: string }): Observable<Blob> {
    return this.apiService.getFile({ url });
  }

  // ─── Session Storage ─────────────────────────────────

  session({ method = 'get', key = '', value = '' }:
    { method: 'get' | 'set' | 'remove' | 'clear'; key?: string; value?: any }): any {
    if (method === 'get') {
      const data = sessionStorage.getItem(key);
      return data || null;
    } else if (method === 'set') {
      sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } else if (method === 'remove') {
      sessionStorage.removeItem(key);
    } else if (method === 'clear') {
      sessionStorage.clear();
    }
  }

  // ─── Toast Notifications ─────────────────────────────

  showToastr({ type = 'info', message = '', description = '' }:
    { type?: 'success' | 'error' | 'info' | 'warning'; message: string; description?: string }) {
    this.toastService.show({ type, message, description });
  }

  // ─── Navigation ──────────────────────────────────────

  navigate({ url = '', queryParams = {} }: { url: string; queryParams?: any }) {
    this.router.navigate([url], { queryParams });
  }

  getRouteParam(route: ActivatedRoute, paramName: string): string | null {
    return route.snapshot.paramMap.get(paramName);
  }

  goBack() {
    window.history.back();
  }

  // ─── Auth ────────────────────────────────────────────

  logout() {
    this.authService.logout();
  }
}
