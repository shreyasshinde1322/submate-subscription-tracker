import { HttpError } from '../utils/errors.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({
    error: { message: 'Resource not found.', code: 'NOT_FOUND' },
  });
}

// Centralized error handling. Never leaks SQL, file paths, or stack traces.
export function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = 500;
  let message = 'An unexpected server error occurred.';
  let code = 'INTERNAL_ERROR';
  let details;

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
    code = err.code || 'ERROR';
    details = err.details;
  } else if (err && err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON.';
    code = 'INVALID_JSON';
  } else if (err && err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large.';
    code = 'PAYLOAD_TOO_LARGE';
  }

  if (status >= 500) {
    console.error('[submate] Unhandled error:', err && err.message);
  }

  const body = { error: { message, code } };
  if (details) body.error.details = details;
  res.status(status).json(body);
}
