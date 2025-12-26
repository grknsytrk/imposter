/**
 * Command Contract Tests
 * 
 * Tests for centralized command application.
 */

import { describe, it, expect } from 'vitest';
import { applyCommand, applyVoteCommand, Result } from '../apply';
import { COMMAND_META, isCommandAllowedInPhase, isCommandIdempotent } from '../commands';
import { Room, GameState } from '@imposter/shared';

function createMockGameState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'VOTING',
        category: 'Test',
        word: 'test',
        imposterId: 'p2',
        currentTurnIndex: 0,
        turnOrder: ['p1', 'p2', 'p3'],
        turnTimeLeft: 30,
        phaseTimeLeft: 30,
        roundNumber: 1,
        votes: {},
        hints: {},
        gameMode: 'CLASSIC',
        ...overrides
    };
}

function createMockRoom(overrides: Partial<Room> = {}): Room {
    return {
        id: 'test-room',
        name: 'Test Room',
        players: [
            { id: 'p1', name: 'Alice', avatar: 'a', isReady: true },
            { id: 'p2', name: 'Bob', avatar: 'b', isReady: true },
            { id: 'p3', name: 'Charlie', avatar: 'c', isReady: true }
        ],
        maxPlayers: 8,
        ownerId: 'p1',
        status: 'PLAYING',
        gameState: createMockGameState(),
        ...overrides
    };
}

describe('Command Contract', () => {
    describe('CommandMeta', () => {
        it('SUBMIT_VOTE allowed only in VOTING phase', () => {
            expect(isCommandAllowedInPhase('SUBMIT_VOTE', 'VOTING')).toBe(true);
            expect(isCommandAllowedInPhase('SUBMIT_VOTE', 'DISCUSSION')).toBe(false);
            expect(isCommandAllowedInPhase('SUBMIT_VOTE', 'GAME_OVER')).toBe(false);
        });

        it('SUBMIT_VOTE is idempotent', () => {
            expect(isCommandIdempotent('SUBMIT_VOTE')).toBe(true);
        });

        it('START_GAME is NOT idempotent', () => {
            expect(isCommandIdempotent('START_GAME')).toBe(false);
        });
    });

    describe('applyCommand', () => {
        it('rejects command in wrong phase', () => {
            const room = createMockRoom({
                gameState: createMockGameState({ phase: 'DISCUSSION' })
            });

            const result = applyCommand(room, {
                type: 'SUBMIT_VOTE',
                playerId: 'p1',
                targetId: 'p2'
            });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('WRONG_PHASE');
                // State unchanged
                expect(result.state).toEqual(room.gameState);
            }
        });

        it('invalid command does not mutate state', () => {
            const room = createMockRoom({
                gameState: createMockGameState({ phase: 'GAME_OVER' })
            });
            const originalState = { ...room.gameState };

            const result = applyCommand(room, {
                type: 'SUBMIT_VOTE',
                playerId: 'p1',
                targetId: 'p2'
            });

            expect(result.ok).toBe(false);
            expect(result.state).toEqual(originalState);
        });

        it('valid SUBMIT_VOTE updates state', () => {
            const room = createMockRoom();

            const result = applyCommand(room, {
                type: 'SUBMIT_VOTE',
                playerId: 'p1',
                targetId: 'p2'
            });

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.state.votes['p1']).toBe('p2');
            }
        });
    });

    describe('Idempotent', () => {
        it('same vote command twice = byte-level same state', () => {
            const room = createMockRoom();
            const cmd = {
                type: 'SUBMIT_VOTE' as const,
                playerId: 'p1',
                targetId: 'p2'
            };

            const result1 = applyCommand(room, cmd);

            // Apply same command to the new state
            const room2 = {
                ...room,
                gameState: result1.state
            };
            const result2 = applyCommand(room2, cmd);

            // Idempotent: same result
            expect(result1.ok).toBe(true);
            expect(result2.ok).toBe(true);
            expect(result1.state).toEqual(result2.state);
        });
    });

    describe('Replay Determinism', () => {
        it('same command stream = same final state', () => {
            const room = createMockRoom();
            const commands = [
                { type: 'SUBMIT_VOTE' as const, playerId: 'p1', targetId: 'p2' },
                { type: 'SUBMIT_VOTE' as const, playerId: 'p3', targetId: 'p2' }
            ];

            // Run 1
            let state1 = room.gameState!;
            for (const cmd of commands) {
                const result = applyCommand({ ...room, gameState: state1 }, cmd);
                if (result.ok) state1 = result.state;
            }

            // Run 2
            let state2 = room.gameState!;
            for (const cmd of commands) {
                const result = applyCommand({ ...room, gameState: state2 }, cmd);
                if (result.ok) state2 = result.state;
            }

            // Deterministic
            expect(state1).toEqual(state2);
        });
    });
});
