import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectDropdownComponent } from '../select-dropdown/select-dropdown.component';
import { FormFieldPhoneComponent } from './form-field-phone.component';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
  imports: [NgClass, ReactiveFormsModule, FormsModule, SelectDropdownComponent, FormFieldPhoneComponent],
})
export class FormFieldComponent {
  @Input({ required: true }) formGroup!: FormGroup;
  @Input({ required: true }) controlName!: string;
  @Input({ required: true }) label!: string;
  @Input() fieldType: 'text' | 'email' | 'password' | 'url' | 'number' | 'date' | 'select' | 'async-select' | 'textarea' | 'checkbox' | 'phone' = 'text';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() submitted = false;
  @Input() options: SelectOption[] = [];
  @Input() selectPlaceholder = '';
  @Input() rows = 3;
  @Input() colSpan = '';
  @Input() maxLength: number | null = null;
  @Input() minLength: number | null = null;
  @Input() uppercase = false;
  @Input() lowercase = false;
  @Input() titlecase = false;
  @Input() digitsOnly = false;
  @Input() lettersOnly = false;
  @Input() min: string | null = null;
  @Input() max: string | null = null;
  @Input() autocomplete: string | null = null;

  @Input() siblingControlName = '';

  // Async select
  @Input() asyncUrl = '';
  @Input() asyncValueKey = 'id';
  @Input() asyncLabelKey = 'name';
  @Input() asyncExtraKey = '';
  @Output() extraChange = new EventEmitter<string>();
  @Output() itemSelected = new EventEmitter<any>();
  @Input() initialLabel = '';

  private _readOnly = false;
  @Input() set readonly(value: boolean | '' | 'true' | 'false' | null | undefined) {
    this._readOnly = value === '' || value === true || value === 'true';
  }
  @Input() set readOnly(value: boolean | '' | 'true' | 'false' | null | undefined) {
    this._readOnly = value === '' || value === true || value === 'true';
  }
  get isReadOnly(): boolean { return this._readOnly; }

  get control() { return this.formGroup.get(this.controlName); }

  get hasError(): boolean {
    if (!this.control?.errors) return false;
    if (this.control.errors['notUnique']) return true;
    return this.submitted || !!this.control.touched;
  }

  get fieldId(): string { return `field_${this.controlName}`; }

  get errorMessage(): string {
    const errors = this.control?.errors;
    if (!errors) return '';
    if (errors['required']) return `${this.label} is required`;
    if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} characters`;
    if (errors['maxlength']) return `Maximum ${errors['maxlength'].requiredLength} characters`;
    if (errors['email']) return 'Enter a valid email';
    if (errors['pattern']) {
      const example = this.placeholder?.replace(/^e\.g\.\s*/i, '') || '';
      return example ? `Invalid format. e.g. ${example}` : 'Invalid format';
    }
    if (errors['academicYear']) {
      return 'End year must be exactly one year after the start year (e.g. 2025-2026)';
    }
    if (errors['max']) return `${this.label} cannot exceed ${errors['max'].max}`;
    if (errors['min']) return `${this.label} must be at least ${errors['min'].min}`;
    if (errors['dobMin']) return 'Employee must be at least 18 years old';
    if (errors['dobMax']) return 'Date of birth is too far in the past';
    if (errors['notUnique']) return typeof errors['notUnique'] === 'string' ? errors['notUnique'] : 'Already registered';
    return '';
  }

  get isPending(): boolean {
    return this.control?.status === 'PENDING';
  }

  /** Resolved maxlength: explicit @Input wins, otherwise read from the control's maxlength validator. */
  get resolvedMaxLength(): number | null {
    if (this.maxLength !== null) return this.maxLength;
    const validator = this.control?.validator;
    if (!validator) return null;
    // Call the validator with a fake max-length control to extract the requiredLength
    const result = validator({ value: 'x'.repeat(99999) } as any);
    return result?.['maxlength']?.requiredLength ?? null;
  }

  /** Characters typed so far — used for the live counter hint. */
  get currentLength(): number {
    const val = this.control?.value;
    return typeof val === 'string' ? val.length : 0;
  }

  // Select bridge
  onSelectChange(value: string): void {
    this.control?.setValue(value);
    this.control?.markAsTouched();
  }

  onSelectClosed(): void {
    this.control?.markAsTouched();
  }

  // Input transform hooks (case + digit filtering)
  onInput(): void {
    if (this.digitsOnly) { this.toDigits(); return; }
    if (this.lettersOnly) this.toLetters();
    if (this.uppercase) this.toUppercase();
    else if (this.lowercase) this.toLowercase();
    else if (this.titlecase) this.toTitlecase();
  }

  toUppercase(): void {
    const val = this.control?.value;
    if (val) this.control?.setValue(val.toUpperCase(), { emitEvent: false });
  }

  toLowercase(): void {
    const val = this.control?.value;
    if (val) this.control?.setValue(val.toLowerCase(), { emitEvent: false });
  }

  toDigits(): void {
    const val = this.control?.value;
    if (val) this.control?.setValue(val.replace(/\D/g, ''), { emitEvent: false });
  }

  toLetters(): void {
    const val = this.control?.value;
    if (val) this.control?.setValue(val.replace(/[^a-zA-Z\s'\-\.]/g, ''), { emitEvent: false });
  }

  toTitlecase(): void {
    const val = this.control?.value as string;
    if (!val) return;
    // Capitalize first letter of each word, lowercase the rest
    const transformed = val.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    if (transformed !== val) this.control?.setValue(transformed, { emitEvent: false });
  }
}
