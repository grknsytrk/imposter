/**
 * Friend System Socket Events
 *
 * Typed socket events for client-server communication.
 * Uses Socket.IO typed events pattern.
 *
 * @see https://socket.io/docs/v4/typescript/
 */
// ============================================
// ERROR CODES
// ============================================
export const FRIEND_ERROR_CODES = {
    INVALID_USER_ID: 'INVALID_USER_ID',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    ALREADY_FRIENDS: 'ALREADY_FRIENDS',
    REQUEST_NOT_FOUND: 'REQUEST_NOT_FOUND',
    REQUEST_ALREADY_HANDLED: 'REQUEST_ALREADY_HANDLED',
    NOT_AUTHORIZED: 'NOT_AUTHORIZED',
    SELF_REQUEST: 'SELF_REQUEST',
    MAX_FRIENDS_REACHED: 'MAX_FRIENDS_REACHED',
    DATABASE_ERROR: 'DATABASE_ERROR'
};
