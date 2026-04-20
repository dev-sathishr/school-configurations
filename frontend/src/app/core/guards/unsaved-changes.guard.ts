import { inject, Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';

/**
 * Components that can block navigation when they hold unsaved work implement
 * `CanComponentDeactivate`. The guard calls `canDeactivate()` on the
 * outgoing component — anything truthy means "yes, leave"; `false` (or a
 * falsy observable/promise) blocks routing in place.
 *
 * `FormPageBase` already implements this: returns `true` when the form is
 * pristine or already saving, and otherwise confirms with the user.
 */
export interface CanComponentDeactivate {
  canDeactivate(): boolean | Promise<boolean>;
}

@Injectable({ providedIn: 'root' })
export class UnsavedChangesGuard implements CanDeactivate<CanComponentDeactivate> {
  canDeactivate(component: CanComponentDeactivate): boolean | Promise<boolean> {
    return component.canDeactivate ? component.canDeactivate() : true;
  }
}
