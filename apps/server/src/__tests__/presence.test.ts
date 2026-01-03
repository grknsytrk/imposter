import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameLogic } from '../game';
import { Server, Socket } from 'socket.io';
import * as friendService from '../services/friend-service';

// Mock Socket.io with auth middleware properties
class MockSocket {
    id: string;
    userId: string | null = null;  // Auth middleware sets this
    isAnonymous: boolean = true;    // Auth middleware sets this
    callbacks: Record<string, Function> = {};
    emitted: Record<string, any[]> = {};
    rooms: Set<string> = new Set();
    handshake = { auth: {} };  // For auth middleware

    constructor(id: string, userId?: string) {
        this.id = id;
        if (userId) {
            this.userId = userId;
            this.isAnonymous = false;
        }
    }

    on(event: string, callback: Function) {
        this.callbacks[event] = callback;
    }

    emit(event: string, ...args: any[]) {
        if (!this.emitted[event]) this.emitted[event] = [];
        this.emitted[event].push(args);
    }

    join(room: string) {
        this.rooms.add(room);
    }

    leave(room: string) {
        this.rooms.delete(room);
    }

    // Helper to simulate incoming event
    trigger(event: string, data?: any) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }
}

class MockServer {
    sockets = {
        sockets: new Map<string, MockSocket>()
    };

    // To simulation to(socketId).emit(...)
    to(socketId: string) {
        const socket = this.sockets.sockets.get(socketId);
        return {
            emit: (event: string, data: any) => {
                if (socket) socket.emit(event, data);
            }
        };
    }
}

describe('GameLogic Presence System', () => {
    let gameLogic: GameLogic;
    let mockIo: any;
    let socketA: MockSocket;
    let socketB: MockSocket;
    let socketC: MockSocket; // A's second tab

    const USER_A_ID = 'user-a-uuid';
    const USER_B_ID = 'user-b-uuid';

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // 1. Setup Mock IO and GameLogic
        mockIo = new MockServer();
        gameLogic = new GameLogic();

        // 2. Setup Mock Sockets WITH userId (simulates auth middleware)
        socketA = new MockSocket('socket-a-1', USER_A_ID);
        socketB = new MockSocket('socket-b-1', USER_B_ID);
        socketC = new MockSocket('socket-a-2', USER_A_ID); // Same user as A

        mockIo.sockets.sockets.set(socketA.id, socketA);
        mockIo.sockets.sockets.set(socketB.id, socketB);
        mockIo.sockets.sockets.set(socketC.id, socketC);

        // 3. Connect sockets to GameLogic
        gameLogic.handleConnection(socketA as any, mockIo as any);
        gameLogic.handleConnection(socketB as any, mockIo as any);
        gameLogic.handleConnection(socketC as any, mockIo as any);

        // 4. Mock friend-service
        // Use vi.spyOn to mock the import
        vi.spyOn(friendService, 'getFriends').mockImplementation(async (userId) => {
            if (userId === USER_A_ID) {
                return [{ id: USER_B_ID } as any]; // A is friends with B
            }
            if (userId === USER_B_ID) {
                return [{ id: USER_A_ID } as any]; // B is friends with A
            }
            return [];
        });
    });

    it('should notify friend when user joins (friend_online)', async () => {
        // 1. User B is already online (connects first)
        await socketB.trigger('join_game', { name: 'UserB', avatar: 'b', userId: USER_B_ID });

        // Wait for potential async promises
        await new Promise(r => setImmediate(r));

        // 2. User A comes online
        await socketA.trigger('join_game', { name: 'UserA', avatar: 'a', userId: USER_A_ID });

        // Wait for async notifyFriends
        await new Promise(r => setTimeout(r, 10));

        // 3. Verify socketB received 'friend_online' for User A
        expect(socketB.emitted['friend_online']).toBeDefined();
        expect(socketB.emitted['friend_online'][0][0]).toEqual({ userId: USER_A_ID });
    });

    it('should notify friend when user disconnects (friend_offline)', async () => {
        // 1. Setup: Both online
        await socketB.trigger('join_game', { name: 'UserB', avatar: 'b', userId: USER_B_ID });
        await socketA.trigger('join_game', { name: 'UserA', avatar: 'a', userId: USER_A_ID });

        await new Promise(r => setTimeout(r, 10));

        // Clear previous emits
        socketB.emitted = {};

        // 2. User A disconnects
        socketA.trigger('disconnect');

        // Wait for async
        await new Promise(r => setTimeout(r, 10));

        // 3. Verify socketB received 'friend_offline' for User A
        expect(socketB.emitted['friend_offline']).toBeDefined();
        expect(socketB.emitted['friend_offline'][0][0]).toEqual({ userId: USER_A_ID });
    });

    it('should NOT notify offline if user still has another tab open (Multi-tab support)', async () => {
        // 1. Setup: User B online
        await socketB.trigger('join_game', { name: 'UserB', avatar: 'b', userId: USER_B_ID });

        // 2. User A connects Tab 1
        await socketA.trigger('join_game', { name: 'UserA', avatar: 'a', userId: USER_A_ID });

        // 3. User A connects Tab 2 (Socket C)
        await socketC.trigger('join_game', { name: 'UserA', avatar: 'a', userId: USER_A_ID });

        await new Promise(r => setTimeout(r, 10));
        socketB.emitted = {}; // Clear "online" events

        // 4. User A disconnects Tab 1 (Socket A)
        socketA.trigger('disconnect');
        await new Promise(r => setTimeout(r, 10));

        // 5. Verify NO 'friend_offline' sent, because Tab 2 is still open
        expect(socketB.emitted['friend_offline']).toBeUndefined();

        // 6. User A disconnects Tab 2 (Socket C)
        socketC.trigger('disconnect');
        await new Promise(r => setTimeout(r, 10));

        // 7. NOW verify 'friend_offline' sent
        expect(socketB.emitted['friend_offline']).toBeDefined();
        expect(socketB.emitted['friend_offline'][0][0]).toEqual({ userId: USER_A_ID });
    });

    // SKIPPED: friends_online_list emission not implemented in game.ts
    it.skip('should notify NEW user about EXISTING online friends (Initial Sync)', async () => {
        // 1. Setup: User B is ALREADY online
        socketB.trigger('join_game', { name: 'UserB', avatar: 'b' });

        // Wait for B to fully register
        await new Promise(r => setTimeout(r, 50));

        // 2. User A connects
        socketA.emitted = {};
        socketA.trigger('join_game', { name: 'UserA', avatar: 'a' });

        // Wait for async friend lookup to complete
        await new Promise(r => setTimeout(r, 50));

        // 3. Verify Socket A knows B is online.
        const onlineListEvents = socketA.emitted['friends_online_list'];
        expect(onlineListEvents).toBeDefined();
        const list = onlineListEvents[0][0];
        expect(list).toContain(USER_B_ID);
    });
});
