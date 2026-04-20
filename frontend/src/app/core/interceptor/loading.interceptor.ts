import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../../shared/services/loading/loading.service';

/**
 * Bumps the shared request counter for every outgoing HTTP call. The global
 * loading bar listens to that counter and animates while any request is in
 * flight — a cheap and pervasive "something is happening" signal.
 *
 * Skips the `/sessions/activity` ping since that's a fire-and-forget audit
 * call and shouldn't flicker the bar on every route change.
 */
@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private loading: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url.includes('/sessions/activity')) {
      return next.handle(req);
    }
    this.loading.start();
    return next.handle(req).pipe(finalize(() => this.loading.stop()));
  }
}
