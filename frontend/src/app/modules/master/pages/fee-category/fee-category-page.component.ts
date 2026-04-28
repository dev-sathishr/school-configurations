import { Component, ViewChild } from '@angular/core';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PermissionService } from '../../../../core/services/permission.service';
import { FeeCategoryListComponent } from './fee-category-list/fee-category-list.component';
import { FeeCategoryFormComponent } from './fee-category-form/fee-category-form.component';

@Component({
  selector: 'app-fee-category-page',
  standalone: true,
  imports: [BreadcrumbComponent, ButtonComponent, FeeCategoryListComponent, FeeCategoryFormComponent],
  template: `
    <div class="mb-6"><app-breadcrumb /></div>

    <div class="mb-4 flex justify-end">
      @if (ps.canCreate(moduleCode)) {
        <app-button impact="bold" tone="primary" shape="rounded" size="medium" (buttonClick)="form?.openCreate()">
          + New Fee Category
        </app-button>
      }
    </div>

    <app-fee-category-list #list
      (onEditRecord)="form?.openEdit($event.id)"
      (onViewRecord)="form?.openView($event.id)" />

    <app-fee-category-form #form
      (onSaved)="list?.reload()" />
  `,
})
export class FeeCategoryPageComponent {
  @ViewChild('list') list?: FeeCategoryListComponent;
  @ViewChild('form') form?: FeeCategoryFormComponent;

  readonly moduleCode = 'FEE_CATEGORIES';

  constructor(public ps: PermissionService) {}
}
