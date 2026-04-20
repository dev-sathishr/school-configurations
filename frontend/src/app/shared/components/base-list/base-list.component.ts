import { Directive, inject, ViewChild } from '@angular/core';
import { CommonService } from '../../services/common/common.service';
import { PermissionService } from '../../../core/services/permission.service';
import { TableComponent } from '../table/table.component';

/**
 * Base class every CRUD list component extends. Owns the three navigations
 * (new / edit / view) and the shared table ViewChild so subclasses only
 * declare their column config + route specifics.
 *
 *   @Component({ imports: [TableComponent, ButtonComponent, BreadcrumbComponent] })
 *   export class UserListComponent extends BaseListComponent {
 *     apiUrl = API.users.base;
 *     deleteUrl = API.users.deleteMultiple;
 *     routeBase = '/settings/user';
 *     columns = [...];
 *     displayKeyMap = {...};
 *   }
 *
 * URLs must come from `core/api/endpoints.ts` — no raw literals here or anywhere.
 *
 * Lists that don't support view/delete simply don't wire those buttons in
 * their template — the methods exist but stay unused.
 *
 * The `@Directive()` decorator is required by Angular for any class that
 * uses decorators (`@ViewChild`) or DI (`inject()`); it's selectorless so
 * this doesn't register a real directive.
 */
@Directive()
export abstract class BaseListComponent {
  @ViewChild(TableComponent) table!: TableComponent;

  protected readonly cs = inject(CommonService);
  readonly ps = inject(PermissionService);

  /** REST base path passed to `<app-table>`. */
  abstract apiUrl: string;

  /** Frontend route prefix used to build add/edit/view URLs. */
  abstract routeBase: string;

  /** Optional — omit on lists that don't expose bulk delete. */
  deleteUrl = '';

  addNew(): void {
    this.cs.navigate({ url: `${this.routeBase}/new` });
  }

  editSelected(row: { id: string }): void {
    this.cs.navigate({ url: `${this.routeBase}/${row.id}/edit` });
  }

  viewSelected(row: { id: string }): void {
    this.cs.navigate({ url: `${this.routeBase}/${row.id}/view` });
  }
}
