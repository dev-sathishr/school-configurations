import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectDropdownComponent } from '../select-dropdown/select-dropdown.component';

export interface SelectOption {
  value: string;
  label: string;
}

interface CountryCode {
  code: string;
  dial: string;
  flag: string;
  name: string;
  minLen: number;
  maxLen: number;
}

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
  imports: [NgClass, ReactiveFormsModule, FormsModule, SelectDropdownComponent],
})
export class FormFieldComponent implements OnInit, OnChanges {
  @Input({ required: true }) formGroup!: FormGroup;
  @Input({ required: true }) controlName!: string;
  @Input({ required: true }) label!: string;
  @Input() fieldType: 'text' | 'email' | 'password' | 'url' | 'number' | 'select' | 'async-select' | 'textarea' | 'checkbox' | 'phone' = 'text';
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
  @Input() digitsOnly = false;

  // Async select
  @Input() asyncUrl = '';
  @Input() asyncValueKey = 'id';
  @Input() asyncLabelKey = 'name';
  @Input() initialLabel = '';

  // Phone field state
  phoneNumber = '';
  selectedCode = '+91';

  countries: CountryCode[] = [
    { code: 'IN', dial: '+91', flag: '🇮🇳', name: 'India', minLen: 10, maxLen: 10 },
    { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States', minLen: 10, maxLen: 10 },
    { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom', minLen: 10, maxLen: 11 },
    { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE', minLen: 7, maxLen: 9 },
    { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia', minLen: 9, maxLen: 9 },
    { code: 'SG', dial: '+65', flag: '🇸🇬', name: 'Singapore', minLen: 8, maxLen: 8 },
    { code: 'MY', dial: '+60', flag: '🇲🇾', name: 'Malaysia', minLen: 9, maxLen: 10 },
    { code: 'AU', dial: '+61', flag: '🇦🇺', name: 'Australia', minLen: 9, maxLen: 9 },
    { code: 'CA', dial: '+1', flag: '🇨🇦', name: 'Canada', minLen: 10, maxLen: 10 },
    { code: 'DE', dial: '+49', flag: '🇩🇪', name: 'Germany', minLen: 10, maxLen: 11 },
    { code: 'FR', dial: '+33', flag: '🇫🇷', name: 'France', minLen: 9, maxLen: 9 },
    { code: 'JP', dial: '+81', flag: '🇯🇵', name: 'Japan', minLen: 10, maxLen: 11 },
    { code: 'CN', dial: '+86', flag: '🇨🇳', name: 'China', minLen: 11, maxLen: 11 },
    { code: 'KR', dial: '+82', flag: '🇰🇷', name: 'South Korea', minLen: 9, maxLen: 10 },
    { code: 'BD', dial: '+880', flag: '🇧🇩', name: 'Bangladesh', minLen: 10, maxLen: 10 },
    { code: 'LK', dial: '+94', flag: '🇱🇰', name: 'Sri Lanka', minLen: 9, maxLen: 9 },
    { code: 'NP', dial: '+977', flag: '🇳🇵', name: 'Nepal', minLen: 10, maxLen: 10 },
    { code: 'PK', dial: '+92', flag: '🇵🇰', name: 'Pakistan', minLen: 10, maxLen: 10 },
    { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'Qatar', minLen: 7, maxLen: 8 },
    { code: 'KW', dial: '+965', flag: '🇰🇼', name: 'Kuwait', minLen: 8, maxLen: 8 },
    { code: 'OM', dial: '+968', flag: '🇴🇲', name: 'Oman', minLen: 8, maxLen: 8 },
    { code: 'BH', dial: '+973', flag: '🇧🇭', name: 'Bahrain', minLen: 8, maxLen: 8 },
    { code: 'ZA', dial: '+27', flag: '🇿🇦', name: 'South Africa', minLen: 9, maxLen: 9 },
    { code: 'NZ', dial: '+64', flag: '🇳🇿', name: 'New Zealand', minLen: 8, maxLen: 9 },
    { code: 'IT', dial: '+39', flag: '🇮🇹', name: 'Italy', minLen: 9, maxLen: 10 },
    { code: 'ES', dial: '+34', flag: '🇪🇸', name: 'Spain', minLen: 9, maxLen: 9 },
    { code: 'BR', dial: '+55', flag: '🇧🇷', name: 'Brazil', minLen: 10, maxLen: 11 },
    { code: 'MX', dial: '+52', flag: '🇲🇽', name: 'Mexico', minLen: 10, maxLen: 10 },
  ];

  phoneError = '';

  ngOnInit(): void {
    if (this.fieldType === 'phone') {
      this.initPhone();
      this.validatePhone();
      this.control?.valueChanges.subscribe((val) => {
        if (val && typeof val === 'object') {
          const nextNumber = val.number || '';
          const nextCode = val.code || '+91';
          if (nextNumber !== this.phoneNumber || nextCode !== this.selectedCode) {
            this.phoneNumber = nextNumber;
            this.selectedCode = nextCode;
          }
        }
        this.validatePhone();
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['submitted'] && this.fieldType === 'phone') this.validatePhone();
    if (changes['required'] && this.fieldType === 'phone') this.validatePhone();
  }

  get control() { return this.formGroup.get(this.controlName); }

  get hasError(): boolean {
    return !!this.control?.errors && (this.submitted || !!this.control?.touched);
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
    return '';
  }

  // Select bridge
  onSelectChange(value: string): void {
    this.control?.setValue(value);
    this.control?.markAsTouched();
  }

  onSelectClosed(): void {
    this.control?.markAsTouched();
  }

  // Phone: country options for select-dropdown
  get countryOptions(): SelectOption[] {
    return this.countries.map((c) => ({ value: c.dial, label: `${c.flag} ${c.name} (${c.dial})` }));
  }

  onCountrySelect(dial: string): void {
    const country = this.countries.find((c) => c.dial === dial);
    if (!country) return;
    this.selectedCode = country.dial;
    if (this.phoneNumber.length > country.maxLen) {
      this.phoneNumber = this.phoneNumber.slice(0, country.maxLen);
    }
    this.control?.setValue({ code: this.selectedCode, number: this.phoneNumber });
    this.control?.markAsTouched();
    this.validatePhone();
  }

  get selectedCountry(): CountryCode | undefined {
    return this.countries.find((c) => c.dial === this.selectedCode);
  }

  initPhone(): void {
    const val = this.control?.value;
    if (val && typeof val === 'object') {
      this.selectedCode = val.code || '+91';
      this.phoneNumber = val.number || '';
    }
  }

  get phoneMaxLen(): number {
    return this.selectedCountry?.maxLen || 15;
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, this.phoneMaxLen);
    this.phoneNumber = digits;
    input.value = digits;
    this.control?.setValue({ code: this.selectedCode, number: this.phoneNumber });
    this.control?.markAsTouched();
    this.validatePhone();
  }

  validatePhone(): void {
    let controlError: Record<string, boolean> | null = null;
    let displayError = '';

    if (!this.phoneNumber) {
      if (this.required) {
        controlError = { required: true };
        if (this.submitted) displayError = `${this.label} is required`;
      }
    } else {
      const country = this.selectedCountry;
      if (country) {
        if (this.phoneNumber.length < country.minLen) {
          controlError = { phoneLength: true };
          displayError = `Minimum ${country.minLen} digits for ${country.name}`;
        } else if (this.phoneNumber.length > country.maxLen) {
          controlError = { phoneLength: true };
          displayError = `Maximum ${country.maxLen} digits for ${country.name}`;
        }
      }
    }

    this.phoneError = displayError;
    if (this.control && JSON.stringify(this.control.errors || null) !== JSON.stringify(controlError)) {
      this.control.setErrors(controlError);
    }
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
}
