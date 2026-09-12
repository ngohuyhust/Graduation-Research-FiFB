import { CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import { Observable, of, tap } from "rxjs";
const { getRedisClient } = require("../redis/client");

const CACHE_KEY = "responseCache";
type CacheOptions = { ttl: number; prefix: string };
export const ResponseCache = (ttl: number, prefix: string) => SetMetadata(CACHE_KEY, { ttl, prefix });

@Injectable()
export class ResponseCacheInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const options = this.reflector.get<CacheOptions>(CACHE_KEY, context.getHandler());
    if (!options) return next.handle();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const key = `${options.prefix}:${request.originalUrl}`;
    let redis;
    try {
      redis = await getRedisClient();
      if (!redis) return next.handle();
      const cached = await redis.get(key);
      if (cached) {
        const body = typeof cached === "string" ? JSON.parse(cached) : cached;
        response.setHeader("X-Cache", "HIT");
        return of(body);
      }
    } catch {
      return next.handle();
    }
    return next.handle().pipe(
      tap((body) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          response.setHeader("X-Cache", "MISS");
          // Cache failures must not change the HTTP result.
          void Promise.resolve()
            .then(() => redis.set(key, JSON.stringify(body), { EX: options.ttl }))
            .catch(() => {});
        }
      }),
    );
  }
}
