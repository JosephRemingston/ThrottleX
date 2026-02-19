import { RateLimiter } from "../core/limiter"
import { Request, Response, NextFunction } from "express"

export function expressMiddleware(limiter: RateLimiter) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.ip || "unknown"

      const result = await limiter.consume(key)

      res.setHeader("X-RateLimit-Remaining", result.remaining)

      if (!result.allowed) {
        return res.status(429).json({
          message: "Too many requests"
        })
      }

      next()
    } catch (err) {
      next(err)
    }
  }
}
