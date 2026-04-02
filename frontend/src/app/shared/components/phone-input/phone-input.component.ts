import { Component, forwardRef, Input, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

interface CountryCode {
  code: string;
  dial: string;
  flag: string;
  name: string;
}

@Component({
  selector: 'app-phone-input',
  standalone: true,
  templateUrl: './phone-input.component.html',
  styleUrl: './phone-input.component.css',
  imports: [FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true,
    },
  ],
})
export class PhoneInputComponent implements ControlValueAccessor {
  @Input() placeholder = 'Phone number';
  @Input() codeField = '+91';

  phoneNumber = '';
  selectedCode = '+91';
  showDropdown = false;
  searchText = '';
  disabled = false;

  onChange: any = () => {};
  onTouched: any = () => {};

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

  writeValue(value: any): void {
    if (value && typeof value === 'object') {
      this.selectedCode = value.code || '+91';
      this.phoneNumber = value.number || '';
    } else if (typeof value === 'string') {
      this.phoneNumber = value;
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  emitValue() {
    this.onChange({ code: this.selectedCode, number: this.phoneNumber });
  }

  selectCountry(country: CountryCode) {
    this.selectedCode = country.dial;
    this.showDropdown = false;
    this.searchText = '';
    this.emitValue();
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) this.searchText = '';
  }

  onPhoneChange() {
    this.emitValue();
  }

  onClickOutside(event: Event) {
    this.showDropdown = false;
  }
}
