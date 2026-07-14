import { ConnectionPositionPair } from "@angular/cdk/overlay";

export const languages = [
  {
    langage: 'Español',
    flag: 'sp'
  },
  {
    langage: 'English',
    flag: 'us'
  }
];

export const userItems = [
  {
    icon: 'fa-regular fa-user',
    label: 'PROFILE',
    userEvent: 'profile'
  },
  {
    icon: 'fa-solid fa-gear',
    label: 'SETTINGS',
    userEvent: 'settings'
  },
  {
    icon: 'fa-solid fa-lock',
    label: 'LOCK_SCREEN',
    userEvent: 'profile'
  },
  {
    icon: 'fa-solid fa-right-from-bracket',
    label: 'LOGOUT',
    userEvent: 'logout'
  },
];

export const positions = [
  new ConnectionPositionPair(
    { originX: 'end', originY: 'bottom' },
    { overlayX: 'end', overlayY: 'top' }
  ),
];
