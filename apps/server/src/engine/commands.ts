/**
 * Command Contract Layer
 * 
 * Centralized command definitions with phase/role/idempotent metadata.
 */

import { GamePhase } from '@imposter/shared';

// ==================== COMMAND TYPES ====================

export type CommandType =
    | 'START_GAME'
    | 'SUBMIT_HINT'
    | 'SUBMIT_VOTE'
    | 'PLAY_AGAIN';

// ==================== COMMAND DEFINITIONS ====================

export type GameCommand =
    | { type: 'START_GAME'; roomId: string; playerId: string }
    | { type: 'SUBMIT_HINT'; playerId: string; hint: string }
    | { type: 'SUBMIT_VOTE'; playerId: string; targetId: string }
    | { type: 'PLAY_AGAIN'; roomId: string; playerId: string };

// ==================== COMMAND METADATA ====================

export type RoleRequirement = 'host' | 'alive' | 'current_turn' | 'any';

export type CommandMeta = {
    allowedPhases: GamePhase[];
    allowedRoles: RoleRequirement[];
    idempotent: boolean;
};

export const COMMAND_META: Record<CommandType, CommandMeta> = {
    START_GAME: {
        allowedPhases: ['LOBBY'],
        allowedRoles: ['host'],
        idempotent: false
    },
    SUBMIT_HINT: {
        allowedPhases: ['HINT_ROUND'],
        allowedRoles: ['current_turn'],
        idempotent: false
    },
    SUBMIT_VOTE: {
        allowedPhases: ['VOTING'],
        allowedRoles: ['alive'],
        idempotent: true // same player + same target = same state
    },
    PLAY_AGAIN: {
        allowedPhases: ['GAME_OVER'],
        allowedRoles: ['host'],
        idempotent: false
    }
};

// ==================== COMMAND VALIDATION ====================

export type CommandError =
    | 'WRONG_PHASE'
    | 'NOT_HOST'
    | 'NOT_ALIVE'
    | 'NOT_YOUR_TURN'
    | 'GAME_NOT_STARTED';

/**
 * Check if a command is allowed in the given phase.
 */
export function isCommandAllowedInPhase(
    commandType: CommandType,
    currentPhase: GamePhase
): boolean {
    const meta = COMMAND_META[commandType];
    return meta.allowedPhases.includes(currentPhase);
}

/**
 * Check if a command is idempotent.
 */
export function isCommandIdempotent(commandType: CommandType): boolean {
    return COMMAND_META[commandType].idempotent;
}
