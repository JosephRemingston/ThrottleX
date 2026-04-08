import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";
import {
  addConfigVersion,
  createConfig,
  listConfigs,
  updateConfig
} from "../api/controllers/config/config.controller.js";
import Config from "../api/models/config/config.models.js";

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("config.controller", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("createConfig stores customerApiKey from req.apiKey.keyId", async () => {
    const configId = new mongoose.Types.ObjectId();
    const req = {
      apiKey: { keyId: "key_123" },
      body: {
        name: " rollout-main ",
        description: "main config",
        versions: [{ id: "v1", data: { enabled: true } }],
        rolloutPercentages: [{ version: "v1", percentage: 100 }],
        thresholds: { rollbackThreshold: 5, advanceThreshold: 1 }
      }
    };
    const res = createRes();

    jest.spyOn(Config, "create").mockResolvedValue({
      _id: configId,
      customerApiKey: "key_123",
      name: "rollout-main"
    });

    await createConfig(req, res);

    expect(Config.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customerApiKey: "key_123",
        name: "rollout-main"
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("createConfig returns 400 when name is missing", async () => {
    const req = {
      apiKey: { keyId: "key_123" },
      body: {
        description: "no name"
      }
    };
    const res = createRes();

    await createConfig(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "name is required" })
    );
  });

  test("createConfig returns 400 when rolloutPercentages is not an array", async () => {
    const req = {
      apiKey: { keyId: "key_123" },
      body: {
        name: "main",
        rolloutPercentages: "100"
      }
    };
    const res = createRes();
    const createSpy = jest.spyOn(Config, "create").mockResolvedValue(undefined);

    await createConfig(req, res);

    expect(createSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "rolloutPercentages must be an array" })
    );
  });

  test("createConfig returns 400 when rolloutPercentages reference unknown versions", async () => {
    const req = {
      apiKey: { keyId: "key_123" },
      body: {
        name: "main",
        versions: [{ id: "v1", data: { enabled: true } }],
        rolloutPercentages: [{ version: "v2", percentage: 100 }]
      }
    };
    const res = createRes();
    const createSpy = jest.spyOn(Config, "create").mockResolvedValue(undefined);

    await createConfig(req, res);

    expect(createSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "rolloutPercentages reference versions that do not exist"
      })
    );
  });

  test("createConfig returns 400 when rolloutPercentages do not sum to 100", async () => {
    const req = {
      apiKey: { keyId: "key_123" },
      body: {
        name: "main",
        versions: [{ id: "v1", data: { enabled: true } }],
        rolloutPercentages: [{ version: "v1", percentage: 80 }]
      }
    };
    const res = createRes();
    const createSpy = jest.spyOn(Config, "create").mockResolvedValue(undefined);

    await createConfig(req, res);

    expect(createSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "rolloutPercentages must sum to 100" })
    );
  });

  test("listConfigs scopes the query to the authenticated api key", async () => {
    const req = {
      apiKey: { keyId: "key_123" }
    };
    const res = createRes();
    const sort = jest.fn().mockResolvedValue([{ name: "cfg-1" }]);

    jest.spyOn(Config, "find").mockReturnValue({ sort });

    await listConfigs(req, res);

    expect(Config.find).toHaveBeenCalledWith({ customerApiKey: "key_123" });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("updateConfig returns 400 when no supported update fields are provided", async () => {
    const req = {
      apiKey: { keyId: "key_123" },
      params: { configId: new mongoose.Types.ObjectId().toString() },
      body: {}
    };
    const res = createRes();
    const updateSpy = jest.spyOn(Config, "findOneAndUpdate").mockResolvedValue(undefined);

    await updateConfig(req, res);

    expect(updateSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Provide rolloutPercentages or thresholds to update"
      })
    );
  });

  test("updateConfig returns 400 when rolloutPercentages reference unknown versions", async () => {
    const req = {
      apiKey: { keyId: "key_123" },
      params: { configId: new mongoose.Types.ObjectId().toString() },
      body: {
        rolloutPercentages: [{ version: "v2", percentage: 100 }]
      }
    };
    const res = createRes();
    const config = {
      versions: [{ id: "v1", data: { enabled: true } }],
      save: jest.fn()
    };

    jest.spyOn(Config, "findOne").mockResolvedValue(config);

    await updateConfig(req, res);

    expect(config.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "rolloutPercentages reference versions that do not exist"
      })
    );
  });

  test("updateConfig returns 400 when rolloutPercentages do not sum to 100", async () => {
    const req = {
      apiKey: { keyId: "key_123" },
      params: { configId: new mongoose.Types.ObjectId().toString() },
      body: {
        rolloutPercentages: [{ version: "v1", percentage: 75 }]
      }
    };
    const res = createRes();
    const config = {
      versions: [{ id: "v1", data: { enabled: true } }],
      save: jest.fn()
    };

    jest.spyOn(Config, "findOne").mockResolvedValue(config);

    await updateConfig(req, res);

    expect(config.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "rolloutPercentages must sum to 100" })
    );
  });

  test("addConfigVersion rejects duplicate version ids for the same config", async () => {
    const req = {
      apiKey: { keyId: "key_123" },
      params: { configId: new mongoose.Types.ObjectId().toString() },
      body: {
        id: "v1",
        data: { enabled: true }
      }
    };
    const res = createRes();
    const config = {
      versions: [{ id: "v1", data: { enabled: false } }],
      save: jest.fn()
    };

    jest.spyOn(Config, "findOne").mockResolvedValue(config);

    await addConfigVersion(req, res);

    expect(config.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Version already exists for this config" })
    );
  });
});
