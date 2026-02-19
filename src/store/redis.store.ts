import Redis from "ioredis"
import fs from "fs"
import path from "path"
import { Store } from "./store.interface"
import { ConsumeResult } from "../core/types"

export class RedisStore implements Store {
  private redis: Redis
  private scriptSha!: string

  constructor(
    redisUrl: string,
    private capacity: number,
    private refillRate: number
  ) {
    this.redis = new Redis(redisUrl)
  }

  async init() {
    const script = fs.readFileSync(
      path.join(__dirname, "../lua/tokenBucket.lua"),
      "utf8"
    )
    this.scriptSha = (await this.redis.script("LOAD", script)) as string
  }

  async consume(key: string): Promise<ConsumeResult> {
    const now = Date.now() / 1000

    const result = (await this.redis.evalsha(
      this.scriptSha,
      1,
      key,
      this.capacity,
      this.refillRate,
      now
    )) as [number, number]

    const allowed = result[0] === 1
    const remaining = result[1]

    return {
      allowed,
      remaining,
      resetTime: Date.now()
    }
  }
}
