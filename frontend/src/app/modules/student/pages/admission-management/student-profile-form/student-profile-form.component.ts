import { Component, ViewChild } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API } from '../../../../../core/api/endpoints';
import {
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  RELIGION_OPTIONS,
  COMMUNITY_OPTIONS,
  RELATION_TYPE_OPTIONS,
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
  ],
})
export class StudentProfileFormComponent extends FormPageBase {
  @ViewChild('photoUpload') photoUpload!: FileUploadComponent;
  @ViewChild('familyList') familyList?: RelationListComponent;
  @ViewChild('familyForm') familyForm?: RelationFormComponent;

  listRoute = '/student/admission';
  resourcePath = API.studentProfiles.base;

  genderOptions     = GENDER_OPTIONS;
  bloodGroupOptions = BLOOD_GROUP_OPTIONS;
  religionOptions   = RELIGION_OPTIONS;
  communityOptions  = COMMUNITY_OPTIONS;

  addresses: Address[] = [];
  photo: UploadedFile | null = null;
  addressError = '';
  familyError = '';

  // Local family array used in create mode; in edit/view the list loads from API
  localFamily: any[] = [];

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
      mother_tongue: ['', V.maxLength(100)],
      religion:      [''],
      community:     [''],
      caste:         ['', V.maxLength(100)],
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
    this.addresses  = d.addresses || [];
    this.localFamily = d.family   || [];
    this.photo      = d.photo     || null;
  }

  onAddressesChange(addresses: Address[]): void {
    this.addresses = addresses;
    if (addresses.length > 0) this.addressError = '';
  }

  onLocalFamilySaved(member: any): void {
    const { _localIndex, ...data } = member;
    if (_localIndex !== undefined) {
      this.localFamily = this.localFamily.map((m, i) => i === _localIndex ? data : m);
    } else {
      this.localFamily = [...this.localFamily, data];
    }
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

  protected override toPayload(): any {
    const val = this.form.value;
    const payload: any = {
      first_name:           val.first_name?.trim(),
      last_name:            val.last_name?.trim() || null,
      dob:                  val.dob || null,
      gender:               val.gender || null,
      blood_group:          val.blood_group || 'unknown',
      aadhaar_no:           val.aadhaar_no?.trim() || null,
      mother_tongue:        val.mother_tongue?.trim() || null,
      religion:             val.religion || null,
      community:            val.community || null,
      caste:                val.caste?.trim() || null,
      nationality:          val.nationality?.trim() || null,
      birth_place:          val.birth_place?.trim() || null,
      primary_contact_code: val.contact?.code || '+91',
      primary_contact_no:   val.contact?.number || null,
      email:                val.email?.trim() || null,
      notes:                val.notes?.trim() || null,
      is_active:            val.is_active ?? true,
      addresses:            this.addresses,
    };
    // On create, send local family so backend saves them in one shot
    if (!this.editMode) {
      payload.family = this.localFamily;
    }
    return payload;
  }

  protected override afterSave(res: any): void {
    const id = res?.data?.id ?? this.editId;
    const pendingPhoto = !this.editMode && id ? this.photoUpload?.uploadPendingFile(id) : null;
    if (pendingPhoto) {
      pendingPhoto.subscribe({ next: () => this.goToDetail(id), error: () => this.goToDetail(id) });
    } else {
      this.goToDetail(id);
    }
  }

  private goToDetail(id: string): void {
    this.saving = false;
    this.cs.navigate({ url: `${this.listRoute}/${id}/view` });
  }
}
