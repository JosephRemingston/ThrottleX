import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";
import { getAggregatedMetrics, ingestMetrics } from "../api/controllers/config/metrics.controller.js";
import Config from "../api/models/config/config.models.js";
import Metric from "../api/models/config/metric.models.js";

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const originalLookbackSeconds = process.env.METRICS_LOOKBACK_SECONDS;

describe("metrics.controller", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    if (originalLookbackSeconds === undefined) {
      delete process.env.METRICS_LOOKBACK_SECONDS;
      return;
    }

    process.env.METRICS_LOOKBACK_SECONDS = originalLookbackSeconds;
  });

  test("ingestMetrics creates a metric document for valid request", async () => {
    const configId = new mongoose.Types.ObjectId().toString();
    const req = {
      serverId: "srv-1",
      apiKey: { keyId: "key_1" },
      body: {
        configId,
        version: "v2",
        errorRate: 2.4,
        latency: 120,
        crashCount: 0,
        requestCount: 500,
        customMetrics: { cpu: 45 }
      }
    };
    const res = createRes();

    jest.spyOn(Config, "findOne").mockResolvedValue({ _id: configId, name: "cfg" });
    jest.spyOn(Metric, "create").mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

    await ingestMetrics(req, res);

    expect(Metric.create).toHaveBeenCalledWith(
      expect.objectContaining({ serverId: "srv-1", version: "v2" })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("ingestMetrics rejects invalid config ids before hitting the database", async () => {
    const req = {
      serverId: "srv-1",
      apiKey: { keyId: "key_1" },
      body: {
        configId: "not-an-object-id",
        version: "v2"
      }
    };
    const res = createRes();
    const configFindSpy = jest.spyOn(Config, "findOne").mockResolvedValue(null);
    const metricCreateSpy = jest.spyOn(Metric, "create").mockResolvedValue(undefined);

    await ingestMetrics(req, res);

    expect(configFindSpy).not.toHaveBeenCalled();
    expect(metricCreateSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "configId must be a valid ObjectId" })
    );
  });

  test("ingestMetrics trims the reported version before storing metrics", async () => {
    const configId = new mongoose.Types.ObjectId().toString();
    const req = {
      serverId: "srv-1",
      apiKey: { keyId: "key_1" },
      body: {
        configId,
        version: "  v2  "
      }
    };
    const res = createRes();

    jest.spyOn(Config, "findOne").mockResolvedValue({ _id: configId, name: "cfg" });
    jest.spyOn(Metric, "create").mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

    await ingestMetrics(req, res);

    expect(Metric.create).toHaveBeenCalledWith(
      expect.objectContaining({ version: "v2" })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("getAggregatedMetrics returns grouped metrics by version", async () => {
    const configId = new mongoose.Types.ObjectId().toString();
    const req = {
      apiKey: { keyId: "key_1" },
      params: { configId }
    };
    const res = createRes();

    jest.spyOn(Config, "findOne").mockResolvedValue({ _id: configId, name: "cfg" });
    jest.spyOn(Metric, "aggregate").mockResolvedValue([
      { version: "v1", averageErrorRate: 1.1, averageLatency: 50, totalRequests: 1000 }
    ]);

    process.env.METRICS_LOOKBACK_SECONDS = "120";

    await getAggregatedMetrics(req, res);

    expect(Metric.aggregate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          configId,
          lookbackSeconds: 120,
          byVersion: expect.any(Array)
        })
      })
    );
  });

  test("getAggregatedMetrics falls back to the default lookback window when env is invalid", async () => {
    const configId = new mongoose.Types.ObjectId().toString();
    const req = {
      apiKey: { keyId: "key_1" },
      params: { configId }
    };
    const res = createRes();

    process.env.METRICS_LOOKBACK_SECONDS = "invalid";

    jest.spyOn(Config, "findOne").mockResolvedValue({ _id: configId, name: "cfg" });
    jest.spyOn(Metric, "aggregate").mockResolvedValue([]);

    await getAggregatedMetrics(req, res);

    const pipeline = Metric.aggregate.mock.calls[0][0];

    expect(pipeline[0].$match.configId.toString()).toBe(configId);
    expect(pipeline[0].$match.timestamp.$gte).toBeInstanceOf(Date);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lookbackSeconds: 60
        })
      })
    );
  });

  test("getAggregatedMetrics returns 404 when config does not belong to the api key", async () => {
    const configId = new mongoose.Types.ObjectId().toString();
    const req = {
      apiKey: { keyId: "key_1" },
      params: { configId }
    };
    const res = createRes();
    const aggregateSpy = jest.spyOn(Metric, "aggregate").mockResolvedValue([]);

    jest.spyOn(Config, "findOne").mockResolvedValue(null);

    await getAggregatedMetrics(req, res);

    expect(aggregateSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Config not found" })
    );
  });
});
