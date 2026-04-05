import  crypto from 'crypto';

class HashService {
  /**
   * Convert serverId to a bucket number (0-99)
   * Same serverId always returns same bucket
   */
  static serverToBucket(serverId) {
    const hash = crypto.createHash('md5').update(serverId).digest('hex');
    const numericHash = parseInt(hash.substring(0, 8), 16);
    return numericHash % 100;
  }

  /**
   * Determine which version a server should get based on rollout percentages
   */
  static assignVersion(serverId, rolloutPercentages) {
    const bucket = this.serverToBucket(serverId);
    
    // Sort by percentage descending to ensure consistency
    const sorted = [...rolloutPercentages].sort((a, b) => b.percentage - a.percentage);
    
    let cumulative = 0;
    for (const rollout of sorted) {
      cumulative += rollout.percentage;
      if (bucket < cumulative) {
        return rollout.version;
      }
    }
    
    // Fallback to first version
    return rolloutPercentages[0]?.version || null;
  }

  /**
   * Calculate distribution of versions across servers
   */
  static calculateDistribution(serverCount, rolloutPercentages) {
    const distribution = {};
    
    for (const rollout of rolloutPercentages) {
      distribution[rollout.version] = Math.round(
        (rollout.percentage / 100) * serverCount
      );
    }
    
    return distribution;
  }
}

export default HashService;