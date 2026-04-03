import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { throwError, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {

  public baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(options: any = {}): HttpHeaders {
    let headers = new HttpHeaders();
    if (options.headers) {
      headers = new HttpHeaders(options.headers);
    }
    return headers;
  }

  postService({ _baseUrl = this.baseUrl, url = '', payload = {}, params = {}, options = {} }:
    { _baseUrl?: string; url: string; payload?: any; params?: any; options?: any }): Observable<any> {
    const headers = this.getHeaders(options);
    return this.http.post(_baseUrl + url, payload, { params, headers }).pipe(
      map((res) => res),
      catchError((err) => throwError(() => err))
    );
  }

  putService({ _baseUrl = this.baseUrl, url = '', payload = {}, params = {}, options = {} }:
    { _baseUrl?: string; url: string; payload?: any; params?: any; options?: any }): Observable<any> {
    const headers = this.getHeaders(options);
    return this.http.put(_baseUrl + url, payload, { params, headers }).pipe(
      map((res) => res),
      catchError((err) => throwError(() => err))
    );
  }

  patchService({ _baseUrl = this.baseUrl, url = '', payload = {}, params = {}, options = {} }:
    { _baseUrl?: string; url: string; payload?: any; params?: any; options?: any }): Observable<any> {
    const headers = this.getHeaders(options);
    return this.http.patch(_baseUrl + url, payload, { params, headers }).pipe(
      map((res) => res),
      catchError((err) => throwError(() => err))
    );
  }

  getService({ _baseUrl = this.baseUrl, url = '', params = {}, options = {} }:
    { _baseUrl?: string; url: string; params?: any; options?: any }): Observable<any> {
    const headers = this.getHeaders(options);
    return this.http.get(_baseUrl + url, { params, headers }).pipe(
      map((res) => res),
      catchError((err) => throwError(() => err))
    );
  }

  deleteService({ _baseUrl = this.baseUrl, url = '', params = {}, options = {} }:
    { _baseUrl?: string; url: string; params?: any; options?: any }): Observable<any> {
    const headers = this.getHeaders(options);
    return this.http.delete(_baseUrl + url, { params, headers }).pipe(
      map((res) => res),
      catchError((err) => throwError(() => err))
    );
  }

  postFile({ _baseUrl = this.baseUrl, url = '', formData = new FormData(), params = {}, options = {} }:
    { _baseUrl?: string; url: string; formData: any; params?: any; options?: any }): Observable<any> {
    const headers = this.getHeaders(options);
    return this.http.post(_baseUrl + url, formData, { params, headers }).pipe(
      map((res) => res),
      catchError((err) => throwError(() => err))
    );
  }

  putFile({ _baseUrl = this.baseUrl, url = '', formData = new FormData(), params = {}, options = {} }:
    { _baseUrl?: string; url: string; formData: any; params?: any; options?: any }): Observable<any> {
    const headers = this.getHeaders(options);
    return this.http.put(_baseUrl + url, formData, { params, headers }).pipe(
      map((res) => res),
      catchError((err) => throwError(() => err))
    );
  }

  getFile({ _baseUrl = this.baseUrl, url = '' }:
    { _baseUrl?: string; url: string }): Observable<Blob> {
    return this.http.get(_baseUrl + url, { responseType: 'blob' }).pipe(
      map((res) => res),
      catchError((err) => throwError(() => err))
    );
  }
}
