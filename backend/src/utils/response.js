/**
 * Standard API response helpers.
 */

const success = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const created = (res, data = {}, message = 'Created successfully') => {
  return success(res, data, message, 201);
};

const error = (res, message = 'Internal server error', statusCode = 500, errors = null) => {
  const body = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (errors) {body.errors = errors;}
  return res.status(statusCode).json(body);
};

const unauthorized = (res, message = 'Unauthorized') => error(res, message, 401);
const forbidden = (res, message = 'Forbidden') => error(res, message, 403);
const notFound = (res, message = 'Resource not found') => error(res, message, 404);
const badRequest = (res, message = 'Bad request', errors = null) => error(res, message, 400, errors);

module.exports = { success, created, error, unauthorized, forbidden, notFound, badRequest };
