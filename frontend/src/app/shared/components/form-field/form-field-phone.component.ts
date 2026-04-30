import { ChangeDetectorRef, Component, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormGroup, FormsModule } from '@angular/forms';
import { SelectDropdownComponent, DropdownOption } from '../select-dropdown/select-dropdown.component';

interface CountryCode {
  code: string;
  dial: string;
  flag: string;
  name: string;
  minLen: number;
  maxLen: number;
}

/**
 * Phone input with country code picker. Extracted out of `form-field` so the
 * 30-line country table + length-validation logic doesn't bloat the generic
 * field component.
 *
 * Stores into the parent `FormGroup` as `{ code: '+91', number: '1234567890' }`
 * (keeping the same shape every form already uses, so payload transforms in
 * forms don't change). Sets control errors (`required` / `phoneLength`)
 * directly so the parent form's `invalid` reflects phone validity.
 */
@Component({
  selector: 'app-form-field-phone',
  standalone: true,
  imports: [NgClass, FormsModule, SelectDropdownComponent],
  template: `
    <div class="phone-input-wrapper border-border relative flex rounded-md border focus-within:border-primary"
      [ngClass]="{ 'border-red-500!': phoneError }">
      <app-select-dropdown
        triggerType="custom"
        [options]="countryOptions"
        [value]="selectedCode"
        (valueChange)="onCountrySelect($event)"
        searchPlaceholder="Search country..."
        [showSearch]="true"
        class="shrink-0">
        <button trigger type="button"
          class="text-foreground bg-muted/10 flex h-[34px] shrink-0 items-center gap-1 border-r border-border px-2.5 text-sm hover:bg-muted/20 focus:outline-none">
          <span class="text-base leading-none">{{ selectedCountry?.flag || '🌐' }}</span>
          <span class="text-muted-foreground text-xs">{{ selectedCode }}</span>
          <span class="text-muted-foreground/50 text-[10px]">▼</span>
        </button>
      </app-select-dropdown>
      <input
        type="tel"
        [ngModel]="phoneNumber"
        [ngModelOptions]="{ standalone: true }"
        (input)="onPhoneInput($event)"
        [placeholder]="placeholder || 'Phone number'"
        class="phone-input-number text-foreground h-[34px] flex-1 px-3 text-sm focus:outline-none" />
    </div>
    @if (phoneError) {
      <span class="mt-1 block text-xs text-red-500">{{ phoneError }}</span>
    }
    @if (!phoneError && isPending) {
      <span class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
        Checking…
      </span>
    }
    @if (!phoneError && notUniqueError) {
      <span class="mt-1 block text-xs text-red-500">{{ notUniqueError }}</span>
    }
  `,
})
export class FormFieldPhoneComponent implements OnInit, OnChanges {
  @Input({ required: true }) formGroup!: FormGroup;
  @Input({ required: true }) controlName!: string;
  @Input() label = '';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() submitted = false;
  @Input() siblingControlName = '';

  phoneNumber = '';
  selectedCode = '+91';
  phoneError = '';
  maxLen = 15;
  isPending = false;
  notUniqueError = '';

  private cdr = inject(ChangeDetectorRef);

  private readonly countries: CountryCode[] = [
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

  ngOnInit(): void {
    this.syncFromControl();
    this.validate();
    this.control?.valueChanges.subscribe((val) => {
      if (val && typeof val === 'object') {
        const nextNumber = val.number || '';
        const nextCode = val.code || '+91';
        if (nextNumber !== this.phoneNumber || nextCode !== this.selectedCode) {
          this.phoneNumber = nextNumber;
          this.selectedCode = nextCode;
          this.maxLen = this.countries.find(c => c.dial === nextCode)?.maxLen || 15;
          this.cdr.markForCheck();
        }
      }
      this.validate();
    });

    this.control?.statusChanges.subscribe((status) => {
      this.isPending = status === 'PENDING';
      this.notUniqueError = this.control?.errors?.['notUnique'] || '';
      this.cdr.markForCheck();
    });

    // When the sibling changes, re-run our own validate so phoneSame clears/sets.
    if (this.siblingControlName) {
      this.formGroup.get(this.siblingControlName)?.valueChanges.subscribe(() => {
        this.validate();
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['submitted'] || changes['required']) this.validate();
  }

  get control() {
    return this.formGroup.get(this.controlName);
  }

  get countryOptions(): DropdownOption[] {
    return this.countries.map((c) => ({ value: c.dial, label: `${c.flag} ${c.name} (${c.dial})` }));
  }

  get selectedCountry(): CountryCode | undefined {
    return this.countries.find((c) => c.dial === this.selectedCode);
  }

  onCountrySelect(dial: string): void {
    const country = this.countries.find((c) => c.dial === dial);
    if (!country) return;
    this.selectedCode = country.dial;
    this.maxLen = country.maxLen;
    // Trim the number down if the newly picked country caps shorter.
    if (this.phoneNumber.length > country.maxLen) {
      this.phoneNumber = this.phoneNumber.slice(0, country.maxLen);
    }
    this.writeToControl();
    this.validate();
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, this.maxLen);
    this.phoneNumber = digits;
    input.value = digits;
    this.writeToControl();
    this.validate();
  }

  private writeToControl(): void {
    this.control?.setValue({ code: this.selectedCode, number: this.phoneNumber });
    this.control?.markAsTouched();
  }

  private syncFromControl(): void {
    const val = this.control?.value;
    if (val && typeof val === 'object') {
      this.selectedCode = val.code || '+91';
      this.phoneNumber = val.number || '';
      this.maxLen = this.countries.find(c => c.dial === this.selectedCode)?.maxLen || 15;
    }
  }

  private validate(): void {
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

    // Cross-field: check against sibling control's number (computed fresh every time)
    let phoneSameError: { phoneSame: string } | null = null;
    if (this.siblingControlName && this.phoneNumber) {
      const siblingVal = this.formGroup.get(this.siblingControlName)?.value?.number?.trim();
      if (siblingVal && siblingVal === this.phoneNumber.trim()) {
        phoneSameError = { phoneSame: 'Must be different from the other contact number' };
        if (!controlError) displayError = 'Must be different from the other contact number';
      }
    }

    this.phoneError = displayError;
    // Merge with async errors (notUnique) — phoneSame is computed fresh above, never read from existing.
    const existingAsync = {
      ...(this.control?.errors?.['notUnique'] ? { notUnique: this.control.errors['notUnique'] } : {}),
      ...(phoneSameError || {}),
    };
    const hasExistingAsync = Object.keys(existingAsync).length > 0;
    const merged = controlError || hasExistingAsync
      ? { ...(controlError || {}), ...existingAsync }
      : null;
    // Defer setErrors to avoid ExpressionChangedAfterItHasBeenCheckedError —
    // mutating control state during a valueChanges callback happens mid change-detection.
    // Only write when value actually changed to avoid re-triggering valueChanges.
    if (this.control && JSON.stringify(this.control.errors || null) !== JSON.stringify(merged)) {
      this.control.setErrors(merged);
    }
  }
}
