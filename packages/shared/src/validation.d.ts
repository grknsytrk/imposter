/**
 * UUID Validation Helper
 *
 * Single source of truth for UUID validation across client and server.
 * Ensures consistent behavior and prevents regex drift.
 */
/**
 * Validates if a string is a valid UUID v4.
 * This is the strictest check - only accepts version 4 UUIDs.
 * Use for userId validation as auth providers typically generate v4.
 */
export declare function isUuidV4(value: unknown): value is string;
/**
 * Validates if a string is a valid RFC 4122 UUID (v1-v5).
 * More permissive than v4-only, but still enforces the standard.
 * Rejects nil UUID (all zeros) and non-standard variants.
 */
export declare function isUuidRfc4122(value: unknown): value is string;
/**
 * Validates if a string matches the generic UUID format (8-4-4-4-12 hex).
 * Most permissive check - only validates structure, not version/variant.
 * Use when you don't care about UUID version but want format validation.
 */
export declare function isUuidFormat(value: unknown): value is string;
/**
 * Primary validation function for user IDs.
 * Uses RFC 4122 validation which covers v1-v5 including v4 from Supabase.
 *
 * @example
 * if (!isValidUserId(userId)) {
 *     return { success: false, error: 'Invalid user ID' };
 * }
 */
export declare function isValidUserId(value: unknown): value is string;
