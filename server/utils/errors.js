export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends HttpError {
  constructor(fields, message = 'The request contains invalid fields.') {
    super(400, message, { fields });
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'The requested resource was not found.') {
    super(404, message);
    this.name = 'NotFoundError';
    this.code = 'NOT_FOUND';
  }
}

export class ConflictError extends HttpError {
  constructor(message, details) {
    super(409, message, details);
    this.name = 'ConflictError';
    this.code = 'CONFLICT';
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'The request could not be processed.') {
    super(400, message);
    this.name = 'BadRequestError';
    this.code = 'BAD_REQUEST';
  }
}
