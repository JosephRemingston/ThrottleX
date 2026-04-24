import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const scheduleMock = jest.fn();
const configFindMock = jest.fn();
const metricAggregateMock = jest.fn();
const serverUpdateManyMock = jest.fn();
const apiKeyFindOneMock = jest.fn();
const tenantFindByIdMock = jest.fn();
const sendAlertEmailMock = jest.fn();

jest.unstable_mockModule("node-cron", () => ({
  default: {
    schedule: scheduleMock
  }
}));

jest.unstable_mockModule("../api/models/config/config.models.js", () => ({
  default: {
    find: configFindMock
  }
}));

jest.unstable_mockModule("../api/models/config/metric.models.js", () => ({
  default: {
    aggregate: metricAggregateMock
  }
}));

jest.unstable_mockModule("../api/models/config/server.model.js", () => ({
  default: {
    updateMany: serverUpdateManyMock
  }
}));

jest.unstable_mockModule("../api/models/apiKey.models.js", () => ({
  default: {
    findOne: apiKeyFindOneMock
  }
}));

jest.unstable_mockModule("../api/models/tenant.models.js", () => ({
  default: {
    findById: tenantFindByIdMock
  }
}));

jest.unstable_mockModule("../aws/ses.js", () => ({
  sendAlertEmail: sendAlertEmailMock
}));

const { startRolloutMonitor } = await import("../jobs/rolloutMonitor.js");

const originalEnv = {
  ROLLOUT_CHECK_INTERVAL_SECONDS: process.env.ROLLOUT_CHECK_INTERVAL_SECONDS,
  METRICS_LOOKBACK_SECONDS: process.env.METRICS_LOOKBACK_SECONDS,
  ERROR_RATE_THRESHOLD_MULTIPLIER: process.env.ERROR_RATE_THRESHOLD_MULTIPLIER,
  ROLLOUT_STEP_PERCENTAGE: process.env.ROLLOUT_STEP_PERCENTAGE,
  SERVER_STALE_THRESHOLD_MINUTES: process.env.SERVER_STALE_THRESHOLD_MINUTES
};

describe("rolloutMonitor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});

    delete process.env.ROLLOUT_CHECK_INTERVAL_SECONDS;
    delete process.env.METRICS_LOOKBACK_SECONDS;
    delete process.env.ERROR_RATE_THRESHOLD_MULTIPLIER;
    delete process.env.ROLLOUT_STEP_PERCENTAGE;
    delete process.env.SERVER_STALE_THRESHOLD_MINUTES;

    configFindMock.mockResolvedValue([]);
    metricAggregateMock.mockResolvedValue([]);
    serverUpdateManyMock.mockResolvedValue({ modifiedCount: 0 });
    apiKeyFindOneMock.mockResolvedValue(null);
    tenantFindByIdMock.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();

    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  test("startRolloutMonitor registers cron schedule", () => {
    process.env.ROLLOUT_CHECK_INTERVAL_SECONDS = "30";

    startRolloutMonitor();

    expect(scheduleMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock).toHaveBeenCalledWith("*/30 * * * * *", expect.any(Function));
  });

  test("startRolloutMonitor falls back to the default interval for invalid env values", () => {
    process.env.ROLLOUT_CHECK_INTERVAL_SECONDS = "invalid";

    startRolloutMonitor();

    expect(scheduleMock).toHaveBeenCalledWith("*/30 * * * * *", expect.any(Function));
  });

  test("scheduled iteration advances a safe canary rollout and cleans up stale servers", async () => {
    const config = {
      _id: new mongoose.Types.ObjectId(),
      name: "feature-flags",
      rollbackThreshold: 5,
      advanceThreshold: 1,
      rolloutPercentages: [
        { version: "stable", percentage: 80 },
        { version: "canary", percentage: 20 }
      ],
      save: jest.fn().mockResolvedValue(undefined)
    };

    process.env.ROLLOUT_STEP_PERCENTAGE = "20";
    process.env.SERVER_STALE_THRESHOLD_MINUTES = "7";

    configFindMock.mockResolvedValue([config]);
    metricAggregateMock.mockResolvedValue([
      {
        version: "canary",
        averageErrorRate: 0.2,
        averageLatency: 45,
        totalRequests: 500,
        polledServerCount: 2
      }
    ]);

    startRolloutMonitor();
    const scheduledIteration = scheduleMock.mock.calls[0][1];

    await scheduledIteration();

    expect(config.save).toHaveBeenCalled();
    expect(config.rolloutPercentages).toEqual([
      { version: "stable", percentage: 60 },
      { version: "canary", percentage: 40 }
    ]);
    expect(sendAlertEmailMock).not.toHaveBeenCalled();
    expect(serverUpdateManyMock).toHaveBeenCalledWith(
      {
        lastPoll: { $lt: expect.any(Date) },
        status: "active"
      },
      {
        $set: { status: "inactive" }
      }
    );
  });

  test("scheduled iteration logs and swallows monitor failures", async () => {
    configFindMock.mockRejectedValueOnce(new Error("database unavailable"));

    startRolloutMonitor();
    const scheduledIteration = scheduleMock.mock.calls[0][1];

    await scheduledIteration();

    expect(console.error).toHaveBeenCalledWith(
      "[rollout-monitor] Iteration failed:",
      "database unavailable"
    );
  });

  // Adding edge case tests for rollback triggers

  test("scheduled iteration triggers rollback for high error rates", async () => {
    const config = {
      _id: new mongoose.Types.ObjectId(),
      name: "feature-flags",
      rollbackThreshold: 5,
      advanceThreshold: 1,
      rolloutPercentages: [
        { version: "stable", percentage: 80 },
        { version: "canary", percentage: 20 }
      ],
      save: jest.fn().mockResolvedValue(undefined)
    };

    metricAggregateMock.mockResolvedValue([
      { version: "canary", averageErrorRate: 6 }
    ]);

    configFindMock.mockResolvedValue([config]);

    await startRolloutMonitor();

    expect(config.save).toHaveBeenCalled();
    expect(config.rolloutPercentages).toEqual([
      { version: "stable", percentage: 100 },
      { version: "canary", percentage: 0 }
    ]);

    // Add debug logs to verify rollback logic
    console.log("Mocked metrics:", metricAggregateMock.mock.calls);
    console.log("Mocked configs:", configFindMock.mock.calls);
  });
});
