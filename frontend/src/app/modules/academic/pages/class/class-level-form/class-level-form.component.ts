import { ChangeDetectorRef, Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LocationFieldComponent } from '../../../../../shared/components/location-field/location-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { LocationContextService } from '../../../../../core/services/location-context.service';
import { API } from '../../../../../core/api/endpoints';
import { STATUS_BADGES, statusLabel } from '../../../../../core/constants/enums';
import * as V from '../../../../../shared/validators/common';

@Component({
  selector: 'app-class-level-form',
  templateUrl: './class-level-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LocationFieldComponent, LoaderComponent, BreadcrumbComponent, TableComponent],
})
export class ClassLevelFormComponent implements OnInit {
  @ViewChild(TableComponent) levelsTable!: TableComponent;

  readonly locationCtx = inject(LocationContextService);

  form!: FormGroup;
  editMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';
  classLabel = '';
  locationLabel = '';
  selectedClassId = '';

  // Edit-mode record location passed to <app-location-field> so it stays
  // visible even if not currently in the header selection.
  readonly recordLocation = signal<{ id: string; name: string; code: string } | null>(null);

  // Levels table
  levelsApiUrl = '';
  levelsDeleteUrl = API.classLevels.deleteMultiple;
  levelsColumns: ColumnConfig[] = [
    { key: 'cl.name', label: 'Section', sortable: true, searchable: true },
    { key: 'cl.capacity', label: 'Capacity', sortable: true },
    { key: 'loc.name', label: 'Location', sortable: true },
    { key: 'cl.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: STATUS_BADGES },
  ];
  levelsDisplayKeyMap: Record<string, string> = {
    'cl.name': 'name', 'cl.capacity': 'capacity',
    'loc.name': 'location_name',
    'cl.is_active': 'is_active',
  };
  levelsRowTransform = (row: any, mapped: any) => {
    mapped['cl.is_active'] = statusLabel(row.is_active);
    mapped['cl.capacity'] = row.capacity || 0;
    mapped['loc.name'] = row.location_name
      ? (row.location_code ? `${row.location_name} (${row.location_code})` : row.location_name)
      : '-';
    return mapped;
  };

  constructor(
    private cs: CommonService, private fb: FormBuilder,
    private route: ActivatedRoute, private cdr: ChangeDetectorRef,
    public ps: PermissionService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      location_id: ['', Validators.required],
      class_general_id: ['', Validators.required],
      name: ['', V.requiredMaxLength(100)],
      capacity: [0],
      is_active: [true],
      notes: ['', V.NOTES],
    });

    // Listen for class dropdown changes to update the table
    this.form.get('class_general_id')?.valueChanges.subscribe((classId: string) => {
      this.onClassChange(classId);
    });

    // Pre-select class general from query param
    const classGeneralId = this.route.snapshot.queryParamMap.get('class_general_id');
    if (classGeneralId) {
      this.form.patchValue({ class_general_id: classGeneralId });
      this.selectedClassId = classGeneralId;
      this.levelsApiUrl = API.classLevels.byClass(classGeneralId);
      this.loadClassLabel(classGeneralId);
    }

    // Convenience: pre-fill the location when we can choose unambiguously
    // (one selected, or the user's default is among the selection). Only on
    // create — edit mode has its own load path below.
    if (!this.cs.getRouteParam(this.route, 'id')) {
      const preferred = this.locationCtx.preferredLocationId();
      if (preferred) this.form.patchValue({ location_id: preferred });
    }

    const id = this.cs.getRouteParam(this.route, 'id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loading = true;
      this.cs.getService({ url: API.classLevels.detail(id) }).subscribe({
        next: (res: any) => {
          const d = res.data;
          this.form.patchValue(d);
          this.classLabel = d.class_code ? `${d.class_name} (${d.class_code})` : (d.class_name || '');
          this.locationLabel = d.location_name
            ? (d.location_code ? `${d.location_name} (${d.location_code})` : d.location_name)
            : '';
          this.recordLocation.set(d.location_id ? {
            id: d.location_id,
            name: d.location_name || '',
            code: d.location_code || '',
          } : null);
          this.selectedClassId = d.class_general_id;
          this.levelsApiUrl = API.classLevels.byClass(d.class_general_id);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cs.navigate({ url: '/academic/class' }); },
      });
    }
  }

  private loadClassLabel(classId: string): void {
    this.cs.getService({ url: API.classes.detail(classId) }).subscribe({
      next: (res: any) => {
        const d = res.data;
        this.classLabel = d.code ? `${d.name} (${d.code})` : d.name;
        this.cdr.detectChanges();
      },
    });
  }

  get f() { return this.form.controls; }

  onClassChange(classId: string): void {
    this.selectedClassId = classId;
    if (classId) {
      // Temporarily clear to force table re-creation
      this.levelsApiUrl = '';
      this.cdr.detectChanges();
      this.levelsApiUrl = API.classLevels.byClass(classId);
      this.cdr.detectChanges();
    } else {
      this.levelsApiUrl = '';
    }
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) return;

    this.saving = true;
    const data = this.form.value;

    const req = this.editMode
      ? this.cs.putService({ url: API.classLevels.detail(this.editId), payload: data })
      : this.cs.postService({ url: API.classLevels.base, payload: data });

    req.subscribe({
      next: () => {
        this.saving = false;
        this.cs.showToastr({
          type: 'success',
          message: this.editMode ? 'Section updated' : 'Section created',
          description: this.editMode ? 'Changes saved successfully' : 'New section has been added',
        });
        // Reset form for next entry, keep class selected & refresh table
        if (!this.editMode) {
          const classId = this.form.value.class_general_id;
          const reset: any = { class_general_id: classId, capacity: 0, is_active: true, notes: '' };
          // Carry the preferred location forward — same pre-fill policy as
          // initial load, applied on consecutive creates too.
          const preferred = this.locationCtx.preferredLocationId();
          if (preferred) reset.location_id = preferred;
          this.form.reset(reset);
          this.submitted = false;
          // Force table refresh
          this.onClassChange(classId);
        } else {
          this.cs.navigate({ url: `/academic/class/${this.selectedClassId}/edit`, queryParams: { tab: 'levels' } });
        }
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Something went wrong';
      },
    });
  }

  editLevel(row: any): void {
    this.cs.navigate({ url: `/academic/class-level/${row.id}/edit` });
  }

  cancel(): void {
    if (this.selectedClassId) {
      this.cs.navigate({ url: `/academic/class/${this.selectedClassId}/edit`, queryParams: { tab: 'levels' } });
    } else {
      this.cs.navigate({ url: '/academic/class' });
    }
  }
}
