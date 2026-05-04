import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API } from '../../../../../../core/api/endpoints';
import {
  ASSESSMENT_TYPE_OPTIONS,
  ASSESSMENT_RESULT_OPTIONS,
  ASSESSMENT_GRADE_OPTIONS,
} from '../../../../../../core/constants/enums';
import { CommonService } from '../../../../../../shared/services/common/common.service';
import { FormFieldComponent } from '../../../../../../shared/components/form-field/form-field.component';
import * as V from '../../../../../../shared/validators/common';

@Component({
  selector: 'app-assessment-form',
  templateUrl: './assessment-form.component.html',
  imports: [ReactiveFormsModule, FormFieldComponent],
})
export class AssessmentFormComponent implements OnChanges {
  @Input() profileId    = '';
  @Input() assessmentId = '';
  @Input() viewMode     = false;

  @Output() saved     = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  submitted    = false;
  readonly saving = signal(false);
  errorMessage = '';

  readonly nextAssessmentNo = signal('');
  readonly assessmentNo     = signal('');

  // Locked-in linkage labels for the async dropdowns shown in edit mode
  linkedEnquiryId    = '';
  linkedEnquiryLabel = '';
  selectedAssessedByLabel = '';
  selectedSanctionedClassLabel = '';
  selectedAcademicYearLabel    = '';

  enquiryDropdownUrl = '';

  // Date constraint derived from the picked enquiry — prevents users from
  // entering an assessment_date earlier than the enquiry was raised.
  minDate = '';

  readonly typeOptions   = ASSESSMENT_TYPE_OPTIONS;
  readonly resultOptions = ASSESSMENT_RESULT_OPTIONS;
  readonly gradeOptions  = ASSESSMENT_GRADE_OPTIONS;

  readonly assessedByUrl    = API.users.dropdown;
  readonly sanctionedClassUrl = '/classes/dropdown';
  readonly academicYearUrl  = API.academicYears.dropdown;

  constructor(private fb: FormBuilder, private cs: CommonService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.form) this.form = this.buildForm();
    if (changes['assessmentId'] || changes['profileId']) {
      // Hold the dropdown URL empty until init() resolves the linked/active
      // enquiry. The template's `@if enquiryDropdownUrl` keeps the dropdown
      // unmounted in the meantime, so it won't initialize with a stale URL
      // and lose its selection when the URL is finalized later.
      this.enquiryDropdownUrl = '';
      queueMicrotask(() => this.init());
    }
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      enquiry_id:          ['', Validators.required],
      assessment_date:     [this.todayDate, Validators.required],
      type:                ['', Validators.required],
      assessed_by_id:      [''],
      sanctioned_class_id: [''],
      academic_year_id:    [''],
      completed:           [false],
      result:              ['pending', Validators.required],
      grade:               [''],
      marks:               [''],
      notes:               ['', V.NOTES],
      is_active:           [true],
    });
  }

  private init(): void {
    this.submitted    = false;
    this.saving.set(false);
    this.errorMessage = '';

    if (!this.form) {
      this.form = this.buildForm();
    } else {
      this.form.reset({
        enquiry_id: '', assessment_date: this.todayDate, type: '',
        assessed_by_id: '', sanctioned_class_id: '', academic_year_id: '',
        completed: false, result: 'pending', grade: '', marks: '', notes: '',
        is_active: true,
      });
    }

    this.linkedEnquiryId    = '';
    this.linkedEnquiryLabel = '';
    this.selectedAssessedByLabel = '';
    this.selectedSanctionedClassLabel = '';
    this.selectedAcademicYearLabel = '';
    this.minDate = '';
    this.nextAssessmentNo.set('');
    this.assessmentNo.set('');

    if (this.assessmentId && this.profileId) {
      this.cs.getService({ url: API.studentAssessments.detail(this.profileId, this.assessmentId) }).subscribe({
        next: (res: any) => {
          const d = res?.data ?? res;
          this.form.patchValue({
            enquiry_id:          d.enquiry?.id          ?? '',
            assessment_date:     d.assessment_date ? d.assessment_date.slice(0, 10) : '',
            type:                d.type ?? '',
            assessed_by_id:      d.assessed_by?.id      ?? '',
            sanctioned_class_id: d.sanctioned_class?.id ?? '',
            academic_year_id:    d.academic_year?.id    ?? '',
            completed:           !!d.completed,
            result:              d.result ?? 'pending',
            grade:               d.grade  ?? '',
            marks:               d.marks  ?? '',
            notes:               d.notes  ?? '',
            is_active:           d.is_active ?? true,
          });
          this.assessmentNo.set(d.assessment_no || '');
          if (d.enquiry?.id) {
            this.linkedEnquiryId    = d.enquiry.id;
            this.linkedEnquiryLabel = d.enquiry.display_label || d.enquiry.enquiry_no || '';
            if (d.enquiry.enquiry_date) this.minDate = new Date(d.enquiry.enquiry_date).toISOString().slice(0, 10);
          }
          if (d.assessed_by?.full_name)      this.selectedAssessedByLabel      = d.assessed_by.full_name;
          if (d.sanctioned_class)            this.selectedSanctionedClassLabel = d.sanctioned_class.name || '';
          if (d.academic_year?.label)        this.selectedAcademicYearLabel    = d.academic_year.label;
          this.enquiryDropdownUrl = this.buildEnquiryDropdownUrl();
          this.cdr.detectChanges();
        },
        error: () => {
          this.enquiryDropdownUrl = this.buildEnquiryDropdownUrl();
          this.cdr.detectChanges();
        },
      });
    } else {
      this.fetchNextCode();
      this.cs.getService({ url: API.academicYears.dropdown }).subscribe({
        next: (res: any) => {
          const years = res?.data ?? [];
          const def = years.find((y: any) => y.is_default);
          if (def) {
            this.form.patchValue({ academic_year_id: def.id });
            this.selectedAcademicYearLabel = def.label;
            this.cdr.detectChanges();
          }
        },
      });
      this.preselectActiveEnquiry();
    }
  }

  /**
   * On create, default to the student's currently-open enquiry — that's almost
   * always the one being assessed. Picks the first 'open' status enquiry; falls
   * back to the most recent active one if none are 'open'.
   *
   * The dropdown URL is built here (after we know the picked enquiry) rather
   * than in ngOnChanges, so the dropdown only mounts once with the final URL
   * + initialLabel + form value already in place — preventing the
   * select-dropdown from wiping its selection when asyncUrl changes mid-flight.
   */
  private preselectActiveEnquiry(): void {
    if (!this.profileId) return;
    this.cs.getService({
      url: API.studentEnquiries.base(this.profileId),
      params: { page: 1, size: 5, active: 'true', sort_by: 'eq.created_at', sort_order: 'DESC' },
    }).subscribe({
      next: (res: any) => {
        const list: any[] = res?.data || [];
        const pick = list.find((e) => e.status === 'open') || list[0] || null;
        if (pick?.id) {
          this.form.patchValue({ enquiry_id: pick.id });
          this.linkedEnquiryId    = pick.id;
          this.linkedEnquiryLabel = pick.display_label || pick.enquiry_no || '';
          this.onEnquirySelected(pick);
        }
        // Mount the dropdown now that linkedEnquiryId is finalized — this is
        // the dropdown's first render, so initialLabel + form value are
        // applied correctly on the very first cycle.
        this.enquiryDropdownUrl = this.buildEnquiryDropdownUrl();
        this.cdr.detectChanges();
      },
      error: () => {
        this.enquiryDropdownUrl = this.buildEnquiryDropdownUrl();
        this.cdr.detectChanges();
      },
    });
  }

  private buildEnquiryDropdownUrl(): string {
    if (!this.profileId) return '';
    let url = `${API.studentEnquiries.base(this.profileId)}?active=true`;
    if (this.linkedEnquiryId) url += `&include_id=${this.linkedEnquiryId}`;
    return url;
  }

  fetchNextCode(): void {
    this.cs.getService({ url: API.studentAssessments.nextCode(this.profileId) }).subscribe({
      next: (res: any) => {
        this.nextAssessmentNo.set(res?.data?.code || '');
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  /**
   * When the user picks an enquiry, copy its enquired_class to sanctioned_class
   * (a sensible default — staff can override) and mirror its academic_year.
   */
  onEnquirySelected(enq: any): void {
    if (!enq) return;
    const patch: any = {};
    if (enq.enquired_class?.id && !this.form.get('sanctioned_class_id')?.value) {
      patch.sanctioned_class_id = enq.enquired_class.id;
      this.selectedSanctionedClassLabel = enq.enquired_class.name || '';
    }
    if (enq.academic_year?.id && !this.form.get('academic_year_id')?.value) {
      patch.academic_year_id = enq.academic_year.id;
      this.selectedAcademicYearLabel = enq.academic_year.label || '';
    }
    if (enq.enquiry_date) {
      this.minDate = new Date(enq.enquiry_date).toISOString().slice(0, 10);
    }
    if (Object.keys(patch).length) {
      this.form.patchValue(patch);
      this.cdr.detectChanges();
    }
  }

  get todayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  onSubmit(): void {
    this.submitted    = true;
    this.errorMessage = '';

    if (this.form.invalid) {
      this.cs.showToastr({ type: 'error', message: 'Please fix the errors before submitting' });
      return;
    }

    this.saving.set(true);
    const val = this.form.value;
    const payload: any = {
      ...val,
      marks:               val.marks === '' ? null : val.marks,
      assessed_by_id:      val.assessed_by_id || null,
      sanctioned_class_id: val.sanctioned_class_id || null,
      academic_year_id:    val.academic_year_id || null,
    };

    const url = this.assessmentId
      ? API.studentAssessments.detail(this.profileId, this.assessmentId)
      : API.studentAssessments.base(this.profileId);

    const req = this.assessmentId
      ? this.cs.putService({ url, payload })
      : this.cs.postService({ url, payload });

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.cs.showToastr({ type: 'success', message: `Assessment ${this.assessmentId ? 'updated' : 'created'} successfully` });
        this.saved.emit();
      },
      error: (err: any) => {
        this.saving.set(false);
        this.errorMessage = err?.error?.message || 'Something went wrong';
        this.cs.showToastr({ type: 'error', message: this.errorMessage });
      },
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
