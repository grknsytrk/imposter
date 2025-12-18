import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { Button } from '../components/ui/button';
import {
    Fingerprint,
    Ghost,
    Cat,
    Skull,
    Crown,
    Zap,
    Dog,
    Rocket,
    Gamepad2,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const AVATARS = [
    { id: 'ghost', icon: Ghost, label: 'The Phantom' },
    { id: 'cat', icon: Cat, label: 'Night Prowler' },
    { id: 'skull', icon: Skull, label: 'Bone Collector' },
    { id: 'crown', icon: Crown, label: 'Apex Ruler' },
    { id: 'zap', icon: Zap, label: 'Storm Bringer' },
    { id: 'dog', icon: Dog, label: 'Loyal Guardian' },
    { id: 'rocket', icon: Rocket, label: 'Void Explorer' },
    { id: 'gamepad', icon: Gamepad2, label: 'System Glitch' },
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
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1] as const,
                staggerChildren: 0.15,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
            {/* Background Grid */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(138,43,226,0.08),_transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_rgba(219,112,147,0.08),_transparent_50%)]" />
                <div className="absolute inset-0 opacity-[0.02]" style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                }} />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-md w-full z-10"
            >
                <div className="text-center mb-10">
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="inline-flex items-center justify-center mb-8"
                    >
                        <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                            <rect x="20" y="20" width="60" height="60" rx="16" transform="rotate(45 50 50)" className="fill-primary/20 stroke-primary" strokeWidth="2" />
                            <rect x="35" y="35" width="30" height="30" rx="8" transform="rotate(45 50 50)" className="fill-white" />
                            <path d="M50 38L56 50H44L50 38Z" fill="var(--primary)" />
                            <circle cx="50" cy="58" r="4" fill="var(--primary)" />
                        </svg>
                    </motion.div>

                    <h1 className="text-6xl font-black tracking-tight title-gradient mb-4">
                        IMPOSTER
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-[0.2em] text-xs uppercase opacity-70">
                        FIND THE IMPOSTER. STAY ALIVE.
                    </p>
                </div>

                <motion.div
                    variants={itemVariants}
                    className="glass-card p-10 rounded-[3rem] space-y-8"
                >
                    {/* Avatar Selection */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-6">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={prevAvatar}
                                className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </motion.button>
                            <motion.div
                                key={avatarIndex}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white shadow-2xl shadow-primary/30"
                            >
                                <CurrentAvatarIcon className="w-12 h-12" />
                            </motion.div>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={nextAvatar}
                                className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </motion.button>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{AVATARS[avatarIndex].label}</span>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-3">
                        <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold px-4">
                            Your Name
                        </label>
                        <div className="relative">
                            <Fingerprint className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                            <input
                                type="text"
                                placeholder="Enter your name..."
                                className="flex h-16 w-full rounded-[2rem] border border-white/10 bg-black/20 px-14 py-2 text-base font-bold placeholder:text-white/20 text-white focus-visible:outline-none focus:border-primary/50 focus:bg-black/40 transition-all shadow-inner"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleConnect}
                        disabled={!name.trim()}
                        size="lg"
                        className="w-full h-16 rounded-[2rem] text-lg font-black tracking-wider bouncy-hover bg-gradient-to-r from-primary to-rose-500 text-white shadow-lg shadow-primary/20 border-none hover:shadow-primary/40 hover:scale-105 mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <span className="flex items-center gap-3">
                            PLAY <Zap className="w-5 h-5 fill-current" />
                        </span>
                    </Button>
                </motion.div>

                <p className="text-center mt-10 text-[10px] text-muted-foreground/60 font-bold uppercase tracking-[0.2em]">
                    Can you find the imposter?
                </p>
            </motion.div>
        </div>
    );
}
