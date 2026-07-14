/**
 * Fallback mensajes (se utilizan solo si el servidor no envió un mensaje)
 */
export const ERROR_MESSAGES: { [key: number]: string } = {
  // HTTP errors (fallback)
  400: 'Petición incorrecta',
  401: 'No autorizado. Por favor, inicie sesión nuevamente',
  403: 'No tiene permisos para realizar esta acción',
  404: 'Recurso no encontrado',
  429: 'Demasiadas peticiones. Por favor, espere un momento',
  500: 'Error del servidor. Por favor, inténtelo más tarde',
  502: 'Servidor no disponible temporalmente',
  503: 'Servicio no disponible',
  504: 'El servidor tardó demasiado en responder',

  // Network errors
  0: 'Error de conexión. Verifique su conexión a Internet'
};

/**
 * Títulos de toast según código HTTP
 */
export const ERROR_TITLES: { [key: number]: string } = {
  400: 'Error de validación',
  401: 'No autorizado',
  403: 'Acceso denegado',
  404: 'No encontrado',
  429: 'Límite excedido',
  500: 'Error del servidor',
  502: 'Servidor no disponible',
  503: 'Servicio no disponible',
  504: 'Tiempo de espera agotado',
  0: 'Error de conexión'
};