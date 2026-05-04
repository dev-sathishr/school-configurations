import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API } from '../../../../../../core/api/endpoints';
import { PermissionService } from '../../../../../../core/services/permission.service';
import { CommonService } from '../../../../../../shared/services/common/common.service';
import { FormFieldComponent } from '../../../../../../shared/components/form-field/form-field.component';
import { ButtonComponent } from '../../../../../../shared/components/button/button.component';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { RecommenderFormComponent } from '../../../recommenders/recommender-form/recommender-form.component';
import * as V from '../../../../../../shared/validators/common';

@Component({
  selector: 'app-recommendation-form',
  templateUrl: './recommendation-form.component.html',
  imports: [ReactiveFormsModule, FormFieldComponent, ButtonComponent, ModalComponent, RecommenderFormComponent],
})
export class RecommendationFormComponent implements OnChanges {
  @Input() profileId   = '';
  @Input() mappingId   = '';
  @Input() viewMode    = false;

  @Output() saved     = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('recommenderForm') recommenderForm!: RecommenderFormComponent;

  readonly ps = inject(PermissionService);

  form!: FormGroup;
  submitted    = false;
  readonly saving = signal(false);
  errorMessage = '';

  newRecommenderModalVisible = false;
  selectedRecommenderLabel   = '';
  linkedEnquiryId            = '';
  linkedEnquiryLabel         = '';
  enquiryDropdownUrl         = '';

  readonly recommenderDropdownUrl = API.recommenders.dropdown;

  constructor(private fb: FormBuilder, private cs: CommonService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.form) this.form = this.buildForm();
    if (changes['mappingId'] || changes['profileId']) {
      // Reset structural state synchronously so the template's @if branches
      // stay stable during this CD pass (avoids ExpressionChangedAfterChecked).
      // Form patching / API calls are deferred to a microtask.
      this.enquiryDropdownUrl = this.mappingId
        ? ''                              // edit mode: wait until detail loads
        : this.buildEnquiryDropdownUrl(); // create mode: build now
      queueMicrotask(() => this.init());
    }
  }

  private init(): void {
    this.submitted    = false;
    this.saving.set(false);
    this.errorMessage = '';
    this.newRecommenderModalVisible = false;

    if (!this.form) {
      this.form = this.buildForm();
    } else {
      this.form.reset({ recommender_id: '', enquiry_id: '', notes: '', is_active: true });
      this.selectedRecommenderLabel = '';
      this.linkedEnquiryId = '';
      this.linkedEnquiryLabel = '';
    }

    if (this.mappingId && this.profileId) {
      this.cs.getService({ url: API.studentRecommendations.detail(this.profileId, this.mappingId) }).subscribe({
        next: (res: any) => {
          const d = res?.data ?? res;
          this.form.patchValue({
            recommender_id: d.recommender?.id ?? '',
            enquiry_id:     d.enquiry?.id     ?? '',
            notes:          d.notes           ?? '',
            is_active:      d.is_active       ?? true,
          });
          if (d.recommender?.name) this.selectedRecommenderLabel = d.recommender.name;
          if (d.enquiry?.id) {
            this.linkedEnquiryId    = d.enquiry.id;
            this.linkedEnquiryLabel = this.formatEnquiryLabel(d.enquiry);
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
    // Create mode: enquiryDropdownUrl already set synchronously in ngOnChanges.
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      recommender_id: ['', Validators.required],
      enquiry_id:     [''],
      notes:          ['', V.NOTES],
      is_active:      [true],
    });
  }

  /**
   * Builds the dropdown URL once. We avoid recomputing this on every change-
   * detection cycle because select-dropdown wipes its `_selectedLabel` whenever
   * `asyncUrl` changes — that erased the initialLabel we just set in edit mode.
   * Call this after `linkedEnquiryId` is known (or once for create mode).
   */
  /**
   * Mirrors the backend's `display_label` SQL — combines enquiry_no with the
   * status in title case so the initialLabel in edit mode matches the format
   * the dropdown options use.
   */
  private formatEnquiryLabel(enquiry: { enquiry_no?: string; status?: string }): string {
    const no = enquiry?.enquiry_no || '';
    const status = (enquiry?.status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return status ? `${no} (${status})` : no;
  }

  private buildEnquiryDropdownUrl(): string {
    if (!this.profileId) return '';
    let url = `${API.studentEnquiries.base(this.profileId)}?active=true`;
    if (this.linkedEnquiryId) url += `&include_id=${this.linkedEnquiryId}`;
    return url;
  }

  openNewRecommender(): void {
    this.newRecommenderModalVisible = true;
  }

  onRecommenderSaved(newRec: any): void {
    this.newRecommenderModalVisible = false;
    if (newRec?.id) {
      this.form.patchValue({ recommender_id: newRec.id });
      this.selectedRecommenderLabel = newRec.name || '';
      this.cdr.detectChanges();
    }
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

    const url = this.mappingId
      ? API.studentRecommendations.detail(this.profileId, this.mappingId)
      : API.studentRecommendations.base(this.profileId);

    const req = this.mappingId
      ? this.cs.putService({ url, payload })
      : this.cs.postService({ url, payload });

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.cs.showToastr({ type: 'success', message: `Recommendation ${this.mappingId ? 'updated' : 'added'} successfully` });
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
