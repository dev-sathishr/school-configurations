import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonService } from '../../services/common/common.service';
import { ModalComponent } from '../modal/modal.component';
import { FormFieldComponent, SelectOption } from '../form-field/form-field.component';
import { ButtonComponent } from '../button/button.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

export interface Address {
  id?: string;
  address_type: string;
  address_line1: string;
  address_line2: string;
  pincode: string;
  post_office: string;
  city: string;
  state: string;
  country: string;
}

@Component({
  selector: 'app-address',
  templateUrl: './address.component.html',
  host: { class: 'block' },
  imports: [ReactiveFormsModule, ModalComponent, FormFieldComponent, ButtonComponent, ConfirmDialogComponent],
})
export class AddressComponent {
  @Input() addresses: Address[] = [];
  @Output() addressesChange = new EventEmitter<Address[]>();

  showModal = false;
  editIndex: number | null = null;
  form!: FormGroup;
  submitted = false;

  // Pincode
  postOfficeOptions: SelectOption[] = [];
  pincodeLoading = false;

  // Delete confirm
  showDeleteConfirm = false;
  deleteIndex: number | null = null;

  addressTypes: SelectOption[] = [
    { value: 'primary', label: 'Primary' },
    { value: 'registered', label: 'Registered' },
    { value: 'communication', label: 'Communication' },
    { value: 'billing', label: 'Billing' },
    { value: 'branch', label: 'Branch' },
    { value: 'other', label: 'Other' },
  ];

  constructor(private fb: FormBuilder, private cs: CommonService, private cdr: ChangeDetectorRef) {}

  private createForm(data: any = {}): void {
    this.form = this.fb.group({
      id: [data.id || null],
      address_type: [data.address_type || 'primary', [Validators.required]],
      address_line1: [data.address_line1 || '', [Validators.required, Validators.maxLength(300)]],
      address_line2: [data.address_line2 || '', [Validators.maxLength(300)]],
      pincode: [data.pincode || '', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^\d{6}$/)]],
      post_office: [data.post_office || '', [Validators.required, Validators.maxLength(200)]],
      city: [{ value: data.city || '', disabled: true }, [Validators.maxLength(100)]],
      state: [{ value: data.state || '', disabled: true }, [Validators.maxLength(100)]],
      country: [{ value: data.country || 'India', disabled: true }, [Validators.maxLength(100)]],
    });

    this.postOfficeOptions = [];
    this.submitted = false;

    this.form.get('pincode')?.valueChanges.subscribe((val: string) => {
      if (val && val.length === 6) this.lookupPincode(val);
    });
  }

  openAdd(): void {
    this.editIndex = null;
    this.createForm();
    this.showModal = true;
  }

  openEdit(index: number): void {
    this.editIndex = index;
    this.createForm(this.addresses[index]);
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  save(): void {
    this.submitted = true;
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const updated = [...this.addresses];

    if (this.editIndex !== null) {
      updated[this.editIndex] = value;
    } else {
      updated.push(value);
    }

    this.addresses = updated;
    this.addressesChange.emit(this.addresses);
    this.showModal = false;
  }

  confirmDelete(index: number): void {
    this.deleteIndex = index;
    this.showDeleteConfirm = true;
  }

  doDelete(): void {
    if (this.deleteIndex !== null) {
      const updated = [...this.addresses];
      updated.splice(this.deleteIndex, 1);
      this.addresses = updated;
      this.addressesChange.emit(this.addresses);
    }
    this.showDeleteConfirm = false;
    this.deleteIndex = null;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteIndex = null;
  }

  getTypeLabel(type: string): string {
    return this.addressTypes.find(t => t.value === type)?.label || type;
  }

  private lookupPincode(pincode: string): void {
    this.pincodeLoading = true;
    this.cs.getService({ url: `/pincode/${pincode}` }).subscribe({
      next: (res: any) => {
        const data = res.data;
        this.form.get('city')?.setValue(data.city || '');
        this.form.get('state')?.setValue(data.state || '');
        this.form.get('country')?.setValue(data.country || 'India');
        this.postOfficeOptions = (data.post_offices || []).map((po: string) => ({ value: po, label: po }));
        if (data.post_offices?.length === 1) {
          this.form.patchValue({ post_office: data.post_offices[0] });
        }
        this.pincodeLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.form.patchValue({ pincode: '', post_office: '' });
        this.form.get('city')?.setValue('');
        this.form.get('state')?.setValue('');
        this.form.get('country')?.setValue('');
        this.postOfficeOptions = [];
        this.pincodeLoading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
