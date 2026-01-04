/**
 * Friend System Socket Events
 *
 * Typed socket events for client-server communication.
 * Uses Socket.IO typed events pattern.
 *
 * @see https://socket.io/docs/v4/typescript/
 */
import { PublicUserDTO, RoomInviteDTO } from './friend';
export interface FriendServerToClientEvents {
    friends_online_list: (payload: {
        friendIds: string[];
    }) => void;
    friend_online: (payload: {
        friendUserId: string;
    }) => void;
    friend_offline: (payload: {
        friendUserId: string;
    }) => void;
    friend_request_received: (payload: {
        requestId: string;
        from: PublicUserDTO;
    }) => void;
    friend_request_sent: (payload: {
        username: string;
    }) => void;
    friend_request_accepted: (payload: {
        requestId: string;
        friend: PublicUserDTO;
    }) => void;
    friend_request_declined: (payload: {
        requestId: string;
    }) => void;
    friend_request_cancelled: (payload: {
        requestId: string;
    }) => void;
    friend_removed: (payload: {
        friendUserId: string;
    }) => void;
    friend_error: (payload: {
        code: string;
        message?: string;
    }) => void;
    room_invite_received: (payload: RoomInviteDTO) => void;
}
export interface FriendClientToServerEvents {
    send_friend_request: (payload: {
        username: string;
    }) => void;
    accept_friend_request: (payload: {
        requestId: string;
    }) => void;
    decline_friend_request: (payload: {
        requestId: string;
    }) => void;
    cancel_friend_request: (payload: {
        requestId: string;
    }) => void;
    remove_friend: (payload: {
        friendUserId: string;
    }) => void;
    send_room_invite: (payload: {
        friendUserId: string;
    }) => void;
    respond_to_invite: (payload: {
        inviteId: string;
        accept: boolean;
    }) => void;
}
export declare const FRIEND_ERROR_CODES: {
    readonly INVALID_USER_ID: "INVALID_USER_ID";
    readonly USER_NOT_FOUND: "USER_NOT_FOUND";
    readonly ALREADY_FRIENDS: "ALREADY_FRIENDS";
    readonly REQUEST_NOT_FOUND: "REQUEST_NOT_FOUND";
    readonly REQUEST_ALREADY_HANDLED: "REQUEST_ALREADY_HANDLED";
    readonly NOT_AUTHORIZED: "NOT_AUTHORIZED";
    readonly SELF_REQUEST: "SELF_REQUEST";
    readonly MAX_FRIENDS_REACHED: "MAX_FRIENDS_REACHED";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
};
export type FriendErrorCode = typeof FRIEND_ERROR_CODES[keyof typeof FRIEND_ERROR_CODES];
