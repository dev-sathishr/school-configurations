import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { CommonService } from '../../shared/services/common/common.service';
import { API } from '../../core/api/endpoints';

export interface FieldDef {
  field_name: string;
  field_label: string;
  field_type: string;
  display_order: number;
  col_span: number;
  section_name: string | null;
  validators: { required?: boolean; min?: number; max?: number; transform?: string };
  is_unique: boolean;
  is_searchable: boolean;
  is_filterable: boolean;
  is_hidden: boolean;
  show_in_list: boolean;
  help_text: string | null;
  select_options: any[] | null;
  ref_doctype_slug: string | null;
  default_value: string | null;
}

export interface DoctypeConfig {
  slug: string;
  label: string;
  plural_label: string;
  is_location_scoped: boolean;
  display_mode: 'page' | 'modal' | 'tab-group';
  modal_size: 'small' | 'medium' | 'large' | 'xlarge';
  tab_children: string[] | null;
  fields: FieldDef[];
}

@Injectable({ providedIn: 'root' })
export class DoctypeConfigService {
  private cache = new Map<string, DoctypeConfig>();

  constructor(private cs: CommonService) {}

  get(slug: string): Observable<DoctypeConfig | null> {
    if (this.cache.has(slug)) {
      return of(this.cache.get(slug)!);
    }
    return this.cs.getService({ url: API.engineMeta.detail(slug) }).pipe(
      map((res: any) => res?.data ?? null),
      tap((doc: DoctypeConfig | null) => { if (doc) this.cache.set(slug, doc); })
    );
  }

  invalidate(slug: string): void {
    this.cache.delete(slug);
  }
}
