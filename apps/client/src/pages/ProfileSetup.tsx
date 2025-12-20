import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/button';
import {
    Ghost,
    Cat,
    Dog,
    Zap,
    Star,
    Heart,
    Music,
    Smile,
    ChevronLeft,
    ChevronRight,
    User,
    AlertCircle,
    CheckCircle,
    Loader2
} from 'lucide-react';

const AVATARS = [
    { id: 'ghost', icon: Ghost, label: 'The Ghost' },
    { id: 'cat', icon: Cat, label: 'The Cat' },
    { id: 'dog', icon: Dog, label: 'The Dog' },
    { id: 'star', icon: Star, label: 'The Star' },
    { id: 'zap', icon: Zap, label: 'The Spark' },
    { id: 'heart', icon: Heart, label: 'The Heart' },
    { id: 'music', icon: Music, label: 'The Vibe' },
    { id: 'smile', icon: Smile, label: 'The Friend' },
];

export function ProfileSetup() {
    const { user, createProfile, checkUsernameAvailable } = useAuthStore();
    const [username, setUsername] = useState('');
    const [avatarIndex, setAvatarIndex] = useState(0);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

    const CurrentAvatarIcon = AVATARS[avatarIndex].icon;
    const nextAvatar = () => setAvatarIndex((prev) => (prev + 1) % AVATARS.length);
    const prevAvatar = () => setAvatarIndex((prev) => (prev - 1 + AVATARS.length) % AVATARS.length);

    // Google'dan gelen ismi öner
    useEffect(() => {
        if (user?.user_metadata?.full_name) {
            setUsername(user.user_metadata.full_name);
        } else if (user?.user_metadata?.name) {
            setUsername(user.user_metadata.name);
        }
    }, [user]);

    // Username değiştiğinde kontrol et
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (username.trim().length >= 3) {
                setChecking(true);
                const available = await checkUsernameAvailable(username);
                setIsAvailable(available);
                setChecking(false);
            } else {
                setIsAvailable(null);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [username, checkUsernameAvailable]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (username.trim().length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        if (!isAvailable) {
            setError('This username is already taken');
            return;
        }

        setLoading(true);
        const { error } = await createProfile(username, AVATARS[avatarIndex].id);
        setLoading(false);

        if (error) {
            setError(error.message || 'Failed to create profile');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                className="w-full max-w-md"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-heading font-black text-white tracking-wide drop-shadow-lg">
                        CREATE PROFILE
                    </h1>
                    <p className="text-white/70 mt-2 font-bold uppercase tracking-widest text-sm">
                        Choose your identity
                    </p>
                </div>

                {/* Profile Card */}
                <div className="premium-card p-8">
                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 p-3 rounded-xl mb-6 text-sm font-bold bg-rose-100 text-rose-700 border-2 border-rose-200"
                        >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </motion.div>
                    )}

                    {/* Avatar Selector */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <button
                            onClick={prevAvatar}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-primary hover:text-white border-b-4 border-border hover:border-primary/50 transition-all active:translate-y-1 active:border-b-0"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>

                        <motion.div
                            key={avatarIndex}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-32 h-32 bg-muted rounded-3xl flex flex-col items-center justify-center border-4 border-border shadow-lg"
                        >
                            <CurrentAvatarIcon className="w-16 h-16 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2">
                                {AVATARS[avatarIndex].label}
                            </span>
                        </motion.div>

                        <button
                            onClick={nextAvatar}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-primary hover:text-white border-b-4 border-border hover:border-primary/50 transition-all active:translate-y-1 active:border-b-0"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Username Input */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Choose a username..."
                                className="premium-input w-full h-14 text-card-foreground"
                                style={{ paddingLeft: '48px', paddingRight: '48px' }}
                                minLength={3}
                                maxLength={20}
                            />
                            {/* Availability indicator */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                {checking && <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />}
                                {!checking && isAvailable === true && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                {!checking && isAvailable === false && <AlertCircle className="w-5 h-5 text-rose-500" />}
                            </div>
                        </div>

                        {/* Availability text */}
                        {username.trim().length >= 3 && !checking && (
                            <p className={`text-xs font-bold ${isAvailable ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isAvailable ? '✓ Username is available!' : '✗ Username is already taken'}
                            </p>
                        )}

                        <Button
                            type="submit"
                            disabled={loading || !isAvailable || username.trim().length < 3}
                            className="w-full h-14 text-lg font-heading font-black uppercase tracking-wider"
                        >
                            {loading ? 'Creating...' : 'CREATE PROFILE'}
                        </Button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
