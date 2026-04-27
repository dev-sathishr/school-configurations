import { Component, ViewChild } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FileUploadComponent, UploadedFile } from '../../../../../shared/components/file-upload/file-upload.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { API } from '../../../../../core/api/endpoints';
import { PERSON_TYPE_OPTIONS } from '../../../../../core/constants/enums';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent, FileUploadComponent, TitleCasePipe],
})
export class UserFormComponent extends FormPageBase {
  @ViewChild('profileUpload') profileUpload!: FileUploadComponent;

  listRoute = '/settings/user';
  resourcePath = API.users.base;

  readonly personTypeOptions = PERSON_TYPE_OPTIONS;

  groupLabel = '';
  personLabel = '';
  profileImage: UploadedFile | null = null;

  // Locations
  allLocations: { id: string; name: string; code?: string }[] = [];
  selectedLocationIds: string[] = [];
  defaultLocationId = '';
  locationsLoading = false;
  locationError = '';

  protected buildForm(): FormGroup {
    return this.fb.group({
      person_type: ['staff', Validators.required],
      person_id:   [''],
      username:    ['', Validators.required],
      password:    [''],
      full_name:   ['', Validators.required],
      email:       ['', [Validators.required, Validators.email]],
      phone:       [{ code: '+91', number: '' }],
      group_id:    ['', Validators.required],
      is_active:   [true],
    });
  }

  override ngOnInit(): void {
    this.form = this.buildForm();
    const id = this.cs.getRouteParam(this.route, 'id');
    if (!id) {
      this.form.get('password')?.setValidators(Validators.required);
      this.form.get('password')?.updateValueAndValidity();
    }

    // When person_type changes, clear person_id and reset group
    this.form.get('person_type')?.valueChanges.subscribe(() => {
      this.form.patchValue({ person_id: '', group_id: '' });
      this.groupLabel = '';
      this.personLabel = '';
    });

    // When person is selected, auto-fill name/email/phone
    this.form.get('person_id')?.valueChanges.subscribe((id: string) => {
      if (id) this.autoFillFromPerson(id);
    });

    this.loadLocations();
    this.detectModeAndLoad();
  }

  get personType(): string {
    return this.form.get('person_type')?.value || 'staff';
  }

  get needsPersonPicker(): boolean {
    return ['employee', 'student', 'parent'].includes(this.personType);
  }

  get personPickerUrl(): string {
    if (this.personType === 'employee') {
      const excludeParam = this.editId ? `&exclude_user_id=${this.editId}` : '';
      return `${API.employees.linkable}?size=20${excludeParam}`;
    }
    return '';
  }

  get groupDropdownUrl(): string {
    return API.groups.dropdown;
  }

  private autoFillFromPerson(personId: string): void {
    if (this.personType !== 'employee' || !personId) return;
    this.cs.getService({ url: API.employees.detail(personId) }).subscribe({
      next: (res: any) => {
        const emp = res?.data;
        if (!emp) return;
        this.form.patchValue({
          full_name: emp.employee_name || this.form.get('full_name')?.value,
          email:     emp.email         || this.form.get('email')?.value,
          phone: {
            code:   emp.primary_contact_code || '+91',
            number: emp.primary_contact_no   || '',
          },
        });
        // Carry over the employee's photo as the profile image preview
        this.profileImage = emp.photo_file_id
          ? { id: emp.photo_file_id, original_name: '', mime_type: 'image/jpeg', size: 0, path: '' }
          : null;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  protected override onRecordLoaded(user: any): void {
    this.form.patchValue({
      ...user,
      person_type: user.person_type || 'staff',
      person_id:   user.person_id   || '',
      group_id:    user.group?.id   || '',
      phone: { code: user.phone_code || '+91', number: user.phone || '' },
    });
    this.groupLabel  = user.group?.name || '';
    this.personLabel = user.person_name || '';
    this.profileImage = user.profile_image || null;
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();

    if (user.locations?.length) {
      this.selectedLocationIds = user.locations.map((l: any) => l.id);
      const defaultLoc = user.locations.find((l: any) => l.is_default);
      this.defaultLocationId = defaultLoc?.id || user.locations[0].id;
    }
  }

  protected override beforeSubmit(): boolean {
    if (this.needsPersonPicker && !this.form.get('person_id')?.value) {
      const label = this.personTypeOptions.find(o => o.value === this.personType)?.label || 'Person';
      this.cs.showToastr({ type: 'error', message: `Please select a ${label}` });
      return false;
    }
    this.locationError = this.selectedLocationIds.length === 0 ? 'At least one location is required' : '';
    return !this.locationError;
  }

  protected override toPayload(): any {
    const val = this.form.value;
    const data: any = {
      ...val,
      phone:      val.phone?.number || null,
      phone_code: val.phone?.code   || '+91',
      person_id:  val.person_id     || null,
      location_ids:        this.selectedLocationIds,
      default_location_id: this.defaultLocationId,
    };
    if (this.editMode && !data.password) delete data.password;
    return data;
  }

  protected override afterSave(res: any): void {
    this.cs.showToastr({ type: 'success', message: res?.message || 'Saved successfully' });
    const createdId = res?.data?.id;
    const pendingUpload = !this.editMode && createdId ? this.profileUpload?.uploadPendingFile(createdId) : null;
    if (pendingUpload) {
      pendingUpload.subscribe({
        next: () => this.navigateAfterSave(),
        error: () => this.navigateAfterSave(),
      });
    } else {
      this.navigateAfterSave();
    }
  }

  private navigateAfterSave(): void {
    this.saving = false;
    this.cs.navigate({ url: this.listRoute });
  }

  private loadLocations(): void {
    this.locationsLoading = true;
    this.cs.getService({ url: `${API.locations.dropdown}?size=100` }).subscribe({
      next: (res: any) => {
        this.allLocations = (res.data || []).map((l: any) => {
          const match = l.name.match(/^(.+)\s\(([^)]+)\)$/);
          return match ? { id: l.id, name: match[1], code: match[2] } : { id: l.id, name: l.name };
        });
        this.locationsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.locationsLoading = false; this.cdr.detectChanges(); },
    });
  }

  isLocationSelected(id: string): boolean {
    return this.selectedLocationIds.includes(id);
  }

  toggleLocation(id: string): void {
    const idx = this.selectedLocationIds.indexOf(id);
    if (idx >= 0) {
      this.selectedLocationIds = this.selectedLocationIds.filter(v => v !== id);
      if (this.defaultLocationId === id) {
        this.defaultLocationId = this.selectedLocationIds[0] || '';
      }
    } else {
      this.selectedLocationIds = [...this.selectedLocationIds, id];
      if (!this.defaultLocationId) this.defaultLocationId = id;
    }
    if (this.selectedLocationIds.length > 0) this.locationError = '';
  }

  setDefaultLocation(id: string): void {
    this.defaultLocationId = id;
  }
}
