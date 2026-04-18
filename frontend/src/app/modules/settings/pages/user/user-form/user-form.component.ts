import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FileUploadComponent, UploadedFile } from '../../../../../shared/components/file-upload/file-upload.component';
@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent, FileUploadComponent],
})
export class UserFormComponent implements OnInit {
  @ViewChild('profileUpload') profileUpload!: FileUploadComponent;

  form!: FormGroup;
  editMode = false;
  viewMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';
  groupLabel = '';
  profileImage: UploadedFile | null = null;

  // Locations
  allLocations: { id: string; name: string; code?: string }[] = [];
  selectedLocationIds: string[] = [];
  defaultLocationId = '';
  locationsLoading = false;
  locationError = '';

  constructor(
    private cs: CommonService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    public ps: PermissionService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: [''],
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [{ code: '+91', number: '' }],
      group_id: ['', Validators.required],
      is_active: [true],
    });

    this.loadLocations();
    const id = this.cs.getRouteParam(this.route, 'id');
    if (id) {
      const segments = this.route.snapshot.url;
      const lastPath = segments[segments.length - 1]?.path;
      this.viewMode = lastPath === 'view';
      this.editMode = !this.viewMode;
      this.editId = id;
      this.loading = true;
      this.cs.getService({ url: `/users/${id}` }).subscribe({
        next: (res: any) => {
          const user = res.user || res.data || res;
          this.form.patchValue({
            ...user,
            phone: { code: user.phone_code || '+91', number: user.phone || '' },
          });
          this.groupLabel = user.group_name || '';
          this.profileImage = user.profile_image || null;
          this.form.get('password')?.clearValidators();
          this.form.get('password')?.updateValueAndValidity();

          // Load user locations
          if (user.locations && user.locations.length > 0) {
            this.selectedLocationIds = user.locations.map((l: any) => l.id);
            const defaultLoc = user.locations.find((l: any) => l.is_default);
            this.defaultLocationId = defaultLoc?.id || user.locations[0].id;
          }

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); this.cs.navigate({ url: '/settings/user' }); },
      });
    } else {
      this.form.get('password')?.setValidators(Validators.required);
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  get f() { return this.form.controls; }

  private loadLocations(): void {
    this.locationsLoading = true;
    this.cs.getService({ url: '/locations/dropdown?size=100' }).subscribe({
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
      // If removed the default, pick next available as default
      if (this.defaultLocationId === id) {
        this.defaultLocationId = this.selectedLocationIds[0] || '';
      }
    } else {
      this.selectedLocationIds = [...this.selectedLocationIds, id];
      // Auto-set default if this is the first selection
      if (!this.defaultLocationId) {
        this.defaultLocationId = id;
      }
    }
    if (this.selectedLocationIds.length > 0) this.locationError = '';
  }

  setDefaultLocation(id: string): void {
    this.defaultLocationId = id;
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    this.locationError = this.selectedLocationIds.length === 0 ? 'At least one location is required' : '';

    if (this.form.invalid || this.locationError) return;

    this.saving = true;
    const val = this.form.value;
    const data: any = {
      ...val,
      phone: val.phone?.number || null,
      phone_code: val.phone?.code || '+91',
      location_ids: this.selectedLocationIds,
      default_location_id: this.defaultLocationId,
    };
    if (this.editMode && !data.password) delete data.password;

    const req = this.editMode
      ? this.cs.putService({ url: `/users/${this.editId}`, payload: data })
      : this.cs.postService({ url: '/users', payload: data });

    req.subscribe({
      next: (res: any) => {
        const createdId = res?.data?.id || res?.user?.id;
        const pendingUpload = !this.editMode && createdId ? this.profileUpload?.uploadPendingFile(createdId) : null;
        if (pendingUpload) {
          pendingUpload.subscribe({
            next: () => this.navigateAfterSave(),
            error: () => this.navigateAfterSave(),
          });
        } else {
          this.navigateAfterSave();
        }
      },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Something went wrong'; },
    });
  }

  private navigateAfterSave(): void {
    this.saving = false;
    this.cs.navigate({ url: '/settings/user' });
  }

  cancel() { this.cs.navigate({ url: '/settings/user' }); }

  switchToEdit() {
    this.cs.navigate({ url: `/settings/user/${this.editId}/edit` });
  }
}
