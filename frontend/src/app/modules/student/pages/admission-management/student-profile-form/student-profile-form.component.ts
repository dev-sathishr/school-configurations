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
import { RelationListComponent } from '../../../../../shared/components/relation/relation-list.component';
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
    RelationListComponent,
    RelationFormComponent,
    ModalComponent,
  ],
})
export class StudentProfileFormComponent extends FormPageBase {
  @ViewChild('photoUpload') photoUpload!: FileUploadComponent;
  @ViewChild('familyList') familyList?: RelationListComponent;
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
  showParentPicker = false;

  // Local family array used in create mode; in edit/view the list loads from API
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
      this.copyFromMember(members[0]);
    } else {
      this.showParentPicker = true;
    }
  }

  copyFromMember(member: any): void {
    this.addresses = (member.addresses as Address[]).map(a => ({ ...a, id: undefined }));
    this.addressError = '';
    this.sameAsParent = true;
    this.showParentPicker = false;
  }

  closeParentPicker(): void {
    this.showParentPicker = false;
  }

  onSameAsParentChange(checked: boolean): void {
    if (!checked) {
      this.sameAsParent = false;
      this.addresses = [];
    }
  }

  get dobMaxDate(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    return d.toISOString().slice(0, 10);
  }

  get familyApiBaseUrl(): string {
    return this.editId ? `${API.studentProfiles.base}/${this.editId}/family` : '';
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
      contact: { code: d.primary_contact_code || '+91', number: d.primary_contact_no || '' },
    });
    this.addresses   = d.addresses || [];
    this.localFamily = d.family    || [];
    this.photo       = d.photo     || null;
    this.sameAsParent = false;
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

    const familyCount = this.editMode
      ? (this.familyList?.members?.length ?? 0)
      : this.localFamily.length;
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
    if (!this.editMode) {
      fd.append('family', JSON.stringify(this.localFamily));
    }

    const pendingFile = this.photoUpload?.pendingFile;
    if (pendingFile) fd.append('photo', pendingFile);

    return fd;
  }
}
