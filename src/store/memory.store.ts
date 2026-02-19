import { Store } from "./store.interface"
import { ConsumeResult } from "../core/types"

export class MemoryStore implements Store {
  private buckets = new Map<
    string,
    { tokens: number; lastRefill: number }
  >()

  constructor(
    private capacity: number,
    private refillRate: number
  ) {}

  async consume(key: string): Promise<ConsumeResult> {
    const now = Date.now() / 1000
    const bucket = this.buckets.get(key)

    let tokens = bucket?.tokens ?? this.capacity
    let lastRefill = bucket?.lastRefill ?? now

    const delta = now - lastRefill
    const refill = delta * this.refillRate
    tokens = Math.min(this.capacity, tokens + refill)

    let allowed = false
    if (tokens >= 1) {
      tokens -= 1
      allowed = true
    }

    this.buckets.set(key, {
      tokens,
      lastRefill: now
    })

    return {
      allowed,
      remaining: tokens,
      resetTime: Date.now()
    }
  }
}
