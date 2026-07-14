export interface ApiResponse<T = any> {
  result: ApiResult;
  data?: T;
  metadata?: ApiMetadata;
}

export interface ApiResult {
  status: boolean;
  http_code: number;
  info: string;
  trace_id?: string;
  errors?: ApiError[];
  stack_trace?: ApiStackTrace[];
}

export interface ApiError {
  code: number;
  message: string;
  field?: string;
}

export interface ApiStackTrace {
  method_name: string;
  file_name: string;
  line_number: number;
  class_name: string;
}

export interface ApiMetadata {
  paging: ApiPaging;
}

export interface ApiPaging {
  init: number;
  limit: number;
  total_items?: number;
  total_pages?: number;
}

export class GlobalApiError extends Error {
  constructor(
    public httpCode: number,
    public code: number,
    public originalMessage: string,
    public processedMessage: string,
    public traceId?: string,
    public errors?: ApiError[],
    public context?: any
  ) {
    super(processedMessage);
    this.name = 'GlobalApiError';
  }
}
