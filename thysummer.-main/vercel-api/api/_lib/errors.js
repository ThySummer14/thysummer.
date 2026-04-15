export class ApiError extends Error {
  constructor(status, code, message = code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const isApiError = (error) => error instanceof ApiError;
