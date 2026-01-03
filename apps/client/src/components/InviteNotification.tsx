import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { useFriendStore, RoomInvite } from '../store/useFriendStore';
import { useGameStore } from '../store/useGameStore';

export function InviteNotification() {
    const { pendingInvites, removeRoomInvite } = useFriendStore();
    const { socket, room } = useGameStore();

    const handleAccept = (invite: RoomInvite) => {
        const inviteId = invite.inviteId || invite.id;

        // If already in a different room, we should show a confirmation
        // For now, just accept and let the server handle it
        socket?.emit('accept_room_invite', { inviteId });
        removeRoomInvite(inviteId);
    };

    const handleDecline = (invite: RoomInvite) => {
        const inviteId = invite.inviteId || invite.id;
        socket?.emit('decline_room_invite', { inviteId });
        removeRoomInvite(inviteId);
    };

    // Only show if not already in the invited room
    const visibleInvites = pendingInvites.filter(invite =>
        !room || room.id !== invite.roomId
    );

    return (
        <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {visibleInvites.map((invite) => (
                    <motion.div
                        key={invite.inviteId || invite.id}
                        initial={{ opacity: 0, x: 100, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 100, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-card border-2 border-primary rounded-2xl shadow-2xl p-4 w-80 pointer-events-auto"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-black uppercase text-primary tracking-wider mb-1">
                                    Room Invite
                                </div>
                                <div className="font-bold text-card-foreground truncate">
                                    {invite.fromUsername}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                    invites you to <span className="font-bold text-card-foreground">{invite.roomName}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDecline(invite)}
                                className="p-1 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDecline(invite)}
                                className="flex-1 h-9"
                            >
                                Decline
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleAccept(invite)}
                                className="flex-1 h-9"
                            >
                                <Check className="w-4 h-4 mr-1" />
                                Join
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
