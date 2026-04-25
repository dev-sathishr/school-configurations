import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpBackend, HttpClient, HttpHeaders,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SessionTrackingService } from '../services/session-tracking.service';
import { API } from '../api/endpoints';
import { environment } from 'src/environments/environment';

/** HTTP methods → action types. */
const METHOD_ACTION: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'EDIT',
  PATCH: 'EDIT',
  DELETE: 'DELETE',
};

/** URL fragments that skip action tracking entirely. */
const SKIP_FRAGMENTS = [
  '/auth/', '/sessions/', '/me/preferences', '/files/',
  '/pincode/', '/notifications/', '/chat/',
];

@Injectable()
export class ActionTrackingInterceptor implements HttpInterceptor {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sessionTracking = inject(SessionTrackingService);
  // HttpClient built on HttpBackend bypasses all interceptors — avoids
  // infinite loop when this interceptor fires on its own tracking POST.
  private readonly direct = new HttpClient(inject(HttpBackend));

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse && event.status >= 200 && event.status < 300) {
          this.maybeTrack(req, event);
        }
      }),
    );
  }

  private maybeTrack(req: HttpRequest<any>, res: HttpResponse<any>): void {
    if (!this.auth.isLoggedIn()) return;
    if (SKIP_FRAGMENTS.some((f) => req.url.includes(f))) return;

    const method = req.method.toUpperCase();
    let actionType = METHOD_ACTION[method];
    if (!actionType) return;

    // Refine POST sub-types from URL shape
    if (method === 'POST') {
      if (req.url.includes('/import')) actionType = 'IMPORT';
      else if (req.url.includes('/delete-multiple') || req.url.includes('/delete_multiple')) actionType = 'DELETE';
      else if (req.url.includes('/export')) actionType = 'EXPORT';
    }

    const route = this.router.url;
    const moduleCode = this.sessionTracking.resolveModuleCode(route);
    const recordId = this.extractRecordId(req, res, actionType);
    const resource = this.extractResource(req.url);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    this.direct.post(
      `${environment.apiUrl}${API.sessions.action}`,
      { action_type: actionType, route_path: route, module_code: moduleCode, record_id: recordId, resource },
      { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
    ).subscribe({ error: () => {} });
  }

  /**
   * Derive a human-readable resource name from the API URL.
   * /api/v1/class-levels/uuid → "Class Levels"
   * /api/v1/classes          → "Classes"
   */
  private extractResource(url: string): string {
    // Strip base, query string, then find the first non-UUID path segment
    const path = url.replace(environment.apiUrl, '').split('?')[0];
    const segments = path.split('/').filter(Boolean);
    const slug = segments.find((s) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
      && !['api', 'v1'].includes(s)
      && !['delete-multiple', 'import', 'export', 'dropdown'].includes(s),
    ) ?? '';
    // kebab-case → Title Case words  e.g. "class-levels" → "Class Levels"
    return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private extractRecordId(req: HttpRequest<any>, res: HttpResponse<any>, actionType: string): string | null {
    // For create: the new record ID is in the response body
    if (actionType === 'CREATE') {
      return (res.body as any)?.data?.id ?? null;
    }
    // For edit / delete: the ID is the last UUID segment of the request URL
    const last = req.url.split('/').pop() ?? '';
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(last) ? last : null;
  }
}
