import { Store } from "../store/store.interface"
import { ConsumeResult } from "./types"

export class RateLimiter {
  constructor(private store: Store) {}

  async consume(key: string): Promise<ConsumeResult> {
    return this.store.consume(key)
  }
}
