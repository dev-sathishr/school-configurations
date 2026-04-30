import { Component, ViewChild } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API } from '../../../../../core/api/endpoints';
import {
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  NATIONALITY_OPTIONS,
  RELATION_TYPE_OPTIONS,
  STUDENT_ADDRESS_TYPE_OPTIONS,
} from '../../../../../core/constants/enums';
import { FormPageBase } from '../../../../../shared/components/form-page/form-page.base';
import { BreadcrumbComponent } from '../../../../../shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../shared/components/loader/loader.component';
import { FileUploadComponent, UploadedFile } from '../../../../../shared/components/file-upload/file-upload.component';
import { AddressComponent, Address } from '../../../../../shared/components/address/address.component';
import { RelationFormComponent } from '../../../../../shared/components/relation/relation-form.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import * as V from '../../../../../shared/validators/common';

const RELATION_LABELS: Record<string, string> =
  RELATION_TYPE_OPTIONS.reduce((acc, o) => { acc[o.value] = o.label; return acc; }, {} as Record<string, string>);

@Component({
  selector: 'app-student-profile-form',
  templateUrl: './student-profile-form.component.html',
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonComponent,
    FormFieldComponent,
    LoaderComponent,
    FileUploadComponent,
    AddressComponent,
    RelationFormComponent,
    ModalComponent,
  ],
})
export class StudentProfileFormComponent extends FormPageBase {
  @ViewChild('photoUpload') photoUpload!: FileUploadComponent;
  @ViewChild('familyForm') familyForm?: RelationFormComponent;

  listRoute = '/student/admission';
  resourcePath = API.studentProfiles.base;

  genderOptions          = GENDER_OPTIONS;
  studentAddressTypes    = STUDENT_ADDRESS_TYPE_OPTIONS;
  bloodGroupOptions  = BLOOD_GROUP_OPTIONS;
  nationalityOptions = NATIONALITY_OPTIONS;

  addresses: Address[] = [];
  photo: UploadedFile | null = null;
  addressError = '';
  familyError = '';
  sameAsParent = false;
  sameAsParentSourceIndex: number | null = null;
  showParentPicker = false;

  // Family array used in both create and edit/view (from student profile API).
  localFamily: any[] = [];

  get familyMembersWithAddresses(): any[] {
    return this.localFamily.filter(m => m.addresses?.length);
  }

  get usedRelationTypes(): string[] {
    return this.localFamily.map(m => m.relation_type).filter(Boolean);
  }

  onSameAsParentPickerOpen(): void {
    const members = this.familyMembersWithAddresses;
    if (members.length === 1) {
      this.copyFromMember(members[0], this.localFamily.indexOf(members[0]));
    } else {
      this.showParentPicker = true;
    }
  }

  copyFromMember(member: any, sourceIndex?: number): void {
    this.addresses = (member.addresses as Address[]).map(a => ({ ...a, id: undefined }));
    this.addressError = '';
    this.sameAsParent = true;
    this.sameAsParentSourceIndex = Number.isInteger(sourceIndex) ? sourceIndex! : this.localFamily.indexOf(member);
    this.showParentPicker = false;
  }

  closeParentPicker(): void {
    this.showParentPicker = false;
  }

  onSameAsParentChange(checked: boolean): void {
    if (!checked) {
      this.sameAsParent = false;
      this.sameAsParentSourceIndex = null;
      this.addresses = [];
    }
  }

  get dobMaxDate(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    return d.toISOString().slice(0, 10);
  }

  get ageDisplay(): string {
    const rawDob = this.form?.get('dob')?.value;
    if (!rawDob) return '--';

    const dob = this.parseDobValue(rawDob);
    if (!dob) return '--';

    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();

    if (today.getDate() < dob.getDate()) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) return '--';

    const yearLabel = `${years} year${years === 1 ? '' : 's'}`;
    if (months === 0) return yearLabel;
    return `${yearLabel} ${months} month${months === 1 ? '' : 's'}`;
  }

  relationLabel(type: string): string {
    return RELATION_LABELS[type] ?? type;
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      first_name:    ['', V.PERSON_NAME],
      last_name:     ['', V.PERSON_NAME_OPTIONAL],
      dob:           ['', [Validators.required]],
      gender:        ['', [Validators.required]],
      blood_group:   ['unknown'],
      aadhaar_no:    ['', V.maxLength(12)],
      nationality:   ['Indian', V.maxLength(100)],
      birth_place:   ['', V.maxLength(100)],
      contact:       [{ code: '+91', number: '' }],
      email:         ['', V.EMAIL],
      notes:         ['', V.NOTES],
      is_active:     [true],
    });
  }

  protected override onRecordLoaded(d: any): void {
    this.form.patchValue({
      ...d,
      dob: this.toDateInput(d.dob),
      contact: { code: d.primary_contact_code || '+91', number: d.primary_contact_no || '' },
    });
    this.addresses   = d.addresses || [];
    this.localFamily = (d.family || []).map((member: any) => ({
      ...member,
      dob: this.toDateInput(member.dob),
    }));
    this.photo       = d.photo     || null;
    this.sameAsParent = false;
    this.sameAsParentSourceIndex = null;
  }

  onAddressesChange(addresses: Address[]): void {
    this.addresses = addresses;
    if (addresses.length > 0) this.addressError = '';
  }

  onLocalFamilySaved(member: any): void {
    const { _localIndex, ...data } = member;
    let updated: any[];
    if (_localIndex !== undefined) {
      updated = this.localFamily.map((m, i) => i === _localIndex ? data : m);
    } else {
      updated = [...this.localFamily, data];
    }
    // Enforce only one emergency contact — unmark others if this one is checked
    if (data.is_emergency_contact) {
      const savedIndex = _localIndex !== undefined ? _localIndex : updated.length - 1;
      updated = updated.map((m, i) =>
        i !== savedIndex && m.is_emergency_contact ? { ...m, is_emergency_contact: false } : m
      );
    }
    this.localFamily = updated;
    if (this.localFamily.length > 0) this.familyError = '';
  }

  protected override beforeSubmit(): boolean {
    // Validate required form fields
    ['first_name', 'dob', 'gender'].forEach(f => this.form.get(f)?.markAsTouched());

    const contact = this.form.get('contact')?.value;
    const hasContact = !!contact?.number?.trim();
    if (!hasContact) this.form.get('contact')?.markAsTouched();

    this.addressError = this.addresses.length === 0 ? 'At least one address is required' : '';

    const familyCount = this.localFamily.length;
    this.familyError = familyCount === 0 ? 'At least one family member is required' : '';

    if (this.form.get('first_name')?.invalid || this.form.get('dob')?.invalid ||
        this.form.get('gender')?.invalid || !hasContact ||
        this.addressError || this.familyError) {
      this.cs.showToastr({ type: 'error', message: 'Please fix the errors', description: 'Fill all required fields before submitting' });
      return false;
    }
    return true;
  }

  openLocalCreate(): void {
    this.familyForm?.openLocalCreate();
  }

  openLocalEdit(index: number): void {
    this.familyForm?.openLocalEdit(this.localFamily[index], index);
  }

  openLocalView(index: number): void {
    this.familyForm?.openLocalView(this.localFamily[index], index);
  }

  removeLocalMember(index: number): void {
    if (this.sameAsParentSourceIndex !== null) {
      if (index === this.sameAsParentSourceIndex) {
        this.sameAsParent = false;
        this.sameAsParentSourceIndex = null;
      } else if (index < this.sameAsParentSourceIndex) {
        this.sameAsParentSourceIndex -= 1;
      }
    }
    this.localFamily = this.localFamily.filter((_, i) => i !== index);
  }

  override onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (!this.beforeSubmit()) return;
    if (this.form.invalid) return;

    this.saving = true;
    const fd = this.buildFormData();

    const req = this.editMode
      ? this.cs.putFile({ url: `${this.resourcePath}/${this.editId}`, formData: fd })
      : this.cs.postFile({ url: this.resourcePath, formData: fd });

    req.subscribe({
      next: () => {
        this.form.markAsPristine();
        this.saving = false;
        this.cs.navigate({ url: this.listRoute });
      },
      error: (err: any) => this.handleSaveError(err),
    });
  }

  private buildFormData(): FormData {
    const val = this.form.value;
    const fd = new FormData();

    fd.append('first_name',           val.first_name?.trim() ?? '');
    fd.append('last_name',            val.last_name?.trim() || '');
    fd.append('dob',                  val.dob || '');
    fd.append('gender',               val.gender || '');
    fd.append('blood_group',          val.blood_group || 'unknown');
    fd.append('aadhaar_no',           val.aadhaar_no?.trim() || '');
    fd.append('nationality',          val.nationality || '');
    fd.append('birth_place',          val.birth_place?.trim() || '');
    fd.append('primary_contact_code', val.contact?.code || '+91');
    fd.append('primary_contact_no',   val.contact?.number || '');
    fd.append('email',                val.email?.trim() || '');
    fd.append('notes',                val.notes?.trim() || '');
    fd.append('is_active',            String(val.is_active ?? true));
    fd.append('addresses',            JSON.stringify(this.addresses));
    fd.append('family', JSON.stringify(this.localFamily));
    if (!this.editMode) {
      fd.append('same_as_parent', String(this.sameAsParent));
      if (this.sameAsParent && this.sameAsParentSourceIndex !== null && this.sameAsParentSourceIndex >= 0) {
        fd.append('same_as_parent_source_index', String(this.sameAsParentSourceIndex));
      }
    }

    const pendingFile = this.photoUpload?.pendingFile;
    if (pendingFile) fd.append('photo', pendingFile);

    return fd;
  }

  private parseDobValue(value: string | Date): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    if (typeof value !== 'string' || !value.trim()) return null;

    const datePart = value.slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) return null;
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed;
  }

  private toDateInput(value: string | Date | null | undefined): string {
    if (!value) return '';
    const parsed = this.parseDobValue(value);
    if (!parsed) return '';
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
