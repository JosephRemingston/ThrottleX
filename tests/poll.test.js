import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";
import { pollConfig, registerServer } from "../api/controllers/config/poll.controller.js";
import Config from "../api/models/config/config.models.js";
import Server from "../api/models/config/server.model.js";
import HashService from "../api/services/config/hashService.js";

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("poll.controller", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("registerServer upserts server for authenticated API key", async () => {
    const req = {
      apiKey: { keyId: "key_abc" },
      body: {
        serverId: "srv-1",
        serverName: "api-node-1",
        environment: "production"
      }
    };
    const res = createRes();

    jest.spyOn(Server, "findOneAndUpdate").mockResolvedValue({
      serverId: "srv-1",
      customerApiKey: "key_abc"
    });

    await registerServer(req, res);

    expect(Server.findOneAndUpdate).toHaveBeenCalledWith(
      { serverId: "srv-1" },
      expect.objectContaining({ customerApiKey: "key_abc" }),
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    // Add debug logs to identify bottlenecks
    console.log("Request payload:", req);
    console.log("Response status calls:", res.status.mock.calls);
    console.log("Response JSON calls:", res.json.mock.calls);
  });

  test("registerServer returns 400 when serverId is missing", async () => {
    const req = {
      apiKey: { keyId: "key_abc" },
      body: {
        serverName: "api-node-1"
      }
    };
    const res = createRes();
    const updateSpy = jest.spyOn(Server, "findOneAndUpdate").mockResolvedValue(undefined);

    await registerServer(req, res);

    expect(updateSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "serverId is required" })
    );
    // Add debug logs to identify bottlenecks
    console.log("Request payload:", req);
    console.log("Response status calls:", res.status.mock.calls);
    console.log("Response JSON calls:", res.json.mock.calls);
  });

  test("pollConfig assigns version and updates server activeConfigs", async () => {
    const configId = new mongoose.Types.ObjectId();
    const req = {
      apiKey: { keyId: "key_abc" },
      serverId: "srv-1",
      params: { configName: "feature-flags" }
    };
    const res = createRes();

    jest.spyOn(Config, "findOne").mockResolvedValue({
      _id: configId,
      name: "feature-flags",
      rolloutPercentages: [
        { version: "v1", percentage: 80 },
        { version: "v2", percentage: 20 }
      ],
      versions: [
        { id: "v1", data: { a: 1 } },
        { id: "v2", data: { a: 2 } }
      ]
    });

    jest.spyOn(HashService, "assignVersion").mockReturnValue("v2");

    const save = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(Server, "findOne").mockResolvedValue({
      serverId: "srv-1",
      customerApiKey: "key_abc",
      lastPoll: null,
      activeConfigs: [],
      save
    });

    await pollConfig(req, res);

    expect(HashService.assignVersion).toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Config polled successfully",
        data: expect.objectContaining({ versionId: "v2" })
      })
    );
    // Add debug logs to identify bottlenecks
    console.log("Request payload:", req);
    console.log("Response status calls:", res.status.mock.calls);
    console.log("Response JSON calls:", res.json.mock.calls);
  });

  test("pollConfig creates a server record when the polling server is not registered yet", async () => {
    const configId = new mongoose.Types.ObjectId();
    const req = {
      apiKey: { keyId: "key_abc" },
      serverId: "srv-2",
      params: { configName: "feature-flags" }
    };
    const res = createRes();
    const createdServer = {
      serverId: "srv-2",
      customerApiKey: "key_abc",
      lastPoll: null,
      activeConfigs: [],
      save: jest.fn().mockResolvedValue(undefined)
    };

    jest.spyOn(Config, "findOne").mockResolvedValue({
      _id: configId,
      name: "feature-flags",
      rolloutPercentages: [{ version: "v1", percentage: 100 }],
      versions: [{ id: "v1", data: { enabled: true } }]
    });
    jest.spyOn(HashService, "assignVersion").mockReturnValue("v1");
    jest.spyOn(Server, "findOne").mockResolvedValue(null);
    jest.spyOn(Server, "create").mockResolvedValue(createdServer);

    await pollConfig(req, res);

    expect(Server.create).toHaveBeenCalledWith(
      expect.objectContaining({
        serverId: "srv-2",
        customerApiKey: "key_abc",
        status: "active"
      })
    );
    expect(createdServer.activeConfigs).toHaveLength(1);
    expect(createdServer.activeConfigs[0]).toEqual(
      expect.objectContaining({
        configId,
        version: "v1"
      })
    );
    expect(createdServer.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    // Add debug logs to identify bottlenecks
    console.log("Request payload:", req);
    console.log("Response status calls:", res.status.mock.calls);
    console.log("Response JSON calls:", res.json.mock.calls);
  });

  test("pollConfig returns 404 when the assigned version is not found in config versions", async () => {
    const configId = new mongoose.Types.ObjectId();
    const req = {
      apiKey: { keyId: "key_abc" },
      serverId: "srv-1",
      params: { configName: "feature-flags" }
    };
    const res = createRes();
    const findServerSpy = jest.spyOn(Server, "findOne").mockResolvedValue(null);

    jest.spyOn(Config, "findOne").mockResolvedValue({
      _id: configId,
      name: "feature-flags",
      rolloutPercentages: [{ version: "v2", percentage: 100 }],
      versions: [{ id: "v1", data: { enabled: true } }]
    });
    jest.spyOn(HashService, "assignVersion").mockReturnValue("v2");

    await pollConfig(req, res);

    expect(findServerSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Assigned config version not found" })
    );
    // Add debug logs to identify bottlenecks
    console.log("Request payload:", req);
    console.log("Response status calls:", res.status.mock.calls);
    console.log("Response JSON calls:", res.json.mock.calls);
  });

  // Adding edge case tests for invalid ObjectId and missing headers

  test("pollConfig rejects invalid ObjectId", async () => {
    jest.setTimeout(10000); // Set timeout to 10 seconds
    const req = {
      apiKey: { keyId: "key_abc" },
      serverId: "srv-1",
      params: { configName: "feature-flags" },
      body: { configId: "invalid-id" }
    };
    const res = createRes();

    await pollConfig(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid ObjectId" })
    );
    // Add debug logs to identify bottlenecks
    console.log("Request payload:", req);
    console.log("Response status calls:", res.status.mock.calls);
    console.log("Response JSON calls:", res.json.mock.calls);
  });

  test("pollConfig rejects requests without x-server-id header", async () => {
    const req = {
      apiKey: { keyId: "key_abc" },
      params: { configName: "feature-flags" }
    };
    const res = createRes();

    await pollConfig(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "x-server-id header is required" })
    );
    // Add debug logs to identify bottlenecks
    console.log("Request payload:", req);
    console.log("Response status calls:", res.status.mock.calls);
    console.log("Response JSON calls:", res.json.mock.calls);
  });
});
