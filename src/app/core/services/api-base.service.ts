import {inject, Injectable} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {ApiResponse, GlobalApiError} from "@core/models/api-response.model";
import {Observable, throwError} from "rxjs";
import {ErrorParserService} from "@core/services/error-parser.service";

@Injectable({
  providedIn: 'root',
})
export abstract class ApiBaseService {

  private readonly errorParser = inject(ErrorParserService);

  /**
   * Procesando una respuesta exitosa
   */
  protected handleSuccess<T>(response: ApiResponse<T>): T {
    // Probamos el status en result
    if (response.result && !response.result.status) {
      // Status: falso pero sin error HTTP (raro, pero posible)
      throw new GlobalApiError(
        response.result.http_code,
        response.result.errors?.[0]?.code || 0,
        response.result.info,
        response.result.info,
        response.result.trace_id,
        response.result.errors,
      );
    }

    return response.data as T;
  }

  /**
   * Manejo de errores (¡FUNCIÓN PRINCIPAL!)
   */
  protected handleError(error: HttpErrorResponse, context?: any): Observable<never> {
    // Analizando el error a través de ErrorParser
    const agonError = this.errorParser.parseHttpError(error, context);

    // Estamos registrando
    this.errorParser.logError(agonError, {
      url: error.url,
      status: error.status,
      statusText: error.statusText,
    });

    this.errorParser.logError(agonError);
    // Pasamos el error controlado al componente.
    return throwError(() => agonError);
  }

  protected createContext(data: any): any {
    const context: any = {};

    if (data.fecha_estancia) {
      context.fecha = data.fecha_estancia;
    }
    if (data.nombre) {
      context.nombre = data.nombre;
    }
    return context;
  }
}
