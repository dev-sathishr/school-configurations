import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from '../../../../../shared/services/common/common.service';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { TableComponent } from '../../../../../shared/components/table/table.component';
import { ColumnConfig } from '../../../../../shared/components/table/services/table-filter.service';
import { PermissionService } from '../../../../../core/services/permission.service';
import { HasPermissionDirective } from '../../../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-class-level-form',
  templateUrl: './class-level-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent, TableComponent, HasPermissionDirective],
})
export class ClassLevelFormComponent implements OnInit {
  @ViewChild(TableComponent) levelsTable!: TableComponent;

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

  // Levels table
  levelsApiUrl = '';
  levelsDeleteUrl = '/class-levels/delete-multiple';
  levelsColumns: ColumnConfig[] = [
    { key: 'cl.name', label: 'Section', sortable: true, searchable: true },
    { key: 'cl.capacity', label: 'Capacity', sortable: true },
    { key: 'loc.name', label: 'Location', sortable: true },
    { key: 'cl.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: {
      'Active': { label: 'Active', class: 'bg-green-500/10 text-green-700' },
      'Inactive': { label: 'Inactive', class: 'bg-red-500/10 text-red-700' },
    }},
  ];
  levelsDisplayKeyMap: Record<string, string> = {
    'cl.name': 'name', 'cl.capacity': 'capacity',
    'loc.name': 'location_name',
    'cl.is_active': 'is_active',
  };
  levelsRowTransform = (row: any, mapped: any) => {
    mapped['cl.is_active'] = row.is_active ? 'Active' : 'Inactive';
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
      name: ['', [Validators.required, Validators.maxLength(100)]],
      capacity: [0],
      is_active: [true],
      notes: ['', [Validators.maxLength(500)]],
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
      this.levelsApiUrl = `/class-levels?class_general_id=${classGeneralId}`;
      this.loadClassLabel(classGeneralId);
    }

    const id = this.cs.getRouteParam(this.route, 'id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loading = true;
      this.cs.getService({ url: `/class-levels/${id}` }).subscribe({
        next: (res: any) => {
          const d = res.data;
          this.form.patchValue(d);
          this.classLabel = d.class_code ? `${d.class_name} (${d.class_code})` : (d.class_name || '');
          this.locationLabel = d.location_name
            ? (d.location_code ? `${d.location_name} (${d.location_code})` : d.location_name)
            : '';
          this.selectedClassId = d.class_general_id;
          this.levelsApiUrl = `/class-levels?class_general_id=${d.class_general_id}`;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cs.navigate({ url: '/academic/class' }); },
      });
    }
  }

  private loadClassLabel(classId: string): void {
    this.cs.getService({ url: `/classes/${classId}` }).subscribe({
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
      this.levelsApiUrl = `/class-levels?class_general_id=${classId}`;
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
      ? this.cs.putService({ url: `/class-levels/${this.editId}`, payload: data })
      : this.cs.postService({ url: '/class-levels', payload: data });

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
          this.form.reset({ class_general_id: classId, capacity: 0, is_active: true, notes: '' });
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
