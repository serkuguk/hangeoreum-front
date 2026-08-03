import {CanDeactivateFn} from '@angular/router';
import type {SettingsPageComponent} from './settings-page.component';

export const settingsPendingChangesGuard: CanDeactivateFn<SettingsPageComponent> = component =>
  component.canDeactivate();
