import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TableFilterService {
  searchField = signal<string>('');
  statusField = signal<string>('');
  orderField = signal<string>('');
  pageField = signal<number>(1);
  pageSizeField = signal<number>(10);
}
