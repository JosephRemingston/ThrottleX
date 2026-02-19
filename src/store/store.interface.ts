import { ConsumeResult } from "../core/types"

export interface Store {
  consume(key: string): Promise<ConsumeResult>
}
