/**
 * Rate Limiting Middleware
 * 
 * In-memory rate limiter for Socket.IO events.
 * Per-socket and per-userId limits depending on event type.
 */

interface RateBucket {
    count: number;
    resetAt: number;
}

// In-memory storage (consider Redis for horizontal scaling)
const buckets = new Map<string, RateBucket>();

/**
 * Rate limit configuration per event type
 */
export const RATE_LIMITS = {
    join_game: { limit: 3, windowMs: 60_000 },        // 3 per minute per socket
    create_room: { limit: 5, windowMs: 60_000 },      // 5 per minute per userId
    join_room: { limit: 10, windowMs: 60_000 },       // 10 per minute per socket
    submit_vote: { limit: 10, windowMs: 30_000 },     // 10 per 30s per socket
    submit_hint: { limit: 5, windowMs: 30_000 },      // 5 per 30s per socket
    send_message: { limit: 20, windowMs: 60_000 },    // 20 per minute per socket
    send_friend_request: { limit: 10, windowMs: 60_000 }, // 10 per minute per userId
} as const;

export type RateLimitedEvent = keyof typeof RATE_LIMITS;

/**
 * Check if action is within rate limit.
 * Returns true if allowed, false if rate limited.
 */
export function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
): boolean {
    const now = Date.now();
    const bucket = buckets.get(key);

    // No bucket or expired bucket = fresh start
    if (!bucket || bucket.resetAt < now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    // Over limit
    if (bucket.count >= limit) {
        return false;
    }

    // Increment and allow
    bucket.count++;
    return true;
}

/**
 * Check rate limit for a specific event.
 * Uses socketId or userId depending on event type.
 */
export function checkEventRateLimit(
    event: RateLimitedEvent,
    socketId: string,
    userId?: string | null
): boolean {
    const config = RATE_LIMITS[event];

    // Events that should be rate limited per-userId (if available)
    const perUserEvents: RateLimitedEvent[] = ['create_room', 'send_friend_request'];

    const key = perUserEvents.includes(event) && userId
        ? `${event}:user:${userId}`
        : `${event}:socket:${socketId}`;

    return checkRateLimit(key, config.limit, config.windowMs);
}

/**
 * Cleanup stale buckets periodically to prevent memory leaks.
 * Call this on server startup.
 */
export function startRateLimitCleanup(intervalMs: number = 300_000): void {
    setInterval(() => {
        const now = Date.now();
        let cleaned = 0;

        buckets.forEach((bucket, key) => {
            if (bucket.resetAt < now) {
                buckets.delete(key);
                cleaned++;
            }
        });

        if (cleaned > 0) {
            console.log(`[RateLimit] Cleaned ${cleaned} stale buckets`);
        }
    }, intervalMs);
}
