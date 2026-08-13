export interface ApiResponseMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: ApiResponseMeta;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function successResponse<T>(
  data: T,
  message?: string,
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function paginatedResponse<T>(
  data: T[],
  meta: ApiResponseMeta,
  message?: string,
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    meta,
    message,
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: unknown,
): ApiResponse<never> {
  return {
    success: false,
    error: { code, message, details },
  };
}
