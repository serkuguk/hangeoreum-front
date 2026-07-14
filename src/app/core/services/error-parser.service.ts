import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse, GlobalApiError } from '../error/api-response.model';
import { ERROR_MESSAGES, ERROR_TITLES } from '@core/error/error-handler.service';

@Injectable({
  providedIn: 'root',
})
export class ErrorParserService {
  parseHttpError(error: HttpErrorResponse, context?: { [key: string]: any }): GlobalApiError {
    // 1. Estructura estándar { result: { errors: [...] } }
    if (error.error?.result) {
      return this.parseApiError(error.error, context);
    }

    // 2. Estructura alternativa { message, httpCode }
    if (error.error && (error.error.message || error.error.httpCode)) {
      return this.parseAlternativeError(error.error, context);
    }

    // 3. Network error
    return this.parseNetworkError(error);
  }

  private parseApiError(response: ApiResponse, context?: { [key: string]: any }): GlobalApiError {
    const result = response.result;
    const errors = result.errors || [];
    const firstError = errors[0];

    if (firstError?.message) {
      const originalMessage = firstError.message;
      const processedMessage = this.replacePlaceholders(originalMessage, context);

      return new GlobalApiError(result.http_code, firstError.code, originalMessage, processedMessage, result.trace_id, errors, context);
    }

    // Fallback
    const message = result.info || this.getFallbackMessage(result.http_code);

    return new GlobalApiError(result.http_code, result.http_code, message, message, result.trace_id, [], context);
  }

  private parseAlternativeError(errorData: any, context?: { [key: string]: any }): GlobalApiError {
    const httpCode = errorData.httpCode || errorData.status || 500;
    const code = errorData.code || httpCode;
    const originalMessage = errorData.message || 'Error desconocido';
    const traceId = errorData.traceId || errorData.trace_id;

    const processedMessage = this.replacePlaceholders(originalMessage, context);

    return new GlobalApiError(httpCode, code, originalMessage, processedMessage, traceId, [{ code, message: originalMessage }], context);
  }

  private parseNetworkError(error: HttpErrorResponse): GlobalApiError {
    let message = 'Error de conexión';

    if (error.status === 0) {
      message = 'No se pudo conectar con el servidor. Verifique su conexión a Internet';
    } else if (error.status === 504) {
      message = 'El servidor tardó demasiado en responder';
    } else if (error.statusText) {
      message = error.statusText;
    }

    return new GlobalApiError(error.status || 0, error.status || 0, message, message);
  }

  private replacePlaceholders(message: string, context?: { [key: string]: any }): string {
    if (!message) {
      return 'Error desconocido';
    }

    if (!context) {
      return message
        .replace(/\|%s\|/g, '')
        .replace(/%s/g, '')
        .trim();
    }

    const values = Object.values(context).filter(v => v !== null && v !== undefined);

    if (values.length === 0) {
      return message
        .replace(/\|%s\|/g, '')
        .replace(/%s/g, '')
        .trim();
    }

    let result = message;
    let valueIndex = 0;

    // cambiar |%s|
    result = result.replace(/\|%s\|/g, () => {
      return valueIndex < values.length ? String(values[valueIndex++]) : '';
    });

    // cambiar %s
    result = result.replace(/%s/g, () => {
      return valueIndex < values.length ? String(values[valueIndex++]) : '';
    });

    // cambiar {0}, {1}
    result = result.replace(/\{(\d+)\}/g, (match, index) => {
      const idx = parseInt(index, 10);
      return idx < values.length ? String(values[idx]) : match;
    });

    return result.replace(/\s+/g, ' ').trim();
  }

  private getFallbackMessage(httpCode: number): string {
    return ERROR_MESSAGES[httpCode] || ERROR_MESSAGES[0];
  }

  getTitleByHttpCode(httpCode: number): string {
    return ERROR_TITLES[httpCode] || ERROR_TITLES[0];
  }

  shouldShowToast(error: GlobalApiError): boolean {
    return error.httpCode !== 401;
  }

  logError(error: GlobalApiError, additionalContext?: any): void {
    const logLevel = this.getLogLevel(error.httpCode);

    //console.group(`🚨 AGON API Error [${error.httpCode}]`);

    if (logLevel === 'error') {
      //console.error('Type:', 'API Error');
    } else if (logLevel === 'warn') {
      //console.warn('Type:', 'Client Error');
    }

    if (error.errors && error.errors.length > 0) {
      //console.error('All Errors:', error.errors);
    }

    if (error.context) {
      //console.error('Request Context:', error.context);
    }

    if (additionalContext) {
      //console.error('Additional Context:', additionalContext);
    }

    //console.groupEnd();
  }

  private getLogLevel(httpCode: number): 'error' | 'warn' | 'info' {
    if (httpCode >= 500) return 'error';
    if (httpCode >= 400) return 'warn';
    return 'info';
  }
}
