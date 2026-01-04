import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, UserPlus, X, Check, XCircle, Send,
    Circle, UserMinus, MessageCircle, Clock
} from 'lucide-react';
import { Button } from './ui/button';
import { useFriendStore } from '../store/useFriendStore';
import { useGameStore } from '../store/useGameStore';
import { FriendView } from '@imposter/shared';

interface FriendListProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string;
}

export function FriendList({ isOpen, onClose, userId }: FriendListProps) {
    const [tab, setTab] = useState<'friends' | 'requests' | 'sent'>('friends');
    const [addUsername, setAddUsername] = useState('');
    const [isAddingFriend, setIsAddingFriend] = useState(false);

    const {
        friends,
        pendingRequests,
        sentRequests,
        loading,
        fetchFriends,
        sendFriendRequest,
        acceptRequest,
        declineRequest,
        removeFriend,
        cancelRequest,
        inviteToRoom
    } = useFriendStore();

    const { socket, room } = useGameStore();

    // Fetch friends when modal opens - useEffect is more reliable than onAnimationComplete
    useEffect(() => {
        if (isOpen && userId) {
            fetchFriends(userId);
        }
        // Cleanup: reset loading state when modal closes (defensive coding)
        return () => {
            useFriendStore.setState({ loading: false });
        };
    }, [isOpen, userId, fetchFriends]);

    const handleAddFriend = () => {
        if (addUsername.trim() && socket) {
            sendFriendRequest(socket, addUsername.trim());
            setAddUsername('');
            setIsAddingFriend(false);
        }
    };

    const acceptedFriends = friends.filter(f => f.status === 'accepted');
    const onlineFriends = acceptedFriends.filter(f => f.online);
    const offlineFriends = acceptedFriends.filter(f => !f.online);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="premium-card bg-card p-6 w-full max-w-md max-h-[80vh] shadow-2xl relative flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                                <h2 className="text-xl font-heading font-black text-card-foreground uppercase">
                                    Friends
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setTab('friends')}
                                className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm uppercase transition-all ${tab === 'friends'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                            >
                                Friends ({acceptedFriends.length})
                            </button>
                            <button
                                onClick={() => setTab('requests')}
                                className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm uppercase transition-all relative ${tab === 'requests'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                            >
                                Requests
                                {pendingRequests.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs font-black rounded-full flex items-center justify-center">
                                        {pendingRequests.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setTab('sent')}
                                className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm uppercase transition-all relative ${tab === 'sent'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                            >
                                Sent
                                {sentRequests.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs font-black rounded-full flex items-center justify-center">
                                        {sentRequests.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 pr-1 p-2">
                            {loading ? (
                                <div className="flex items-center justify-center py-8 text-muted-foreground">
                                    Loading...
                                </div>
                            ) : tab === 'friends' ? (
                                <>
                                    {/* Add Friend Button */}
                                    {!isAddingFriend ? (
                                        <motion.button
                                            whileHover={{ scale: 1.02, y: -4 }}
                                            whileTap={{ scale: 0.98, y: 0 }}
                                            onClick={() => {
                                                setIsAddingFriend(true);
                                            }}
                                            className="group relative z-20 w-full h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl border-b-6 border-yellow-700 active:border-b-0 transition-all shadow-lg flex flex-col items-center justify-center overflow-hidden mb-2"
                                        >
                                            {/* Shine effect like Host Game button */}
                                            <div className="absolute inset-0 bg-white/30 skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />

                                            <div className="flex items-center gap-2 relative z-10">
                                                <UserPlus className="w-5 h-5 text-yellow-900" />
                                                <span className="font-heading font-black text-yellow-900 text-base uppercase tracking-wider">
                                                    Add Friend
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-black text-yellow-900/60 uppercase tracking-widest relative z-10">
                                                Connect with scouts
                                            </span>
                                        </motion.button>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 bg-muted/50 backdrop-blur-md rounded-2xl border-2 border-yellow-500/30 flex gap-2 shadow-xl"
                                        >
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    value={addUsername}
                                                    onChange={e => setAddUsername(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
                                                    placeholder="ENTER USERNAME..."
                                                    className="w-full bg-card border-2 border-border rounded-xl px-4 py-2 text-sm font-bold focus:border-yellow-500 focus:outline-none transition-all placeholder:text-muted-foreground/50 uppercase"
                                                    autoFocus
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={handleAddFriend}
                                                disabled={!addUsername.trim()}
                                                className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 rounded-xl px-4 shadow-lg shadow-yellow-500/20"
                                            >
                                                <Send className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setIsAddingFriend(false)}
                                                className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-xl"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </motion.div>
                                    )}

                                    {/* Online Friends */}
                                    {onlineFriends.length > 0 && (
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase text-muted-foreground mb-2 px-1">
                                                Online — {onlineFriends.length}
                                            </h3>
                                            {onlineFriends.map(friend => (
                                                <FriendRow
                                                    key={friend.userId}
                                                    friend={friend}
                                                    inRoom={!!room}
                                                    onInvite={() => inviteToRoom(socket, friend.userId)}
                                                    onRemove={() => removeFriend(socket, friend.userId)}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Offline Friends */}
                                    {offlineFriends.length > 0 && (
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase text-muted-foreground mb-2 px-1">
                                                Offline — {offlineFriends.length}
                                            </h3>
                                            {offlineFriends.map(friend => (
                                                <FriendRow
                                                    key={friend.userId}
                                                    friend={friend}
                                                    inRoom={!!room}
                                                    onRemove={() => removeFriend(socket, friend.userId)}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {acceptedFriends.length === 0 && !isAddingFriend && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm font-bold">No friends yet</p>
                                            <p className="text-xs">Add friends to invite them to games!</p>
                                        </div>
                                    )}
                                </>
                            ) : tab === 'sent' ? (
                                <>
                                    {sentRequests.length > 0 ? (
                                        sentRequests.map(request => (
                                            <div
                                                key={request.requestId}
                                                className="p-3 bg-muted rounded-xl flex items-center gap-3"
                                            >
                                                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                                    <Clock className="w-5 h-5 text-amber-500" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-card-foreground">
                                                        {request.user.username}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Request pending
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => cancelRequest(socket, request.requestId)}
                                                    className="h-8 text-muted-foreground hover:text-destructive"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Send className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm font-bold">No sent requests</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {pendingRequests.length > 0 ? (
                                        pendingRequests.map(request => (
                                            <div
                                                key={request.requestId}
                                                className="p-3 bg-muted rounded-xl flex items-center gap-3"
                                            >
                                                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                                                    <UserPlus className="w-5 h-5 text-primary" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-card-foreground">
                                                        {request.user.username}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        wants to be friends
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => acceptRequest(socket, request.requestId)}
                                                    className="h-8"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => declineRequest(socket, request.requestId)}
                                                    className="h-8 text-muted-foreground hover:text-destructive"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm font-bold">No pending requests</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Friend row component
function FriendRow({
    friend,
    inRoom,
    onInvite,
    onRemove
}: {
    friend: FriendView;
    inRoom: boolean;
    onInvite?: () => void;
    onRemove: () => void;
}) {
    const avatar = friend.avatarUrl ?? 'ghost';
    return (
        <div className="p-3 bg-muted/50 hover:bg-muted rounded-xl flex items-center gap-3 transition-colors group">
            <div className="relative">
                <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center border border-border">
                    <span className="text-lg">{avatar === 'ghost' ? '👻' : '😀'}</span>
                </div>
                <Circle
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${friend.online ? 'text-emerald-500 fill-emerald-500' : 'text-muted-foreground fill-muted'
                        }`}
                />
            </div>
            <div className="flex-1">
                <div className="font-bold text-card-foreground text-sm">{friend.username}</div>
                <div className="text-[10px] text-muted-foreground uppercase">
                    {friend.online ? 'Online' : 'Offline'}
                </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {inRoom && friend.online && onInvite && (
                    <button
                        onClick={onInvite}
                        className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                        title="Invite to room"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={onRemove}
                    className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-all"
                    title="Remove friend"
                >
                    <UserMinus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
