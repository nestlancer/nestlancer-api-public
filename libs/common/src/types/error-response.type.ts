/** Standard API error response envelope per 100-api-standards */
export interface ErrorResponse {
  status: 'error';
  error: ErrorDetail;
}

export interface ErrorDetail {
  code: string;
  message: string;
  details?: ValidationErrorDetail[];
  timestamp: string;
  requestId: string;
  path: string;
}

export interface ValidationErrorDetail {
  field: string;
  constraints: Record<string, string>;
}
