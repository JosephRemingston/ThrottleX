import { afterEach, describe, expect, jest, test } from "@jest/globals";
import HashService from "../api/services/config/hashService.js";

describe("HashService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("serverToBucket is deterministic for the same server id", () => {
    const serverId = "server-prod-001";

    const first = HashService.serverToBucket(serverId);
    const second = HashService.serverToBucket(serverId);

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(100);
  });

  test("assignVersion always returns a version that exists in rollout list", () => {
    const rolloutPercentages = [
      { version: "v1", percentage: 80 },
      { version: "v2", percentage: 20 }
    ];

    const candidates = new Set(rolloutPercentages.map((item) => item.version));

    for (let i = 0; i < 20; i += 1) {
      const assigned = HashService.assignVersion(`server-${i}`, rolloutPercentages);
      expect(candidates.has(assigned)).toBe(true);
    }
  });

  test("assignVersion honors percentage ordering even when input order is unsorted", () => {
    jest.spyOn(HashService, "serverToBucket").mockReturnValue(10);

    const assigned = HashService.assignVersion("server-any", [
      { version: "canary", percentage: 20 },
      { version: "stable", percentage: 80 }
    ]);

    expect(assigned).toBe("stable");
  });

  test("assignVersion falls back to the first rollout when totals do not cover all buckets", () => {
    jest.spyOn(HashService, "serverToBucket").mockReturnValue(95);

    const assigned = HashService.assignVersion("server-any", [
      { version: "v1", percentage: 40 },
      { version: "v2", percentage: 40 }
    ]);

    expect(assigned).toBe("v1");
  });

  test("assignVersion falls back safely when rollout list is empty", () => {
    const assigned = HashService.assignVersion("server-any", []);
    expect(assigned).toBeNull();
  });

  test("calculateDistribution rounds server counts to the nearest integer", () => {
    const distribution = HashService.calculateDistribution(3, [
      { version: "v1", percentage: 33 },
      { version: "v2", percentage: 67 }
    ]);

    expect(distribution).toEqual({
      v1: 1,
      v2: 2
    });
  });
});
