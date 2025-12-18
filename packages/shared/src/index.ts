export const PROJECT_NAME = "Imposter";

export type Player = {
    id: string;
    name: string;
    avatar: string;
    isReady: boolean;
};

export type GameStatus = 'LOBBY' | 'PLAYING' | 'ENDED';

export type Room = {
    id: string;
    name: string;
    password?: string; // Optional, empty means public
    players: Player[];
    maxPlayers: number;
    ownerId: string;
    status: GameStatus;
};

export type ChatMessage = {
    id: string;
    playerId: string;
    playerName: string;
    content: string;
    timestamp: number;
    isSystem?: boolean;
};
