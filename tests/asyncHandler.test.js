import { describe, expect, jest, test } from "@jest/globals";
import asyncHandler from "../api/utils/asyncHandler.js";
import ApiError from "../api/utils/ApiError.js";

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("asyncHandler", () => {
  test("forwards errors to next so the centralized error middleware can handle them", async () => {
    const next = jest.fn();
    const res = createRes();
    const wrapped = asyncHandler(async () => {
      throw new ApiError(400, "bad request");
    });

    await wrapped({}, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "bad request"
      })
    );
    expect(res.status).not.toHaveBeenCalled();
  });

  test("returns a fallback error response when next is unavailable", async () => {
    const res = createRes();
    const wrapped = asyncHandler(async () => {
      throw new Error("unexpected failure");
    });

    await wrapped({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: "unexpected failure"
    });
  });
});
