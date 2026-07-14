import { inject, Injectable } from '@angular/core';

import {ErrorParserService} from "@core/services/error-parser.service";
import {ToastService} from "@shared/services/toast.service";
import {GlobalApiError as HcenApiError} from "@core/models/api-response.model";

export type SuccessAction = 'created' | 'updated' | 'deleted' | 'saved';
export type EntityType =
  | 'estancia'
  | 'hábito'
  | 'tratamiento'
  | 'petición'
  | 'registro'
  | 'profesional'
  | 'familiar'
  | 'especificos'
  | 'plan';
export type ToastVariant = 'correct' | 'warn';

@Injectable({
  providedIn: 'root',
})
export class ToastHelperService {
  private readonly toastService = inject(ToastService);
  private readonly errorParser = inject(ErrorParserService);

  /**
   * Mostrar success toast
   */
  showSuccess(action: SuccessAction, entity: EntityType = 'registro'): void {
    const messages = {
      created: {
        title: 'Creado correctamente',
        message: `El ${entity} se ha creado exitosamente`,
      },
      updated: {
        title: 'Actualizado correctamente',
        message: `Los cambios en ${entity} se han guardado`,
      },
      deleted: {
        title: 'Eliminado correctamente',
        message: `El ${entity} se ha eliminado correctamente`,
      },
      saved: {
        title: 'Guardado correctamente',
        message: `Los cambios se han guardado exitosamente`,
      },
    };

    const msg = messages[action];
    this.toastService.mostrarToast(msg.title, msg.message, 'correct');
  }

  /**
   * Mostrar error toast
   */
  showErrorToast(error: HcenApiError): void {
    if (!this.errorParser.shouldShowToast(error)) {
      return;
    }

    const title = this.errorParser.getTitleByHttpCode(error.httpCode);
    const message = error.processedMessage || error.originalMessage || 'Ha ocurrido un error inesperado';

    this.toastService.mostrarToast(title, message, 'error');

    // Errores adicionales
    if (error.errors && error.errors.length > 1) {
      error.errors.slice(1).forEach((err: any) => {
        this.toastService.mostrarToast('Error adicional', err.message);
      });
    }
  }

  /**
   * Mostrar custom success
   */
  showCustomSuccessToast(title: string, message: string): void {
    this.toastService.mostrarToast(title, message, 'correct');
  }

  /**
   * Mostrar warning toast
   */
  showWarning(title: string, message: string): void {
    this.toastService.mostrarToast(title, message, 'warn');
  }

  /**
   * Mostrar info toast
   */
  showInfo(title: string, message: string): void {
    this.toastService.mostrarToast(title, message, 'info');
  }

  /**
   * Mostrar info toast
   */
  showError(title: string, message: string): void {
    this.toastService.mostrarToast(title, message, 'error');
  }
}
