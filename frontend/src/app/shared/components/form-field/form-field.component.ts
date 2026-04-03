import { Component, Input, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

export interface SelectOption {
  value: string;
  label: string;
}

interface CountryCode {
  code: string;
  dial: string;
  flag: string;
  name: string;
}

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
  imports: [NgClass, ReactiveFormsModule, FormsModule, ClickOutsideDirective],
})
export class FormFieldComponent implements OnInit {
  @Input({ required: true }) formGroup!: FormGroup;
  @Input({ required: true }) controlName!: string;
  @Input({ required: true }) label!: string;
  @Input() fieldType: 'text' | 'email' | 'password' | 'url' | 'number' | 'select' | 'textarea' | 'checkbox' | 'phone' = 'text';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() submitted = false;
  @Input() options: SelectOption[] = [];
  @Input() selectPlaceholder = '';
  @Input() rows = 3;
  @Input() colSpan = '';

  // Phone field state
  phoneNumber = '';
  selectedCode = '+91';
  showDropdown = false;
  searchText = '';

  countries: CountryCode[] = [
    { code: 'IN', dial: '+91', flag: '🇮🇳', name: 'India' },
    { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States' },
    { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom' },
    { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE' },
    { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
    { code: 'SG', dial: '+65', flag: '🇸🇬', name: 'Singapore' },
    { code: 'MY', dial: '+60', flag: '🇲🇾', name: 'Malaysia' },
    { code: 'AU', dial: '+61', flag: '🇦🇺', name: 'Australia' },
    { code: 'CA', dial: '+1', flag: '🇨🇦', name: 'Canada' },
    { code: 'DE', dial: '+49', flag: '🇩🇪', name: 'Germany' },
    { code: 'FR', dial: '+33', flag: '🇫🇷', name: 'France' },
    { code: 'JP', dial: '+81', flag: '🇯🇵', name: 'Japan' },
    { code: 'CN', dial: '+86', flag: '🇨🇳', name: 'China' },
    { code: 'KR', dial: '+82', flag: '🇰🇷', name: 'South Korea' },
    { code: 'BD', dial: '+880', flag: '🇧🇩', name: 'Bangladesh' },
    { code: 'LK', dial: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
    { code: 'NP', dial: '+977', flag: '🇳🇵', name: 'Nepal' },
    { code: 'PK', dial: '+92', flag: '🇵🇰', name: 'Pakistan' },
    { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'Qatar' },
    { code: 'KW', dial: '+965', flag: '🇰🇼', name: 'Kuwait' },
    { code: 'OM', dial: '+968', flag: '🇴🇲', name: 'Oman' },
    { code: 'BH', dial: '+973', flag: '🇧🇭', name: 'Bahrain' },
    { code: 'ZA', dial: '+27', flag: '🇿🇦', name: 'South Africa' },
    { code: 'NZ', dial: '+64', flag: '🇳🇿', name: 'New Zealand' },
    { code: 'IT', dial: '+39', flag: '🇮🇹', name: 'Italy' },
    { code: 'ES', dial: '+34', flag: '🇪🇸', name: 'Spain' },
    { code: 'BR', dial: '+55', flag: '🇧🇷', name: 'Brazil' },
    { code: 'MX', dial: '+52', flag: '🇲🇽', name: 'Mexico' },
  ];

  ngOnInit(): void {
    if (this.fieldType === 'phone') {
      this.initPhone();
    }
  }

  get control() {
    return this.formGroup.get(this.controlName);
  }

  get hasError(): boolean {
    return !!this.control?.errors && (this.submitted || !!this.control?.touched);
  }

  get fieldId(): string {
    return `field_${this.controlName}`;
  }

  // Phone helpers
  get filteredCountries(): CountryCode[] {
    if (!this.searchText) return this.countries;
    const s = this.searchText.toLowerCase();
    return this.countries.filter(
      (c) => c.name.toLowerCase().includes(s) || c.dial.includes(s) || c.code.toLowerCase().includes(s)
    );
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

  emitPhoneValue(): void {
    this.control?.setValue({ code: this.selectedCode, number: this.phoneNumber });
    this.control?.markAsTouched();
  }

  selectCountry(country: CountryCode): void {
    this.selectedCode = country.dial;
    this.showDropdown = false;
    this.searchText = '';
    this.emitPhoneValue();
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) this.searchText = '';
  }
}
