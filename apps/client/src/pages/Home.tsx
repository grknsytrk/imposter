import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
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
    Gamepad2
} from 'lucide-react';
import { motion } from 'framer-motion';

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

export default function Home() {
    const navigate = useNavigate();
    const { connect } = useGameStore();
    const [name, setName] = useState('');
    const [avatarIndex, setAvatarIndex] = useState(0);

    const CurrentAvatarIcon = AVATARS[avatarIndex].icon;
    const nextAvatar = () => setAvatarIndex((prev) => (prev + 1) % AVATARS.length);
    const prevAvatar = () => setAvatarIndex((prev) => (prev - 1 + AVATARS.length) % AVATARS.length);

    const handleConnect = () => {
        if (name.trim()) {
            connect(name.trim(), AVATARS[avatarIndex].id);
            navigate('/lobby');
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.8,
                staggerChildren: 0.2
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 },
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background pattern is handled by global CSS on body */}

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-md w-full z-10 space-y-8"
            >
                <div className="text-center space-y-4">
                    <motion.div
                        variants={itemVariants}
                        className="inline-block"
                    >
                        <div className="w-24 h-24 bg-card border-4 border-black/20 rounded-3xl rotate-3 shadow-xl flex items-center justify-center mb-4 mx-auto relative overflow-hidden">
                            <div className="absolute inset-0 bg-primary/20" />
                            <Gamepad2 className="w-12 h-12 text-card-foreground relative z-10" />
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-1">
                        <h1 className="text-6xl font-heading font-black text-white tracking-widest drop-shadow-[0_4px_0_rgba(0,0,0,0.3)] stroke-black">
                            IMPOSTER
                        </h1>
                        <p className="text-xl text-primary-foreground/80 font-heading tracking-wide uppercase">
                            Party Game of Deception
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    variants={itemVariants}
                    className="premium-card p-8 space-y-8"
                >
                    {/* Avatar Selection */}
                    <div className="space-y-4 text-center">
                        <span className="text-subtle font-black tracking-widest text-muted-foreground/50 text-xs">SELECT CHARACTER</span>
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={prevAvatar}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-primary hover:text-white border-b-4 border-slate-200 hover:border-primary/50 transition-all active:translate-y-1 active:border-b-0"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <motion.div
                                key={avatarIndex}
                                initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="w-28 h-28 bg-blue-50 border-4 border-blue-100 rounded-3xl flex items-center justify-center relative shadow-inner"
                            >
                                <CurrentAvatarIcon className="w-14 h-14 text-primary drop-shadow-lg" />
                            </motion.div>
                            <button
                                onClick={nextAvatar}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-primary hover:text-white border-b-4 border-slate-200 hover:border-primary/50 transition-all active:translate-y-1 active:border-b-0"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                        <p className="font-heading text-2xl font-black text-card-foreground uppercase tracking-wide">{AVATARS[avatarIndex].label}</p>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-3">
                        <label className="text-subtle font-black tracking-widest text-muted-foreground/50 ml-1">YOUR NICKNAME</label>
                        <input
                            type="text"
                            placeholder="PLAYER NAME"
                            className="premium-input w-full text-center font-heading text-xl uppercase tracking-wider text-slate-900 placeholder:text-slate-300"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                        />
                    </div>

                    <Button
                        onClick={handleConnect}
                        disabled={!name.trim()}
                        variant="default" // Default is now the Gold/Primary button
                        size="lg"
                        className="w-full text-lg shadow-xl"
                    >
                        ENTER ARENA
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    );
}
