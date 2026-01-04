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
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';
export type RequestDirection = 'INCOMING' | 'OUTGOING';
/**
 * Public user info - safe to expose to other users
 */
export interface PublicUserDTO {
    userId: string;
    username: string;
    avatarUrl: string | null;
}
/**
 * Accepted friend in friend list
 */
export interface FriendDTO extends PublicUserDTO {
    status: 'accepted';
}
/**
 * Friend with online status (client-side view model)
 */
export interface FriendView extends FriendDTO {
    online: boolean;
}
/**
 * Pending friend request (incoming or outgoing)
 */
export interface FriendRequestDTO {
    requestId: string;
    user: PublicUserDTO;
    direction: RequestDirection;
    status: 'pending';
    createdAt: string;
}
export interface RoomInviteDTO {
    inviteId: string;
    fromUser: PublicUserDTO;
    roomId: string;
    roomName: string;
    createdAt: string;
    expiresAt: string;
}
/**
 * friend_removed event payload
 * Uses friendUserId (not just "friendId") to be explicit
 */
export interface FriendRemovedPayload {
    friendUserId: string;
}
/**
 * friend_error event payload
 */
export interface FriendErrorPayload {
    code: string;
    message?: string;
}
/**
 * Full friend state for initial sync
 */
export interface FriendsStatePayload {
    friends: FriendDTO[];
    pending: FriendRequestDTO[];
    sent: FriendRequestDTO[];
}
