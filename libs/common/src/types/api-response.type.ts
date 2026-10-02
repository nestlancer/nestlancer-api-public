/** Standard API success response envelope per 100-api-standards */
export interface ApiResponse<T = unknown> {
  status: 'success';
  data: T;
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  timestamp: string;
  requestId: string;
  version: string;
  path?: string;
}
