import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API } from '../../../../../../core/api/endpoints';
import {
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  NATIONALITY_OPTIONS,
  RELATION_TYPE_OPTIONS,
  STUDENT_ADDRESS_TYPE_OPTIONS,
} from '../../../../../../core/constants/enums';
import { FormPageBase } from '../../../../../../shared/components/form-page/form-page.base';
import { ButtonComponent } from '../../../../../../shared/components/button/button.component';
import { BreadcrumbComponent } from '../../../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormFieldComponent } from '../../../../../../shared/components/form-field/form-field.component';
import { LoaderComponent } from '../../../../../../shared/components/loader/loader.component';
import { FileUploadComponent, UploadedFile } from '../../../../../../shared/components/file-upload/file-upload.component';
import { AddressComponent, Address } from '../../../../../../shared/components/address/address.component';
import { RelationFormComponent } from '../../../../../../shared/components/relation/relation-form.component';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { SelectDropdownComponent } from '../../../../../../shared/components/select-dropdown/select-dropdown.component';
import * as V from '../../../../../../shared/validators/common';

const RELATION_LABELS: Record<string, string> =
  RELATION_TYPE_OPTIONS.reduce((acc, o) => { acc[o.value] = o.label; return acc; }, {} as Record<string, string>);

@Component({
  selector: 'app-student-profile-form',
  templateUrl: './student-profile-form.component.html',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    BreadcrumbComponent,
    FormFieldComponent,
    LoaderComponent,
    FileUploadComponent,
    AddressComponent,
    RelationFormComponent,
    ModalComponent,
    SelectDropdownComponent,
  ],
})
export class StudentProfileFormComponent extends FormPageBase implements OnInit {
  @ViewChild('photoUpload') photoUpload!: FileUploadComponent;
  @ViewChild('familyForm') familyForm?: RelationFormComponent;

  @Input() recordId = '';
  @Input() initialMode: 'create' | 'edit' | 'view' = 'create';

  listRoute = '/student/admission';
  resourcePath = API.studentProfiles.base;

  genderOptions          = GENDER_OPTIONS;
  studentAddressTypes    = STUDENT_ADDRESS_TYPE_OPTIONS;
  RELATION_TYPE_OPTIONS  = RELATION_TYPE_OPTIONS;
  bloodGroupOptions      = BLOOD_GROUP_OPTIONS;
  nationalityOptions     = NATIONALITY_OPTIONS;

  addresses: Address[] = [];
  photo: UploadedFile | null = null;
  addressError = '';
  familyError = '';
  sameAsParent = false;
  sameAsParentSourceIndex: number | null = null;
  showParentPicker = false;

  showCreatedDialog        = false;
  showLinkModal            = false;
  selectedLinkId           = '';
  selectedLinkPerson: any  = null;
  selectedLinkRelationType = '';

  get relationsSearchUrl(): string {
    const base = API.studentFamilyInfo.globalSearch;
    return this.editId ? `${base}?exclude_profile_id=${this.editId}` : base;
  }

  private createdId = '';
  localFamily: any[] = [];

  override ngOnInit(): void {
    this.form = this.buildForm();
    if (this.recordId) {
      this.editMode = this.initialMode === 'edit';
      this.viewMode = this.initialMode === 'view';
      this.editId   = this.recordId;
      Promise.resolve().then(() => {
        this.loading = true;
        this.cdr.detectChanges();
        this.cs.getService({ url: `${this.resourcePath}/${this.recordId}` }).subscribe({
          next: (res: any) => {
            const data = this.unwrapResponse(res);
            this.onRecordLoaded(data);
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading = false;
            this.cdr.detectChanges();
            this.cs.navigate({ url: this.listRoute });
          },
        });
      });
    }
  }

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
    this.addresses = (member.addresses as Address[]).map(a => ({ ...a }));
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
    if (months < 0) { years -= 1; months += 12; }
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
      first_name:  ['', V.PERSON_NAME],
      last_name:   ['', V.PERSON_NAME_OPTIONAL],
      dob:         ['', [Validators.required]],
      gender:      ['', [Validators.required]],
      blood_group: ['unknown'],
      aadhaar_no:  ['', V.maxLength(12)],
      nationality: ['Indian', V.requiredMaxLength(100)],
      birth_place: ['', V.maxLength(100)],
      contact:     [{ code: '+91', number: '' }],
      email:       ['', V.EMAIL],
      notes:       ['', V.NOTES],
      is_active:   [true],
    });
  }

  protected override onRecordLoaded(d: any): void {
    this.form.patchValue({
      ...d,
      dob:     this.toDateInput(d.dob),
      contact: { code: d.primary_contact_code || '+91', number: d.primary_contact_no || '' },
    });
    this.addresses   = d.addresses || [];
    this.localFamily = (d.family || []).map((member: any) => ({ ...member, dob: this.toDateInput(member.dob) }));
    this.photo       = d.photo || null;
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
    ['first_name', 'dob', 'gender', 'nationality'].forEach(f => this.form.get(f)?.markAsTouched());
    const contact = this.form.get('contact')?.value;
    const hasContact = !!contact?.number?.trim();
    if (!hasContact) this.form.get('contact')?.markAsTouched();
    this.addressError = this.addresses.length === 0 ? 'At least one address is required' : '';
    this.familyError  = this.localFamily.length === 0 ? 'At least one family member is required' : '';
    if (this.form.get('first_name')?.invalid || this.form.get('dob')?.invalid ||
        this.form.get('gender')?.invalid || this.form.get('nationality')?.invalid || !hasContact ||
        this.addressError || this.familyError) {
      this.cs.showToastr({ type: 'error', message: 'Please fix the errors', description: 'Fill all required fields before submitting' });
      return false;
    }
    return true;
  }

  openLinkModal(): void {
    this.selectedLinkId = ''; this.selectedLinkPerson = null; this.selectedLinkRelationType = '';
    this.showLinkModal = true;
  }

  closeLinkModal(): void { this.showLinkModal = false; }

  onLinkPersonSelected(id: string): void {
    this.selectedLinkId = id;
    if (!id) this.selectedLinkPerson = null;
  }

  onLinkPersonItem(item: any): void {
    this.selectedLinkPerson = item ?? null;
    this.selectedLinkRelationType = '';
  }

  confirmLinkMember(): void {
    const person = this.selectedLinkPerson;
    if (!person) return;
    const already = this.localFamily.some(m => m.relation_id === person.relation_id);
    if (already) { this.cs.showToastr({ type: 'error', message: 'This person is already added' }); return; }
    this.localFamily = [...this.localFamily, {
      relation_id: person.relation_id, name: person.name,
      gender: person.gender || '', dob: person.dob ? person.dob.slice(0, 10) : '',
      contact_code: person.contact_code || '+91', contact_no: person.contact_no || '',
      email: person.email || '', occupation: person.occupation || '',
      qualification: person.qualification || '', annual_income: person.annual_income || '',
      aadhaar_no: person.aadhaar_no || '', notes: person.notes || '',
      relation_type: this.selectedLinkRelationType || '',
      is_emergency_contact: false, addresses: person.addresses || [], _linked: true,
    }];
    if (this.localFamily.length > 0) this.familyError = '';
    this.showLinkModal = false;
    if (!this.selectedLinkRelationType) {
      const idx = this.localFamily.length - 1;
      setTimeout(() => this.familyForm?.openLocalEdit(this.localFamily[idx], idx), 100);
    }
  }

  openLocalCreate(): void { this.familyForm?.openLocalCreate(); }
  openLocalEdit(index: number): void { this.familyForm?.openLocalEdit(this.localFamily[index], index); }
  openLocalView(index: number): void { this.familyForm?.openLocalView(this.localFamily[index], index); }

  removeLocalMember(index: number): void {
    if (this.sameAsParentSourceIndex !== null) {
      if (index === this.sameAsParentSourceIndex) {
        this.sameAsParent = false; this.sameAsParentSourceIndex = null;
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
      next: (res: any) => {
        this.form.markAsPristine();
        this.saving = false;
        if (!this.editMode) {
          this.createdId = res?.data?.id ?? '';
          this.showCreatedDialog = true;
          this.cdr.detectChanges();
        } else {
          this.cs.navigate({ url: this.listRoute });
        }
      },
      error: (err: any) => this.handleSaveError(err),
    });
  }

  goToList(): void { this.showCreatedDialog = false; this.cs.navigate({ url: this.listRoute }); }
  goToEnquiry(): void {
    this.showCreatedDialog = false;
    this.cs.navigate({ url: `${this.listRoute}/${this.createdId}/edit`, queryParams: { tab: 'enquiry' } });
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
    fd.append('family',               JSON.stringify(this.localFamily));
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
    if (value instanceof Date && !Number.isNaN(value.getTime()))
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    if (typeof value !== 'string' || !value.trim()) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));
    if (!match) return null;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) return null;
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
    return parsed;
  }

  private toDateInput(value: string | Date | null | undefined): string {
    if (!value) return '';
    const parsed = this.parseDobValue(value);
    if (!parsed) return '';
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }
}
