import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  // If the error is not an instance of ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Something went wrong";
    error = new ApiError(statusCode, message, error.errors || [], err.stack);
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = `Resource not found with id of ${err.value}`;
    error = new ApiError(404, message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = new ApiError(400, message);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new ApiError(400, message);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token. Please log in again.";
    error = new ApiError(401, message);
  }

  if (err.name === "TokenExpiredError") {
    const message = "Your session has expired. Please log in again.";
    error = new ApiError(401, message);
  }

  const response = {
    ...error,
    message: error.message,
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
  };

  return res.status(error.statusCode).json(response);
};

export default errorHandler;