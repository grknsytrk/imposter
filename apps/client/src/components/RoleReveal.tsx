import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, User, Skull } from 'lucide-react';
import { useGameSound } from '../hooks/useGameSound';

interface RoleRevealProps {
    role: 'IMPOSTER' | 'CITIZEN';
    word?: string; // Only for citizens
    category?: string;
}

export const RoleReveal: React.FC<RoleRevealProps> = ({ role, word, category }) => {
    const [showShhh, setShowShhh] = useState(true);
    const { playTone } = useGameSound();

    useEffect(() => {
        // Play SHHH sound
        playTone('shush');

        // "SHHH" animation for the first 1.5 seconds
        const timer = setTimeout(() => {
            setShowShhh(false);
        }, 2000); // Slightly longer for dramatic effect
        return () => clearTimeout(timer);
    }, []);

    const isImposter = role === 'IMPOSTER';

    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <AnimatePresence mode="wait">
                {showShhh ? (
                    /* ==================== SHHH PHASE ==================== */
                    <motion.div
                        key="shhh"
                        className="absolute inset-0 bg-black flex flex-col items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                        transition={{ duration: 0.5 }}
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: 1,
                                rotate: [0, -5, 5, 0]
                            }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            className="relative"
                        >
                            <h1 className="text-[150px] font-black text-rose-600 tracking-tighter leading-none select-none font-heading relative z-10 animate-pulse">
                                SHHH!
                            </h1>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/20 rounded-full blur-[100px]" />
                        </motion.div>
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-8"
                        >
                            <Fingerprint className="w-24 h-24 text-rose-500/50" />
                        </motion.div>
                    </motion.div>
                ) : (
                    /* ==================== REVEAL PHASE ==================== */
                    <motion.div
                        key="reveal"
                        className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center ${isImposter
                            ? 'bg-slate-900' // Darker for imposter
                            : 'bg-slate-900' // Consistent dark bg
                            }`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Background Effects */}
                        <div className={`absolute inset-0 opacity-20 ${isImposter
                            ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-rose-900 via-slate-950 to-slate-950'
                            : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900 via-slate-950 to-slate-950'
                            }`} />

                        {/* Scanline Effect */}
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-50 pointer-events-none" />


                        <motion.div
                            initial={{ scale: 2, filter: "blur(20px)" }}
                            animate={{ scale: 1, filter: "blur(0px)" }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className="relative z-10"
                        >
                            {/* Role Icon */}
                            <div className="mb-8 flex justify-center">
                                {isImposter ? (
                                    <div className="relative">
                                        <Skull className="w-32 h-32 text-rose-500 relative z-10 drop-shadow-[0_0_30px_rgba(244,63,94,0.6)]" />
                                        <div className="absolute inset-0 bg-rose-500 blur-[50px] opacity-40 animate-pulse" />
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <User className="w-32 h-32 text-emerald-400 relative z-10 drop-shadow-[0_0_30px_rgba(52,211,153,0.6)]" />
                                        <div className="absolute inset-0 bg-emerald-500 blur-[50px] opacity-40 animate-pulse" />
                                    </div>
                                )}
                            </div>

                            {/* Role Title */}
                            <h2 className={`text-sm font-black tracking-[0.5em] uppercase mb-2 ${isImposter ? 'text-rose-400' : 'text-emerald-400'
                                }`}>
                                YOUR ROLE
                            </h2>
                            <h1 className={`text-5xl md:text-7xl font-heading font-black tracking-wider uppercase mb-8 ${isImposter
                                ? 'text-rose-500 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]'
                                : 'text-emerald-400 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]'
                                }`}>
                                {isImposter ? 'IMPOSTER' : 'CITIZEN'}
                            </h1>

                            {/* Divider */}
                            <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                                className={`h-1 w-32 mx-auto mb-8 rounded-full ${isImposter ? 'bg-rose-600' : 'bg-emerald-600'
                                    }`}
                            />

                            {/* Task / Word info */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1 }}
                                className="space-y-4"
                            >
                                {isImposter ? (
                                    <div className="bg-slate-950/50 backdrop-blur-md border border-rose-500/30 p-6 rounded-2xl max-w-md mx-auto">
                                        <p className="text-xl font-bold text-slate-200">
                                            Blend in. Don't get caught.
                                        </p>
                                        <p className="text-sm text-rose-400 mt-2 font-mono uppercase tracking-widest">
                                            KILL GOAL: ELIMINATE ALL CITIZENS
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-950/50 backdrop-blur-md border border-emerald-500/30 p-6 rounded-2xl max-w-md mx-auto">
                                        <p className="text-sm font-bold text-emerald-400/80 uppercase tracking-widest mb-1">
                                            SECRET WORD ({category})
                                        </p>
                                        <p className="text-4xl font-heading font-black text-white tracking-widest text-shadow-lg">
                                            {word}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
