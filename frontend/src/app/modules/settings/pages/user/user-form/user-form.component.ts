import { Component, ViewChild } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FileUploadComponent, UploadedFile } from '../../../../../shared/components/file-upload/file-upload.component';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { API } from '../../../../../core/api/endpoints';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent, FileUploadComponent],
})
export class UserFormComponent extends FormPageBase {
  @ViewChild('profileUpload') profileUpload!: FileUploadComponent;

  listRoute = '/settings/user';
  resourcePath = API.users.base;

  groupLabel = '';
  profileImage: UploadedFile | null = null;

  // Locations
  allLocations: { id: string; name: string; code?: string }[] = [];
  selectedLocationIds: string[] = [];
  defaultLocationId = '';
  locationsLoading = false;
  locationError = '';

  protected buildForm(): FormGroup {
    return this.fb.group({
      username: ['', Validators.required],
      password: [''],
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [{ code: '+91', number: '' }],
      group_id: ['', Validators.required],
      is_active: [true],
    });
  }

  // Load the location dropdown in parallel with the record fetch, and toggle
  // the password required validator based on create vs edit — edit leaves it
  // blank to mean "keep current".
  override ngOnInit(): void {
    this.form = this.buildForm();
    const id = this.cs.getRouteParam(this.route, 'id');
    if (!id) {
      this.form.get('password')?.setValidators(Validators.required);
      this.form.get('password')?.updateValueAndValidity();
    }
    this.loadLocations();
    this.detectModeAndLoad();
  }

  protected override onRecordLoaded(user: any): void {
    this.form.patchValue({
      ...user,
      phone: { code: user.phone_code || '+91', number: user.phone || '' },
    });
    this.groupLabel = user.group_name || '';
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
    this.locationError = this.selectedLocationIds.length === 0 ? 'At least one location is required' : '';
    return !this.locationError;
  }

  protected override toPayload(): any {
    const val = this.form.value;
    const data: any = {
      ...val,
      phone: val.phone?.number || null,
      phone_code: val.phone?.code || '+91',
      location_ids: this.selectedLocationIds,
      default_location_id: this.defaultLocationId,
    };
    // Empty password on edit means "don't change"; drop it so the backend
    // doesn't overwrite with an empty hash.
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
      if (!this.defaultLocationId) {
        this.defaultLocationId = id;
      }
    }
    if (this.selectedLocationIds.length > 0) this.locationError = '';
  }

  setDefaultLocation(id: string): void {
    this.defaultLocationId = id;
  }
}
