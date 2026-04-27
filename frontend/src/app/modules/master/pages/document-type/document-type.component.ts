import { Component, ViewChild } from '@angular/core';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PermissionService } from '../../../../core/services/permission.service';
import { DocumentTypeListComponent } from './document-type-list/document-type-list.component';
import { DocumentTypeFormComponent } from './document-type-form/document-type-form.component';

@Component({
  selector: 'app-document-type',
  standalone: true,
  imports: [BreadcrumbComponent, ButtonComponent, DocumentTypeListComponent, DocumentTypeFormComponent],
  template: `
    <div class="mb-6"><app-breadcrumb /></div>

    <div class="mb-4 flex justify-end">
      @if (ps.canCreate(moduleCode)) {
        <app-button impact="bold" tone="primary" shape="rounded" size="medium" (buttonClick)="form?.openCreate()">
          + New Document Type
        </app-button>
      }
    </div>

    <app-document-type-list #list
      (onEditRecord)="form?.openEdit($event.id)"
      (onViewRecord)="form?.openView($event.id)" />

    <app-document-type-form #form
      (onSaved)="list?.reload()" />
  `,
})
export class DocumentTypeComponent {
  @ViewChild('list') list?: DocumentTypeListComponent;
  @ViewChild('form') form?: DocumentTypeFormComponent;

  readonly moduleCode = 'DOCUMENT_TYPES';

  constructor(public ps: PermissionService) {}
}
