class AppError extends Error {
  constructor(message, statusCode, errors = [], isOperational = true) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { AppError };
