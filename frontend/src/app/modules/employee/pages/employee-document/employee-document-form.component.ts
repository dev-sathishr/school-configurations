import { ChangeDetectorRef, Component, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FileUploadComponent, UploadedFile } from '../../../../shared/components/file-upload/file-upload.component';
import { CommonService } from '../../../../shared/services/common/common.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { API } from '../../../../core/api/endpoints';
import * as V from '../../../../shared/validators/common';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-employee-document-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, ModalComponent, FileUploadComponent],
  template: `
    <app-modal [visible]="showModal" [title]="modalTitle" size="medium" [draggable]="true" (onClose)="closeModal()">
      @if (loading) {
        <app-loader size="small" text="Loading..." />
      } @else {
        <form [formGroup]="form" class="space-y-4">
          <fieldset [disabled]="mode === 'view'" class="space-y-4 disabled:opacity-95">

            <div class="mb-4">
              <app-form-field [formGroup]="form" controlName="document_type_id"
                label="Document Type" fieldType="async-select"
                [asyncUrl]="docTypeUrl" asyncValueKey="id" asyncLabelKey="name"
                placeholder="Select document type"
                [required]="true" [submitted]="submitted" />
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <app-form-field [formGroup]="form" controlName="document_no"
                  [label]="docNoLabel"
                  [placeholder]="docNoPlaceholder" [maxLength]="100" [submitted]="submitted"
                  [required]="true" [uppercase]="true" />
                @if (docNoHint) {
                  <p class="text-muted-foreground mt-1 text-[11px]">{{ docNoHint }}</p>
                }
              </div>
              <app-form-field [formGroup]="form" controlName="expiry_date"
                label="Expiry Date" fieldType="date" />
            </div>

            <app-form-field [formGroup]="form" controlName="notes"
              label="Notes" fieldType="textarea" [rows]="2"
              placeholder="Any additional details..." [maxLength]="500" />

            <!-- File upload -->
            <div>
              <label class="text-foreground mb-1.5 block text-xs font-medium">
                Attach File <span class="text-red-500">*</span>
                <span class="text-muted-foreground font-normal">(PDF, image, Word — max 10 MB)</span>
              </label>
              <app-file-upload #fileUpload
                entityType="employee_document"
                [entityId]="editId"
                fileType="document"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                [maxSize]="10"
                displayStyle="dropzone"
                [initialFile]="currentFile" />
              @if (fileError) {
                <p class="mt-1 text-xs text-red-500">{{ fileError }}</p>
              }
            </div>

          </fieldset>
          @if (errorMessage) {
            <div class="rounded-md bg-red-50 p-3 text-xs text-red-600">{{ errorMessage }}</div>
          }
        </form>
      }

      <div modal-footer class="flex justify-end gap-3">
        <app-button impact="light" tone="light" shape="rounded" size="medium" type="button" (buttonClick)="closeModal()">
          {{ mode === 'view' ? 'Close' : 'Cancel' }}
        </app-button>
        @if (mode === 'view') {
          @if (ps.canEdit('EMPLOYEE_INFO')) {
            <app-button impact="bold" tone="primary" shape="rounded" size="medium" type="button" (buttonClick)="switchToEdit()">
              Edit
            </app-button>
          }
        } @else if (!loading) {
          <app-button impact="bold" tone="primary" shape="rounded" size="medium" type="button" [loading]="saving" (buttonClick)="submit()">
            {{ mode === 'create' ? 'Save' : 'Update' }}
          </app-button>
        }
      </div>
    </app-modal>
  `,
})
export class EmployeeDocumentFormComponent {
  @Output() onSaved = new EventEmitter<void>();
  @ViewChild('fileUpload') fileUpload?: FileUploadComponent;

  readonly ps = inject(PermissionService);
  private fb  = inject(FormBuilder);
  private cs  = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);

  showModal    = false;
  mode: FormMode = 'create';
  loading      = false;
  saving       = false;
  submitted    = false;
  errorMessage = '';
  currentFile: UploadedFile | null = null;

  private employeeId = '';
  editId = '';

  // Dynamic validation state from selected document type
  docNoLabel       = 'Document Number / ID';
  docNoPlaceholder = 'e.g. 1234 5678 9012';
  docNoHint        = '';
  private docTypePattern: string | null = null;

  readonly docTypeUrl = API.documentTypes.dropdown;

  form: FormGroup = this.buildForm();

  get modalTitle(): string {
    return { create: 'Add Document', edit: 'Edit Document', view: 'Document Details' }[this.mode];
  }

  fileError = '';

  private buildForm(): FormGroup {
    const form = this.fb.group({
      document_type_id: ['', Validators.required],
      document_no:      ['', [Validators.required, ...V.maxLength(100)]],
      expiry_date:      [''],
      notes:            ['', V.NOTES],
    });

    form.get('document_type_id')!.valueChanges.subscribe((typeId: string | null) => {
      this.onDocTypeChange(typeId ?? '', form);
    });

    return form;
  }

  private onDocTypeChange(typeId: string, form: FormGroup): void {
    if (!typeId) {
      this.resetDocNoMeta();
      this.applyDocNoValidators(form, null);
      return;
    }
    // The async-select emits the full option object when an item is selected;
    // typeId here is the raw value string (the id). We fetch from dropdown cache.
    // We call the detail endpoint to get validation fields.
    this.cs.getService({ url: API.documentTypes.detail(typeId) }).subscribe({
      next: (res: any) => {
        const d = res?.data;
        this.docNoLabel       = d?.document_no_label  || 'Document Number / ID';
        this.docTypePattern   = d?.validation_pattern  || null;
        this.docNoPlaceholder = this.buildPlaceholder(d?.document_no_label, d?.validation_pattern);
        this.docNoHint        = d?.validation_pattern ? `Must match format: ${d.validation_pattern}` : '';
        this.applyDocNoValidators(form, this.docTypePattern);
        this.cdr.markForCheck();
      },
      error: () => {
        this.resetDocNoMeta();
        this.applyDocNoValidators(form, null);
      },
    });
  }

  private resetDocNoMeta(): void {
    this.docNoLabel       = 'Document Number / ID';
    this.docNoPlaceholder = 'e.g. 1234 5678 9012';
    this.docNoHint        = '';
    this.docTypePattern   = null;
  }

  private buildPlaceholder(label: string | null, pattern: string | null): string {
    if (!label && !pattern) return 'e.g. 1234 5678 9012';
    // Derive a human-readable example from common patterns
    const examples: Record<string, string> = {
      '^[0-9]{12}$': '123456789012',
      '^[A-Z]{5}[0-9]{4}[A-Z]{1}$': 'ABCDE1234F',
      '^[A-Z][0-9]{7}$': 'A1234567',
      '^[A-Z]{3}[0-9]{7}$': 'ABC1234567',
    };
    if (pattern && examples[pattern]) return `e.g. ${examples[pattern]}`;
    if (label) return `Enter ${label}`;
    return 'e.g. 1234 5678 9012';
  }

  private applyDocNoValidators(form: FormGroup, pattern: string | null): void {
    const ctrl = form.get('document_no')!;
    const validators: ValidatorFn[] = [Validators.required, ...V.maxLength(100)];
    if (pattern) {
      try {
        new RegExp(pattern);
        validators.push(Validators.pattern(pattern));
      } catch { /* invalid regex in DB — skip */ }
    }
    ctrl.setValidators(validators);
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  openCreate(employeeId: string): void {
    this.employeeId   = employeeId;
    this.editId       = '';
    this.mode         = 'create';
    this.form         = this.buildForm();
    this.submitted    = false;
    this.errorMessage = '';
    this.fileError    = '';
    this.currentFile  = null;
    this.resetDocNoMeta();
    this.showModal    = true;
  }

  openEdit(employeeId: string, id: string): void {
    this.employeeId  = employeeId;
    this.editId      = id;
    this.mode        = 'edit';
    this.form        = this.buildForm();
    this.submitted   = false;
    this.errorMessage = '';
    this.loading     = true;
    this.showModal   = true;
    this.loadRecord(id);
  }

  openView(employeeId: string, id: string): void {
    this.employeeId  = employeeId;
    this.editId      = id;
    this.mode        = 'view';
    this.form        = this.buildForm();
    this.submitted   = false;
    this.errorMessage = '';
    this.loading     = true;
    this.showModal   = true;
    this.loadRecord(id);
  }

  switchToEdit(): void {
    this.mode = 'edit';
  }

  private loadRecord(id: string): void {
    this.cs.getService({ url: API.employeeDocuments.detail(this.employeeId, id) }).subscribe({
      next: (res: any) => {
        const d = res?.data;
        if (!d) return;
        this.form.patchValue({
          document_type_id: d.document_type_id || '',
          document_no:      d.document_no      || '',
          expiry_date:      d.expiry_date?.slice(0, 10) || '',
          notes:            d.notes            || '',
        });
        this.currentFile = d.file_id ? {
          id:            d.file_id,
          original_name: d.file_name,
          mime_type:     d.file_mime_type,
          size:          d.file_size,
          path:          d.file_path,
        } : null;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading     = false;
        this.showModal   = false;
        this.cdr.markForCheck();
      },
    });
  }

  submit(): void {
    this.submitted    = true;
    this.errorMessage = '';

    const hasFile = !!(this.fileUpload?.currentFile || this.fileUpload?.pendingFile);
    this.fileError = hasFile ? '' : 'File is required';
    if (this.form.invalid || !hasFile) return;

    this.saving = true;
    const payload = this.form.value;

    const isCreate = this.mode === 'create';
    const request$ = isCreate
      ? this.cs.postService({ url: API.employeeDocuments.base(this.employeeId), payload })
      : this.cs.putService({ url: API.employeeDocuments.detail(this.employeeId, this.editId), payload });

    request$.subscribe({
      next: (res: any) => {
        const savedId = res?.data?.id || this.editId;
        // Upload pending file (if any) after we have the record id
        const pendingUpload = isCreate && savedId
          ? this.fileUpload?.uploadPendingFile(savedId)
          : null;

        if (pendingUpload) {
          pendingUpload.subscribe({
            next:  () => this.afterSave(),
            error: () => this.afterSave(), // still saved the record even if upload fails
          });
        } else {
          this.afterSave();
        }
      },
      error: (err: any) => {
        this.saving       = false;
        this.errorMessage = err?.error?.message || 'Failed to save';
        this.cdr.markForCheck();
      },
    });
  }

  private afterSave(): void {
    this.saving    = false;
    this.showModal = false;
    this.cs.showToastr({ type: 'success', message: 'Document saved successfully' });
    this.onSaved.emit();
  }

  closeModal(): void {
    this.showModal    = false;
    this.errorMessage = '';
    this.fileError    = '';
    this.submitted    = false;
  }
}
