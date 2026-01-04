/**
 * Friend System Types
 *
 * Shared wire contract between client and server.
 *
 * NAMING CONVENTION:
 * - `userId` = person's UUID (from auth)
 * - `requestId` = friendship row UUID (from database)
 *
 * This eliminates the `id` vs `requestId` confusion that caused bugs.
 */
export {};
