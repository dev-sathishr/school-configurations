import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-class-form',
  templateUrl: './class-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent, TableComponent],
})
export class ClassFormComponent implements OnInit {
  // General form
  form!: FormGroup;
  editMode = false;
  editId = '';
  submitted = false;
  saving = false;
  loading = false;
  errorMessage = '';
  activeTab: 'general' | 'levels' = 'general';
  classGeneralSaved = false; // tracks if general was saved (for create flow)

  // Levels tab - class general select
  classLabel = '';
  selectedClassId = '';

  academicLevelOptions = [
    { value: 'nursery', label: 'Nursery' },
    { value: 'primary', label: 'Primary' },
    { value: 'middle', label: 'Middle' },
    { value: 'secondary', label: 'Secondary' },
    { value: 'higher_secondary', label: 'Higher Secondary' },
  ];

  sectionOptions = Array.from({ length: 26 }, (_, i) => {
    const letter = String.fromCharCode(65 + i);
    return { value: letter, label: letter };
  });

  currentClassCode = '';

  // Level form
  levelForm!: FormGroup;
  levelSubmitted = false;
  levelSaving = false;
  levelEditMode = false;
  levelEditId = '';
  levelError = '';
  levelFormExpanded = false;

  // Levels table
  levelsApiUrl = '';
  levelsDeleteUrl = '/class-levels/delete-multiple';
  levelsColumns: ColumnConfig[] = [
    { key: 'cl.code', label: 'Code', sortable: true, searchable: true },
    { key: 'cl.section', label: 'Section', sortable: true },
    { key: 'cl.capacity', label: 'Capacity', sortable: true },
    { key: 'cl.is_active', label: 'Status', sortable: true, type: 'badge', badgeMap: {
      'Active': { label: 'Active', class: 'bg-green-500/10 text-green-700' },
      'Inactive': { label: 'Inactive', class: 'bg-red-500/10 text-red-700' },
    }},
    { key: 'updated_by_name', label: 'Updated By' },
  ];
  levelsDisplayKeyMap: Record<string, string> = {
    'cl.code': 'code', 'cl.section': 'section', 'cl.capacity': 'capacity',
    'cl.is_active': 'is_active', 'updated_by_name': 'updated_by_name',
  };
  levelsRowTransform = (row: any, mapped: any) => {
    mapped['cl.is_active'] = row.is_active ? 'Active' : 'Inactive';
    mapped['cl.capacity'] = row.capacity || 0;
    mapped['cl.section'] = row.section || '-';
    return mapped;
  };

  constructor(
    private cs: CommonService, private fb: FormBuilder,
    private route: ActivatedRoute, private cdr: ChangeDetectorRef,
    public ps: PermissionService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      code: ['', [Validators.maxLength(50)]],
      strength: [0],
      academic_level: ['primary', Validators.required],
      is_active: [true],
      notes: ['', [Validators.maxLength(500)]],
    });

    this.levelForm = this.fb.group({
      class_general_id: ['', Validators.required],
      section: [''],
      code: ['', [Validators.required, Validators.maxLength(100)]],
      capacity: [0],
      is_active: [true],
      notes: ['', [Validators.maxLength(500)]],
    });

    const id = this.cs.getRouteParam(this.route, 'id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.classGeneralSaved = true;
      this.selectedClassId = id;
      this.levelsApiUrl = `/class-levels?class_general_id=${id}`;
      this.levelForm.patchValue({ class_general_id: id });

      const tab = this.route.snapshot.queryParamMap.get('tab');
      if (tab === 'levels') this.activeTab = 'levels';

      this.loading = true;
      this.cs.getService({ url: `/classes/${id}` }).subscribe({
        next: (res: any) => {
          const d = res.data;
          this.form.patchValue(d);
          this.classLabel = d.code ? `${d.name} (${d.code})` : d.name;
          this.currentClassCode = d.code || d.name || '';
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cs.navigate({ url: '/academic/class' }); },
      });
    }

    // Listen for class dropdown changes in levels tab
    this.levelForm.get('class_general_id')?.valueChanges.subscribe((classId: string) => {
      if (classId && classId !== this.selectedClassId) {
        this.selectedClassId = classId;
        // Fetch class code to support auto-code generation
        this.cs.getService({ url: `/classes/${classId}` }).subscribe({
          next: (res: any) => {
            this.currentClassCode = res.data?.code || res.data?.name || '';
            this.updateLevelCode();
          },
        });
        this.refreshLevelsTable(classId);
      }
    });

    // Auto-generate code when section changes
    this.levelForm.get('section')?.valueChanges.subscribe(() => this.updateLevelCode());
  }

  get f() { return this.form.controls; }
  get lf() { return this.levelForm.controls; }

  private updateLevelCode(): void {
    if (this.levelEditMode) return; // don't overwrite when editing existing
    const section = this.levelForm.get('section')?.value;
    if (this.currentClassCode && section) {
      this.levelForm.patchValue({ code: `${this.currentClassCode} ${section}` }, { emitEvent: false });
    }
  }

  // --- General tab ---

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) { this.activeTab = 'general'; return; }

    this.saving = true;
    const data = this.form.value;

    const req = this.editMode
      ? this.cs.putService({ url: `/classes/${this.editId}`, payload: data })
      : this.cs.postService({ url: '/classes', payload: data });

    req.subscribe({
      next: (res: any) => {
        this.saving = false;
        this.cs.showToastr({
          type: 'success',
          message: this.editMode ? 'Class updated' : 'Class created',
          description: this.editMode ? 'Changes saved successfully' : 'New class has been added',
        });

        if (!this.editMode) {
          // After create: set IDs and switch to levels tab
          const created = res.data;
          this.editMode = true;
          this.editId = created.id;
          this.classGeneralSaved = true;
          this.selectedClassId = created.id;
          this.classLabel = created.code ? `${created.name} (${created.code})` : created.name;
          this.currentClassCode = created.code || created.name || '';
          this.levelForm.patchValue({ class_general_id: created.id });
          this.levelsApiUrl = `/class-levels?class_general_id=${created.id}`;
          this.activeTab = 'levels';
          this.cdr.detectChanges();
        } else {
          this.cs.navigate({ url: '/academic/class' });
        }
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Something went wrong';
      },
    });
  }

  // --- Levels tab ---

  onLevelSubmit(): void {
    this.levelSubmitted = true;
    this.levelError = '';
    if (this.levelForm.invalid) return;

    this.levelSaving = true;
    const data = this.levelForm.value;

    const req = this.levelEditMode
      ? this.cs.putService({ url: `/class-levels/${this.levelEditId}`, payload: data })
      : this.cs.postService({ url: '/class-levels', payload: data });

    req.subscribe({
      next: () => {
        this.levelSaving = false;
        this.cs.showToastr({
          type: 'success',
          message: this.levelEditMode ? 'Section updated' : 'Section created',
        });
        this.resetLevelForm();
        this.refreshLevelsTable(this.selectedClassId);
      },
      error: (err: any) => {
        this.levelSaving = false;
        this.levelError = err.error?.message || 'Something went wrong';
      },
    });
  }

  editLevel(row: any): void {
    this.levelEditMode = true;
    this.levelEditId = row.id;
    this.levelForm.patchValue({
      class_general_id: row.class_general_id || this.selectedClassId,
      section: row.section || '',
      code: row.code,
      capacity: row.capacity,
      is_active: row.is_active,
      notes: row.notes || '',
    });
    this.levelSubmitted = false;
    this.levelError = '';
    this.levelFormExpanded = true;
    // Scroll to top of form
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }

  toggleLevelForm(): void {
    this.levelFormExpanded = !this.levelFormExpanded;
  }

  cancelLevelEdit(): void {
    this.resetLevelForm();
  }

  private resetLevelForm(): void {
    this.levelEditMode = false;
    this.levelEditId = '';
    this.levelForm.reset({ class_general_id: this.selectedClassId, section: '', code: '', capacity: 0, is_active: true, notes: '' });
    this.levelSubmitted = false;
    this.levelError = '';
    this.levelFormExpanded = false;
  }

  private refreshLevelsTable(classId: string): void {
    this.levelsApiUrl = '';
    this.cdr.detectChanges();
    this.levelsApiUrl = `/class-levels?class_general_id=${classId}`;
    this.cdr.detectChanges();
  }

  cancel() { this.cs.navigate({ url: '/academic/class' }); }
}
