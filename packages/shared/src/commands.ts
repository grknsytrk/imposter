// Vote Command Types for Game Engine Core

import { Room, GameState } from './index';

// ==================== VOTE COMMAND ====================
export type VoteCommand = {
    type: 'SUBMIT_VOTE';
    playerId: string;
    targetId: string;
};

// ==================== VOTE RESULT ====================
export type VoteResult =
    | { success: true; nextVotes: Record<string, string> }
    | { success: false; error: VoteError };

// ==================== VOTE ERRORS ====================
export type VoteError =
    | 'ALREADY_VOTED'
    | 'CANNOT_VOTE_SELF'
    | 'INVALID_TARGET'
    | 'WRONG_PHASE'
    | 'GAME_NOT_STARTED';

// Re-export for convenience
export type { Room, GameState };
