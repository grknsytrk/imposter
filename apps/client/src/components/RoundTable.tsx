
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '@imposter/shared';
import {
    Ghost,
    Check,
    Skull
} from 'lucide-react';

export interface RoundTableProps {
    players: Player[];
    currentPlayerId?: string;
    phase: 'LOBBY' | 'DISCUSSION' | 'VOTING' | 'VOTE_RESULT' | 'GAME_OVER' | 'HINT_ROUND';
    centerContent?: React.ReactNode;
    turnPlayerId?: string;
    onVote?: (playerId: string) => void;
    votes?: Record<string, string>; // voterId -> votedPlayerId
    hints?: Record<string, string>;
    eliminatedPlayerId?: string;
    className?: string;
    avatars: { id: string; icon: any; label: string }[];
}

export const RoundTable: React.FC<RoundTableProps> = ({
    players,
    currentPlayerId,
    phase,
    centerContent,
    turnPlayerId,
    onVote,
    votes = {},
    hints = {},
    eliminatedPlayerId,
    className = '',
    avatars
}) => {
    const activePlayers = players;
    const radius = 260;

    // Calculate positions
    const playerPositions = useMemo(() => {
        const total = activePlayers.length;
        return activePlayers.map((player, index) => {
            // Start from top ( -90 degrees)
            const angleDeg = (360 / total) * index - 90;
            const angleRad = (angleDeg * Math.PI) / 180;

            return {
                ...player,
                x: Math.cos(angleRad) * radius,
                y: Math.sin(angleRad) * radius,
                angle: angleDeg
            };
        });
    }, [activePlayers, radius]);

    return (
        <div className={`relative flex items-center justify-center w-full h-[600px] sm:h-[700px] ${className} overflow-visible`}>
            {/* Central Table Area */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[180px] h-[180px] sm:w-[280px] sm:h-[280px] rounded-full bg-card/50 border-4 border-border shadow-xl flex items-center justify-center backdrop-blur-sm z-10 pointer-events-auto">
                    {centerContent}
                </div>
            </div>

            {/* Players */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Translate 0,0 to center of container */}
                <div className="absolute top-1/2 left-1/2 w-0 h-0">
                    <AnimatePresence>
                        {playerPositions.map((p) => {
                            const AvatarObj = avatars.find(a => a.id === p.avatar);
                            const AvatarIcon = AvatarObj?.icon || Ghost;
                            const isMe = p.id === currentPlayerId;
                            const hasVoted = !!votes[p.id];
                            const isVotedByMe = votes[currentPlayerId || ''] === p.id;
                            const voteCount = Object.values(votes).filter(v => v === p.id).length;
                            const isEliminated = p.isEliminated || p.id === eliminatedPlayerId;
                            const isTurn = p.id === turnPlayerId;

                            // Interaction allowed?
                            const canVote = phase === 'VOTING' && !p.isEliminated && !votes[currentPlayerId || ''] && p.id !== currentPlayerId;

                            return (
                                <motion.div
                                    key={p.id}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{
                                        opacity: 1,
                                        scale: isTurn ? 1.1 : 1, // Highlight turn
                                        x: p.x,
                                        y: p.y,
                                        zIndex: hints[p.id] ? 100 : (isMe ? 50 : (isTurn ? 40 : 20))
                                    }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                >
                                    <div className="relative group">
                                        {/* Player Card */}
                                        <button
                                            disabled={!canVote}
                                            onClick={() => canVote && onVote?.(p.id)}
                                            className={`
                        relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300
                        ${isMe ? 'z-30' : 'z-20'}
                        ${canVote ? 'cursor-pointer hover:scale-110 hover:-translate-y-2' : ''}
                        ${isVotedByMe ? 'ring-4 ring-rose-500 bg-rose-50 shadow-lg shadow-rose-200' : ''}
                        ${isEliminated ? 'opacity-50 grayscale' : ''}
                        ${isTurn ? 'ring-4 ring-amber-400 bg-amber-50 shadow-xl shadow-amber-200 scale-105' : ''}
                      `}
                                        >
                                            {/* Avatar Bubble */}
                                            <div
                                                className={`
                          w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-md transition-colors duration-300
                          ${isVotedByMe ? 'bg-rose-100' : 'bg-card border-2 border-border'}
                          ${canVote ? 'group-hover:border-rose-400 group-hover:bg-rose-50' : ''}
                          ${isTurn ? 'bg-amber-100 border-amber-300' : ''}
                        `}
                                            >
                                                <AvatarIcon
                                                    className={`
                            w-8 h-8 sm:w-10 sm:h-10 transition-colors
                            ${isVotedByMe ? 'text-rose-500' : 'text-muted-foreground'}
                            ${canVote ? 'group-hover:text-rose-500' : ''}
                            ${isTurn ? 'text-amber-600' : ''}
                          `}
                                                />

                                                {/* Dead Indicator */}
                                                {isEliminated && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-2xl backdrop-blur-[1px]">
                                                        <Skull className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-md" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Name Plate */}
                                            <div className={`
                        px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm border whitespace-nowrap
                        ${isMe
                                                    ? 'bg-primary text-primary-foreground border-yellow-600'
                                                    : 'bg-card text-card-foreground border-border'}
                      `}>
                                                {p.name}
                                                {isMe && " (YOU)"}
                                            </div>

                                            {/* Voted Badge (Voting Phase) */}
                                            {phase === 'VOTING' && hasVoted && !isEliminated && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                                    className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm z-30"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </motion.div>
                                            )}

                                            {/* Vote Count (Result Phase) */}
                                            {phase === 'VOTE_RESULT' && voteCount > 0 && (
                                                <div className="absolute -top-4 -right-2 bg-rose-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full shadow-lg border-2 border-white z-40">
                                                    {voteCount} Votes
                                                </div>
                                            )}

                                            {/* Discussion Bubble */}
                                            {hints[p.id] && (phase === 'DISCUSSION' || phase === 'HINT_ROUND' || phase === 'VOTING') && (
                                                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-max max-w-[200px] bg-popover p-4 rounded-2xl rounded-bl-none shadow-xl border-4 border-border text-popover-foreground z-[100] flex flex-col items-start whitespace-normal break-words">
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-70">Hint</span>
                                                    <p className="font-heading text-base font-black uppercase leading-tight tracking-wide text-card-foreground">
                                                        {hints[p.id]}
                                                    </p>
                                                </div>
                                            )}

                                        </button>

                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
