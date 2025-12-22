import { Room, GameState } from './index';
export type VoteCommand = {
    type: 'SUBMIT_VOTE';
    playerId: string;
    targetId: string;
};
export type VoteResult = {
    success: true;
    nextVotes: Record<string, string>;
} | {
    success: false;
    error: VoteError;
};
export type VoteError = 'ALREADY_VOTED' | 'CANNOT_VOTE_SELF' | 'INVALID_TARGET' | 'WRONG_PHASE' | 'GAME_NOT_STARTED';
export type { Room, GameState };
