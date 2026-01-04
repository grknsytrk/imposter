/**
 * Friend System Socket Events
 * 
 * Typed socket events for client-server communication.
 * Uses Socket.IO typed events pattern.
 * 
 * @see https://socket.io/docs/v4/typescript/
 */

import {
    PublicUserDTO,
    RoomInviteDTO
} from './friend';

// ============================================
// SERVER → CLIENT EVENTS
// ============================================

export interface FriendServerToClientEvents {
    // Friend state sync
    friends_online_list: (payload: { friendIds: string[] }) => void;
    friend_online: (payload: { friendUserId: string }) => void;
    friend_offline: (payload: { friendUserId: string }) => void;

    // Friend request events
    friend_request_received: (payload: {
        requestId: string;
        from: PublicUserDTO;
    }) => void;
    friend_request_sent: (payload: { username: string }) => void;
    friend_request_accepted: (payload: {
        requestId: string;
        friend: PublicUserDTO;
    }) => void;
    friend_request_declined: (payload: { requestId: string }) => void;
    friend_request_cancelled: (payload: { requestId: string }) => void;

    // Friend removal
    friend_removed: (payload: { friendUserId: string }) => void;

    // Errors
    friend_error: (payload: { code: string; message?: string }) => void;

    // Room invites
    room_invite_received: (payload: RoomInviteDTO) => void;
}

// ============================================
// CLIENT → SERVER EVENTS
// ============================================

export interface FriendClientToServerEvents {
    // Friend requests
    send_friend_request: (payload: { username: string }) => void;
    accept_friend_request: (payload: { requestId: string }) => void;
    decline_friend_request: (payload: { requestId: string }) => void;
    cancel_friend_request: (payload: { requestId: string }) => void;

    // Friend management
    remove_friend: (payload: { friendUserId: string }) => void;

    // Room invites
    send_room_invite: (payload: { friendUserId: string }) => void;
    respond_to_invite: (payload: {
        inviteId: string;
        accept: boolean
    }) => void;
}

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
} as const;

export type FriendErrorCode = typeof FRIEND_ERROR_CODES[keyof typeof FRIEND_ERROR_CODES];
