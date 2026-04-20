import { Component, computed, inject, input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormFieldComponent, SelectOption } from '../form-field/form-field.component';
import { LocationContextService } from '../../../core/services/location-context.service';

/**
 * Location dropdown bound to the header multiselect context.
 *
 * The dropdown's options are always whatever the user has selected in the
 * navbar — so a form can't save a record under a location the user isn't
 * currently working in. For edit flows, pass `recordLocation` and that value
 * stays visible even if the user has since narrowed their header selection,
 * avoiding the "disappearing value" bug.
 *
 * Pre-filling and post-save resets stay with the caller (they depend on form
 * shape and timing), but `LocationContextService.preferredLocationId()` gives
 * the right default in one line.
 *
 * Usage:
 *   <app-location-field [formGroup]="form" [submitted]="submitted"
 *     [recordLocation]="loadedRecordLocation" />
 */
@Component({
  selector: 'app-location-field',
  standalone: true,
  imports: [FormFieldComponent],
  template: `
    <app-form-field
      [formGroup]="formGroup()"
      [controlName]="controlName()"
      [label]="label()"
      fieldType="select"
      [options]="options()"
      [required]="required()"
      [submitted]="submitted()"
      [selectPlaceholder]="selectPlaceholder()" />
  `,
})
export class LocationFieldComponent {
  private readonly locationCtx = inject(LocationContextService);

  readonly formGroup = input.required<FormGroup>();
  readonly controlName = input<string>('location_id');
  readonly label = input<string>('Location');
  readonly required = input<boolean>(true);
  readonly submitted = input<boolean>(false);
  readonly selectPlaceholder = input<string>('Select location');

  /**
   * The edited record's current location. Pass `{ id, name, code }` in edit
   * mode so it renders in the dropdown even if not in the header selection.
   * Null/undefined in create mode.
   */
  readonly recordLocation = input<{ id: string; name: string; code: string } | null>(null);

  readonly options = computed<SelectOption[]>(() => {
    const selected = this.locationCtx.selectedLocations();
    const sticky = this.recordLocation();
    const merged = sticky && !selected.some((l) => l.id === sticky.id)
      ? [...selected, sticky]
      : selected;
    return merged.map((l) => ({
      value: l.id,
      label: l.code ? `${l.name} (${l.code})` : l.name,
    }));
  });
}
