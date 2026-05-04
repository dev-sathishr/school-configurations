import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API } from '../../../../../../core/api/endpoints';
import { CommonService } from '../../../../../../shared/services/common/common.service';
import { FormFieldComponent } from '../../../../../../shared/components/form-field/form-field.component';
import * as V from '../../../../../../shared/validators/common';

@Component({
  selector: 'app-registration-form',
  templateUrl: './registration-form.component.html',
  imports: [ReactiveFormsModule, FormFieldComponent],
})
export class RegistrationFormComponent implements OnChanges {
  @Input() profileId      = '';
  @Input() registrationId = '';
  @Input() viewMode       = false;

  @Output() saved     = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  submitted    = false;
  readonly saving = signal(false);
  errorMessage = '';

  readonly nextRegistrationNo = signal('');
  readonly registrationNo     = signal('');

  // Sticky labels for async dropdowns in edit mode (so initialLabel renders
  // immediately without waiting for a list fetch)
  linkedEnquiryId    = '';
  linkedEnquiryLabel = '';
  selectedSanctionedClassLabel = '';
  selectedAcademicYearLabel    = '';

  enquiryDropdownUrl = '';

  // Date constraints derived from the picked enquiry
  minDate = '';
  maxDate = this.todayDate;

  readonly sanctionedClassUrl = '/classes/dropdown';
  readonly academicYearUrl    = API.academicYears.dropdown;

  constructor(private fb: FormBuilder, private cs: CommonService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.form) this.form = this.buildForm();
    if (changes['registrationId'] || changes['profileId']) {
      // Same pattern as assessment form: hold the dropdown URL until init()
      // resolves the linked/active enquiry, so the dropdown only mounts once
      // with its final URL + initialLabel.
      this.enquiryDropdownUrl = '';
      queueMicrotask(() => this.init());
    }
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      enquiry_id:          ['', Validators.required],
      registration_date:   [this.todayDate, Validators.required],
      academic_year_id:    ['', Validators.required],
      sanctioned_class_id: ['', Validators.required],
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
        enquiry_id: '', registration_date: this.todayDate, academic_year_id: '',
        sanctioned_class_id: '', notes: '', is_active: true,
      });
    }

    this.linkedEnquiryId = '';
    this.linkedEnquiryLabel = '';
    this.selectedSanctionedClassLabel = '';
    this.selectedAcademicYearLabel = '';
    this.minDate = '';
    this.maxDate = this.todayDate;
    this.nextRegistrationNo.set('');
    this.registrationNo.set('');

    if (this.registrationId && this.profileId) {
      this.cs.getService({ url: API.studentRegistrations.detail(this.profileId, this.registrationId) }).subscribe({
        next: (res: any) => {
          const d = res?.data ?? res;
          this.form.patchValue({
            enquiry_id:          d.enquiry?.id          ?? '',
            registration_date:   d.registration_date ? d.registration_date.slice(0, 10) : '',
            academic_year_id:    d.academic_year?.id    ?? '',
            sanctioned_class_id: d.sanctioned_class?.id ?? '',
            notes:               d.notes ?? '',
            is_active:           d.is_active ?? true,
          });
          this.registrationNo.set(d.registration_no || '');
          if (d.enquiry?.id) {
            this.linkedEnquiryId    = d.enquiry.id;
            this.linkedEnquiryLabel = d.enquiry.display_label || d.enquiry.enquiry_no || '';
            if (d.enquiry.enquiry_date) this.minDate = new Date(d.enquiry.enquiry_date).toISOString().slice(0, 10);
            // Tighten minDate to latest assessment for this enquiry
            this.cs.getService({
              url: API.studentAssessments.base(this.profileId),
              params: { page: 1, size: 1, sort_by: 'a.assessment_date', sort_order: 'DESC', 'filter[a.enquiry_id]': d.enquiry.id },
            }).subscribe({
              next: (ar: any) => {
                const latest = ar?.data?.[0];
                if (latest?.assessment_date) {
                  const assessmentMin = new Date(latest.assessment_date).toISOString().slice(0, 10);
                  if (assessmentMin > this.minDate) {
                    this.minDate = assessmentMin;
                    this.cdr.detectChanges();
                  }
                }
              },
              error: () => {},
            });
          }
          if (d.sanctioned_class)     this.selectedSanctionedClassLabel = d.sanctioned_class.name || '';
          if (d.academic_year?.label) this.selectedAcademicYearLabel    = d.academic_year.label;
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
      this.preselectActiveEnquiry();
    }
  }

  private buildEnquiryDropdownUrl(): string {
    if (!this.profileId) return '';
    let url = `${API.studentEnquiries.base(this.profileId)}?active=true`;
    if (this.linkedEnquiryId) url += `&include_id=${this.linkedEnquiryId}`;
    return url;
  }

  fetchNextCode(): void {
    this.cs.getService({ url: API.studentRegistrations.nextCode(this.profileId) }).subscribe({
      next: (res: any) => {
        this.nextRegistrationNo.set(res?.data?.code || '');
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  /**
   * Default to the student's currently-open enquiry on create; auto-fill
   * sanctioned_class and academic_year from it.
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
        this.enquiryDropdownUrl = this.buildEnquiryDropdownUrl();
        this.cdr.detectChanges();
      },
      error: () => {
        this.enquiryDropdownUrl = this.buildEnquiryDropdownUrl();
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Selecting an enquiry copies its enquired_class to sanctioned_class
   * (default — staff can override) and mirrors academic_year. Sets minDate
   * to the enquiry date, then tightens it further to the latest assessment
   * date for that enquiry (if any).
   */
  onEnquirySelected(enq: any): void {
    if (!enq) return;
    const patch: any = {};
    if (enq.enquired_class?.id) {
      patch.sanctioned_class_id = enq.enquired_class.id;
      this.selectedSanctionedClassLabel = enq.enquired_class.name || '';
    }
    if (enq.academic_year?.id) {
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
    // Tighten minDate to the latest assessment date for this enquiry (if any)
    if (enq.id && this.profileId) {
      this.cs.getService({
        url: API.studentAssessments.base(this.profileId),
        params: { page: 1, size: 1, sort_by: 'a.assessment_date', sort_order: 'DESC', 'filter[a.enquiry_id]': enq.id },
      }).subscribe({
        next: (res: any) => {
          const latest = res?.data?.[0];
          if (latest?.assessment_date) {
            const assessmentMin = new Date(latest.assessment_date).toISOString().slice(0, 10);
            if (assessmentMin > this.minDate) {
              this.minDate = assessmentMin;
              this.cdr.detectChanges();
            }
          }
        },
        error: () => {},
      });
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
    const payload = this.form.value;

    const url = this.registrationId
      ? API.studentRegistrations.detail(this.profileId, this.registrationId)
      : API.studentRegistrations.base(this.profileId);

    const req = this.registrationId
      ? this.cs.putService({ url, payload })
      : this.cs.postService({ url, payload });

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.cs.showToastr({ type: 'success', message: `Registration ${this.registrationId ? 'updated' : 'created'} successfully` });
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
