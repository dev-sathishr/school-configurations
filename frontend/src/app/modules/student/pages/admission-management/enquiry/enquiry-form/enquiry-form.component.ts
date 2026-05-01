import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API } from '../../../../../../core/api/endpoints';
import { ENQUIRY_STATUS_OPTIONS, RELATION_TYPE_OPTIONS } from '../../../../../../core/constants/enums';
import { LocationContextService } from '../../../../../../core/services/location-context.service';
import { CommonService } from '../../../../../../shared/services/common/common.service';
import { FormFieldComponent } from '../../../../../../shared/components/form-field/form-field.component';
import { LocationFieldComponent } from '../../../../../../shared/components/location-field/location-field.component';
import * as V from '../../../../../../shared/validators/common';

@Component({
  selector: 'app-enquiry-form',
  templateUrl: './enquiry-form.component.html',
  imports: [ReactiveFormsModule, FormFieldComponent, LocationFieldComponent],
})
export class EnquiryFormComponent implements OnChanges {
  @Input() profileId      = '';
  @Input() profileName    = '';
  @Input() profileRegNo   = '';
  @Input() profilePhotoUrl = '';
  @Input() enquiryId = '';
  @Input() viewMode  = false;

  @Output() saved     = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly locationCtx = inject(LocationContextService);

  form!: FormGroup;
  submitted         = false;
  saving            = false;
  errorMessage      = '';
  academicYearLabel = '';
  nextEnquiryNo    = '';
  codeLoading      = false;
  enquiryNo        = '';
  private skipCodeFetch = false;

  readonly recordLocation = signal<{ id: string; name: string; code: string } | null>(null);

  readonly academicYearUrl     = API.academicYears.dropdown;
  readonly relationTypeOptions = RELATION_TYPE_OPTIONS;
  readonly statusOptions       = ENQUIRY_STATUS_OPTIONS;

  constructor(private fb: FormBuilder, private cs: CommonService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['enquiryId'] || changes['profileId']) {
      this.init();
    }
  }

  private init(): void {
    this.submitted     = false;
    this.saving        = false;
    this.errorMessage  = '';
    this.academicYearLabel = '';
    this.nextEnquiryNo = '';
    this.codeLoading   = false;
    this.enquiryNo     = '';
    this.recordLocation.set(null);
    if (!this.form) {
      this.form = this.buildForm();
    } else {
      this.form.reset({
        location_id:        '',
        academic_year_id:   '',
        enquiry_date:       this.todayDate,
        relation_type:      '',
        enquired_by:        '',
        contact_no:         { code: '+91', number: '' },
        enquired_class:     '',
        current_school:     '',
        current_class:      '',
        current_curriculum: '',
        status:             'open',
        notes:              '',
      });
    }

    if (!this.enquiryId) {
      this.skipCodeFetch = true;
      const preferred = this.locationCtx.preferredLocationId();
      if (preferred) this.form.patchValue({ location_id: preferred });
      this.skipCodeFetch = false;

      if (this.profileId) this.fetchNextCode();

      this.cs.getService({ url: API.academicYears.dropdown }).subscribe({
        next: (res: any) => {
          const years = res?.data ?? [];
          const defaultYear = years.find((y: any) => y.is_default);
          if (defaultYear) {
            this.form.patchValue({ academic_year_id: defaultYear.id });
            this.academicYearLabel = defaultYear.label;
            this.cdr.detectChanges();
          }
        },
      });
    }

    if (this.enquiryId && this.profileId) {
      this.cs.getService({ url: API.studentEnquiries.detail(this.profileId, this.enquiryId) }).subscribe({
        next: (res: any) => {
          const d = res?.data ?? res;
          this.form.patchValue({
            ...d,
            enquiry_date:       d.enquiry_date ? d.enquiry_date.slice(0, 10) : '',
            location_id:        d.location?.id        ?? '',
            academic_year_id:   d.academic_year?.id   ?? '',
            enquired_class:     d.enquired_class?.id   ?? d.enquired_class   ?? '',
            current_curriculum: d.current_curriculum?.id ?? d.current_curriculum ?? '',
            contact_no:         { code: d.contact_code || '+91', number: d.contact_no || '' },
          });
          this.enquiryNo = d.enquiry_no || '';
          if (d.location?.id) {
            this.recordLocation.set({ id: d.location.id, name: d.location.name || '', code: d.location.code || '' });
          }
          if (d.academic_year?.label) {
            this.academicYearLabel = d.academic_year.label;
            this.cdr.detectChanges();
          }
        },
        error: () => {},
      });
    }
  }

  private buildForm(): FormGroup {
    const form = this.fb.group({
      location_id:        ['', Validators.required],
      academic_year_id:   [''],
      enquiry_date:       [this.todayDate, Validators.required],
      relation_type:      ['', Validators.required],
      enquired_by:        ['', V.NAME],
      contact_no:         [{ code: '+91', number: '' }],
      enquired_class:     ['', Validators.required],
      current_school:     ['', V.maxLength(100)],
      current_class:      ['', V.maxLength(100)],
      current_curriculum: [''],
      status:             ['open', Validators.required],
      notes:              ['', V.NOTES],
    });

    form.get('location_id')!.valueChanges.subscribe((locId: string | null) => {
      if (!this.enquiryId && !this.skipCodeFetch && locId && this.profileId) {
        this.fetchNextCode();
      }
    });

    return form;
  }

  fetchNextCode(): void {
    const locationId = this.form?.get('location_id')?.value;
    this.codeLoading = true;
    this.cdr.detectChanges();
    this.cs.getService({ url: API.studentEnquiries.nextCode(this.profileId), params: locationId ? { location_id: locationId } : {} }).subscribe({
      next: (res: any) => {
        this.nextEnquiryNo = res?.data?.code || '';
        this.codeLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.codeLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get todayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  onSubmit(): void {
    this.submitted    = true;
    this.errorMessage = '';

    const contact = this.form.get('contact_no')?.value;
    if (!contact?.number?.trim()) {
      this.form.get('contact_no')?.markAsTouched();
    }

    if (this.form.invalid || !contact?.number?.trim()) {
      this.cs.showToastr({ type: 'error', message: 'Please fix the errors before submitting' });
      return;
    }

    this.saving = true;
    const val = this.form.value;
    const payload: any = {
      ...val,
      contact_code:     val.contact_no?.code   || '+91',
      contact_no:       val.contact_no?.number || '',
      academic_year_id: val.academic_year_id   || null,
      enquired_class:   val.enquired_class     || null,
      current_curriculum: val.current_curriculum || null,
    };

    const url = this.enquiryId
      ? API.studentEnquiries.detail(this.profileId, this.enquiryId)
      : API.studentEnquiries.base(this.profileId);

    const req = this.enquiryId
      ? this.cs.putService({ url, payload })
      : this.cs.postService({ url, payload });

    req.subscribe({
      next: () => {
        this.saving = false;
        this.cs.showToastr({ type: 'success', message: `Enquiry ${this.enquiryId ? 'updated' : 'created'} successfully` });
        this.saved.emit();
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Something went wrong';
        this.cs.showToastr({ type: 'error', message: this.errorMessage });
      },
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
