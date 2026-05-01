import { Component, ViewChild } from '@angular/core';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PermissionService } from '../../../../core/services/permission.service';
import { CurriculumListComponent } from './curriculum-list/curriculum-list.component';
import { CurriculumFormComponent } from './curriculum-form/curriculum-form.component';

@Component({
  selector: 'app-curriculum-page',
  standalone: true,
  imports: [BreadcrumbComponent, ButtonComponent, CurriculumListComponent, CurriculumFormComponent],
  template: `
    <div class="mb-6"><app-breadcrumb /></div>

    <div class="mb-4 flex justify-end">
      @if (ps.canCreate(moduleCode)) {
        <app-button impact="bold" tone="primary" shape="rounded" size="medium" (buttonClick)="form?.openCreate()">
          + New Curriculum
        </app-button>
      }
    </div>

    <app-curriculum-list #list
      (onEditRecord)="form?.openEdit($event.id)"
      (onViewRecord)="form?.openView($event.id)" />

    <app-curriculum-form #form
      (onSaved)="list?.reload()" />
  `,
})
export class CurriculumPageComponent {
  @ViewChild('list') list?: CurriculumListComponent;
  @ViewChild('form') form?: CurriculumFormComponent;

  readonly moduleCode = 'CURRICULUM';

  constructor(public ps: PermissionService) {}
}
