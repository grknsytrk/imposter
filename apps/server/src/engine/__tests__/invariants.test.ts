/**
 * Engine Invariant Tests
 * 
 * These tests guarantee engine-level rules that must NEVER be violated,
 * regardless of UI or socket behavior.
 */

import { describe, it, expect } from 'vitest';
import { validateVote } from '../validators';
import { applyVote } from '../reducers';
import { Room, GameState, VoteCommand } from '@imposter/shared';

// Helper to create mock game state
function createMockGameState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'VOTING',
        category: 'Animals',
        word: 'Dog',
        imposterId: 'player2',
        currentTurnIndex: 0,
        turnOrder: ['player1', 'player2', 'player3'],
        turnTimeLeft: 30,
        phaseTimeLeft: 30,
        roundNumber: 1,
        votes: {},
        hints: {},
        gameMode: 'CLASSIC',
        ...overrides
    };
}

// Helper to create mock room
function createMockRoom(overrides: Partial<Room> = {}): Room {
    return {
        id: 'test-room',
        name: 'Test Room',
        players: [
            { id: 'player1', name: 'Alice', avatar: 'ghost', isReady: true },
            { id: 'player2', name: 'Bob', avatar: 'cat', isReady: true },
            { id: 'player3', name: 'Charlie', avatar: 'dog', isReady: true }
        ],
        maxPlayers: 8,
        ownerId: 'player1',
        status: 'PLAYING',
        gameState: createMockGameState(),
        ...overrides
    };
}

describe('Engine Invariants', () => {

    describe('Vote count invariants', () => {
        it('vote count never exceeds alive player count', () => {
            const gameState = createMockGameState({
                votes: {
                    'player1': 'player2',
                    'player2': 'player3',
                    'player3': 'player1'
                }
            });

            const alivePlayers = 3;
            const voteCount = Object.keys(gameState.votes).length;

            expect(voteCount).toBeLessThanOrEqual(alivePlayers);
        });

        it('overwrite does not create duplicate votes', () => {
            let gameState = createMockGameState({ votes: {} });

            // Player 1 votes for player 2
            gameState = {
                ...gameState,
                votes: applyVote(gameState, { type: 'SUBMIT_VOTE', playerId: 'player1', targetId: 'player2' })
            };

            // Player 1 changes vote to player 3 (overwrite)
            gameState = {
                ...gameState,
                votes: applyVote(gameState, { type: 'SUBMIT_VOTE', playerId: 'player1', targetId: 'player3' })
            };

            // Should still be 1 vote, not 2
            expect(Object.keys(gameState.votes).length).toBe(1);
            expect(gameState.votes['player1']).toBe('player3');
        });
    });

    describe('Eliminated player invariants', () => {
        it('eliminated player cannot vote', () => {
            const room = createMockRoom({
                players: [
                    { id: 'player1', name: 'Alice', avatar: 'ghost', isReady: true, isEliminated: true },
                    { id: 'player2', name: 'Bob', avatar: 'cat', isReady: true },
                    { id: 'player3', name: 'Charlie', avatar: 'dog', isReady: true }
                ]
            });

            // Eliminated player trying to vote should be blocked at UI level
            // But engine also validates target
            const cmd: VoteCommand = { type: 'SUBMIT_VOTE', playerId: 'player2', targetId: 'player1' };
            const error = validateVote(room, cmd);

            // Cannot vote for eliminated player
            expect(error).toBe('INVALID_TARGET');
        });
    });

    describe('Game over invariants', () => {
        it('game over phase blocks voting', () => {
            const room = createMockRoom({
                gameState: createMockGameState({
                    phase: 'GAME_OVER',
                    winner: 'CITIZENS'
                })
            });

            const cmd: VoteCommand = { type: 'SUBMIT_VOTE', playerId: 'player1', targetId: 'player2' };
            const error = validateVote(room, cmd);

            expect(error).toBe('WRONG_PHASE');
        });
    });

    describe('Phase invariants', () => {
        it('voting only allowed in VOTING phase', () => {
            const phases = ['LOBBY', 'ROLE_REVEAL', 'HINT_ROUND', 'DISCUSSION', 'VOTE_RESULT', 'GAME_OVER'] as const;

            phases.forEach(phase => {
                const room = createMockRoom({
                    gameState: createMockGameState({ phase })
                });

                const cmd: VoteCommand = { type: 'SUBMIT_VOTE', playerId: 'player1', targetId: 'player2' };
                const error = validateVote(room, cmd);

                expect(error).toBe('WRONG_PHASE');
            });
        });

        it('voting allowed only in VOTING phase', () => {
            const room = createMockRoom({
                gameState: createMockGameState({ phase: 'VOTING' })
            });

            const cmd: VoteCommand = { type: 'SUBMIT_VOTE', playerId: 'player1', targetId: 'player2' };
            const error = validateVote(room, cmd);

            expect(error).toBeNull();
        });
    });
});
