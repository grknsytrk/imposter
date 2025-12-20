export declare const PROJECT_NAME = "Imposter";
export type PlayerRole = 'CITIZEN' | 'IMPOSTER' | null;
export type Player = {
    id: string;
    name: string;
    avatar: string;
    isReady: boolean;
    role?: PlayerRole;
    isEliminated?: boolean;
    hint?: string;
    hasVoted?: boolean;
    userId?: string;
};
export type GamePhase = 'LOBBY' | 'ROLE_REVEAL' | 'HINT_ROUND' | 'DISCUSSION' | 'VOTING' | 'VOTE_RESULT' | 'GAME_OVER';
export type GameStatus = 'LOBBY' | 'PLAYING' | 'ENDED';
export type GameState = {
    phase: GamePhase;
    category: string;
    word: string;
    imposterId: string;
    currentTurnIndex: number;
    turnOrder: string[];
    turnTimeLeft: number;
    phaseTimeLeft: number;
    roundNumber: number;
    votes: Record<string, string>;
    eliminatedPlayerId?: string;
    winner?: 'CITIZENS' | 'IMPOSTER';
    hints: Record<string, string[]>;
};
export type Room = {
    id: string;
    name: string;
    password?: string;
    players: Player[];
    maxPlayers: number;
    ownerId: string;
    status: GameStatus;
    gameState?: GameState;
    selectedCategory?: string;
};
export type ChatMessage = {
    id: string;
    playerId: string;
    playerName: string;
    content: string;
    timestamp: number;
    isSystem?: boolean;
};
export type Category = {
    name: string;
    words: string[] | {
        en: string[];
        tr: string[];
    };
};
export declare const CATEGORIES: Category[];
export declare const GAME_CONFIG: {
    ROLE_REVEAL_TIME: number;
    HINT_TURN_TIME: number;
    HINT_ROUNDS: number;
    DISCUSSION_TIME: number;
    VOTING_TIME: number;
    VOTE_RESULT_TIME: number;
    MIN_PLAYERS: number;
    MAX_PLAYERS: number;
};
