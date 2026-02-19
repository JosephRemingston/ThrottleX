export interface RateLimiterOptions {
  capacity: number
  refillRate: number
}

export interface ConsumeResult {
  allowed: boolean
  remaining: number
  resetTime: number
}
