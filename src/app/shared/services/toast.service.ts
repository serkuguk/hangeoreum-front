import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastVariant = 'correct' | 'warn' | 'error' | 'info';

export interface ToastPayload {
  message: string;
  description?: string | null;
  variant: ToastVariant;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly toastSubject = new BehaviorSubject<ToastPayload | null>(null);
  toast$ = this.toastSubject.asObservable();
  private hideTimer: any = null;

  constructor(private readonly zone: NgZone) {}

  mostrarToast(message: string, description: string | null = null, variant: ToastVariant = 'correct'): void {
    this.toastSubject.next({ message, description, variant });

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.zone.runOutsideAngular(() => {
      this.hideTimer = setTimeout(() => {
        this.zone.run(() => this.clear());
      }, 5000);
    });
  }

  clear(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.toastSubject.next(null);
  }
}
