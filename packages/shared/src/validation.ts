/**
 * UUID Validation Helper
 * 
 * Single source of truth for UUID validation across client and server.
 * Ensures consistent behavior and prevents regex drift.
 */

// Standard UUID v4 regex (most common from auth providers like Supabase)
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// RFC 4122 compliant regex (v1-v5)
const UUID_RFC4122_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Generic UUID format regex (any 8-4-4-4-12 hex pattern)
const UUID_GENERIC_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v4.
 * This is the strictest check - only accepts version 4 UUIDs.
 * Use for userId validation as auth providers typically generate v4.
 */
export function isUuidV4(value: unknown): value is string {
    return typeof value === 'string' && UUID_V4_REGEX.test(value);
}

/**
 * Validates if a string is a valid RFC 4122 UUID (v1-v5).
 * More permissive than v4-only, but still enforces the standard.
 * Rejects nil UUID (all zeros) and non-standard variants.
 */
export function isUuidRfc4122(value: unknown): value is string {
    return typeof value === 'string' && UUID_RFC4122_REGEX.test(value);
}

/**
 * Validates if a string matches the generic UUID format (8-4-4-4-12 hex).
 * Most permissive check - only validates structure, not version/variant.
 * Use when you don't care about UUID version but want format validation.
 */
export function isUuidFormat(value: unknown): value is string {
    return typeof value === 'string' && UUID_GENERIC_REGEX.test(value);
}

/**
 * Primary validation function for user IDs.
 * Uses RFC 4122 validation which covers v1-v5 including v4 from Supabase.
 * 
 * @example
 * if (!isValidUserId(userId)) {
 *     return { success: false, error: 'Invalid user ID' };
 * }
 */
export function isValidUserId(value: unknown): value is string {
    return isUuidRfc4122(value);
}
