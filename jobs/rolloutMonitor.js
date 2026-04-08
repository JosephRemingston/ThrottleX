import cron from "node-cron";
import Config from "../api/models/config/config.models.js";
import Metric from "../api/models/config/metric.models.js";
import Server from "../api/models/config/server.model.js";
import ApiKey from "../api/models/apiKey.models.js";
import Tenant from "../api/models/tenant.models.js";
import { sendAlertEmail } from "../aws/ses.js";

const previousStableRollouts = new Map();

const getNumberEnv = (name, fallback) => {
  const parsed = Number.parseFloat(process.env[name]);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const getRolloutCronSchedule = () => {
  const intervalSeconds = Math.floor(
    getNumberEnv("ROLLOUT_CHECK_INTERVAL_SECONDS", 30)
  );

  return `*/${intervalSeconds} * * * * *`;
};

const getTenantEmailForConfig = async (config) => {
  const apiKey = await ApiKey.findOne({ keyId: config.customerApiKey });
  if (!apiKey?.tenantId) {
    return null;
  }

  const tenant = await Tenant.findById(apiKey.tenantId).select("email");
  return tenant?.email ?? null;
};

const getRecentVersionMetrics = async (configId, lookbackSeconds) => {
  const since = new Date(Date.now() - lookbackSeconds * 1000);

  return Metric.aggregate([
    {
      $match: {
        configId,
        timestamp: { $gte: since }
      }
    },
    {
      $group: {
        _id: "$version",
        averageErrorRate: { $avg: "$errorRate" },
        averageLatency: { $avg: "$latency" },
        totalRequests: { $sum: "$requestCount" },
        polledServers: { $addToSet: "$serverId" }
      }
    },
    {
      $project: {
        _id: 0,
        version: "$_id",
        averageErrorRate: 1,
        averageLatency: 1,
        totalRequests: 1,
        polledServerCount: { $size: "$polledServers" }
      }
    }
  ]);
};

const toVersionMap = (rolloutPercentages) => {
  const map = new Map();
  for (const rollout of rolloutPercentages) {
    map.set(rollout.version, rollout.percentage);
  }

  return map;
};

const toSortedRollouts = (percentageMap) =>
  [...percentageMap.entries()]
    .map(([version, percentage]) => ({ version, percentage }))
    .sort((a, b) => b.percentage - a.percentage);

const rollbackConfig = async (config, failingVersion) => {
  const cachedStableState = previousStableRollouts.get(config._id.toString());

  if (cachedStableState?.length) {
    config.rolloutPercentages = cachedStableState;
  } else {
    const sorted = [...config.rolloutPercentages].sort(
      (a, b) => a.percentage - b.percentage
    );
    const lowestPercentageVersion = sorted[0]?.version;

    if (!lowestPercentageVersion) {
      return false;
    }

    config.rolloutPercentages = config.rolloutPercentages.map((rollout) => ({
      version: rollout.version,
      percentage: rollout.version === lowestPercentageVersion ? 100 : 0
    }));
  }

  config.status = "paused";
  config.updatedAt = new Date();
  await config.save();

  const tenantEmail = await getTenantEmailForConfig(config);
  if (tenantEmail) {
    await sendAlertEmail(
      tenantEmail,
      `ThrottleX rollback triggered for ${config.name}`,
      `Automatic rollback was triggered for config ${config.name}. Failing version: ${failingVersion}. Rollout has been reverted and paused for investigation.`
    );
  }

  return true;
};

const advanceConfig = async (config, canaryVersion, stableVersion, step) => {
  const percentageMap = toVersionMap(config.rolloutPercentages);
  const canaryCurrent = percentageMap.get(canaryVersion) ?? 0;
  const stableCurrent = percentageMap.get(stableVersion) ?? 0;

  if (stableCurrent <= 0) {
    return false;
  }

  previousStableRollouts.set(
    config._id.toString(),
    config.rolloutPercentages.map((rollout) => ({
      version: rollout.version,
      percentage: rollout.percentage
    }))
  );

  const shift = Math.min(step, stableCurrent, 100 - canaryCurrent);
  percentageMap.set(canaryVersion, canaryCurrent + shift);
  percentageMap.set(stableVersion, stableCurrent - shift);

  config.rolloutPercentages = toSortedRollouts(percentageMap);
  config.updatedAt = new Date();

  const canaryPercentage = percentageMap.get(canaryVersion) ?? 0;
  if (canaryPercentage >= 100) {
    config.status = "completed";
  }

  await config.save();

  if (canaryPercentage >= 100) {
    const tenantEmail = await getTenantEmailForConfig(config);
    if (tenantEmail) {
      await sendAlertEmail(
        tenantEmail,
        `ThrottleX rollout completed for ${config.name}`,
        `Canary version ${canaryVersion} reached 100% rollout and config ${config.name} is now marked as completed.`
      );
    }
  }

  return true;
};

const processSingleConfig = async (config, options) => {
  const versionMetrics = await getRecentVersionMetrics(config._id, options.lookbackSeconds);
  if (!versionMetrics.length || !config.rolloutPercentages.length) {
    return;
  }

  const rollbackLimit =
    config.rollbackThreshold * options.errorRateThresholdMultiplier;
  const failing = versionMetrics.find(
    (metric) => metric.averageErrorRate > rollbackLimit
  );

  if (failing) {
    await rollbackConfig(config, failing.version);
    return;
  }

  const sortedRollouts = [...config.rolloutPercentages].sort(
    (a, b) => a.percentage - b.percentage
  );
  const canary = sortedRollouts[0];
  const stable = [...config.rolloutPercentages].sort(
    (a, b) => b.percentage - a.percentage
  )[0];

  if (!canary?.version || !stable?.version || canary.version === stable.version) {
    return;
  }

  const canaryMetric = versionMetrics.find(
    (metric) => metric.version === canary.version
  );

  if (!canaryMetric) {
    return;
  }

  const enoughServersHavePolled = canaryMetric.polledServerCount >= 2;
  const canAdvance =
    enoughServersHavePolled &&
    canaryMetric.averageErrorRate < config.advanceThreshold;

  if (!canAdvance) {
    return;
  }

  await advanceConfig(
    config,
    canary.version,
    stable.version,
    options.rolloutStepPercentage
  );
};

const cleanupStaleServers = async (staleThresholdMinutes) => {
  const staleBefore = new Date(Date.now() - staleThresholdMinutes * 60 * 1000);
  await Server.updateMany(
    {
      lastPoll: { $lt: staleBefore },
      status: "active"
    },
    {
      $set: { status: "inactive" }
    }
  );
};

const runRolloutMonitorIteration = async () => {
  const lookbackSeconds = getNumberEnv("METRICS_LOOKBACK_SECONDS", 60);
  const errorRateThresholdMultiplier = getNumberEnv(
    "ERROR_RATE_THRESHOLD_MULTIPLIER",
    1.5
  );
  const rolloutStepPercentage = getNumberEnv("ROLLOUT_STEP_PERCENTAGE", 20);
  const staleThresholdMinutes = getNumberEnv("SERVER_STALE_THRESHOLD_MINUTES", 5);

  const activeConfigs = await Config.find({ status: "active" });

  for (const config of activeConfigs) {
    try {
      await processSingleConfig(config, {
        lookbackSeconds,
        errorRateThresholdMultiplier,
        rolloutStepPercentage
      });
    } catch (error) {
      console.error(
        `[rollout-monitor] Failed processing config ${config.name}:`,
        error.message
      );
    }
  }

  await cleanupStaleServers(staleThresholdMinutes);
};

export const startRolloutMonitor = () => {
  const schedule = getRolloutCronSchedule();

  cron.schedule(schedule, async () => {
    try {
      await runRolloutMonitorIteration();
    } catch (error) {
      console.error("[rollout-monitor] Iteration failed:", error.message);
    }
  });

  console.log(`[rollout-monitor] Started with schedule: ${schedule}`);
};
