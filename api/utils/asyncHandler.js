const asyncHandler = (request) => async (req, res, next) => {
  try {
    return await Promise.resolve(request(req, res, next));
  } catch (err) {
    if (typeof next === "function") {
      return next(err);
    }

    const statusCode = err?.statusCode || 500;
    return res.status(statusCode).json({
      statusCode,
      message: err?.message || "Something went wrong",
    });
  }
};

export default asyncHandler;
