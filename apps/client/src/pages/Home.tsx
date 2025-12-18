import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { Button } from '../components/ui/button';
import {
    Fingerprint,
    ShieldAlert,
    Eye,
    Radio,
    Activity,
    Database,
    Cpu,
    Scan,
    ChevronLeft,
    ChevronRight,
    Layers,
    Lock
} from 'lucide-react';
import { motion } from 'framer-motion';

const AVATARS = [
    { id: 'eye', icon: Eye, label: 'OBSERVER' },
    { id: 'fingerprint', icon: Fingerprint, label: 'UNKNOWN_UNIT' },
    { id: 'shield', icon: ShieldAlert, label: 'ENFORCER' },
    { id: 'radio', icon: Radio, label: 'SIGNAL_NODE' },
    { id: 'activity', icon: Activity, label: 'PULSE_TRACE' },
    { id: 'database', icon: Database, label: 'ARCHIVE_CORE' },
    { id: 'cpu', icon: Cpu, label: 'SYSTEM_MAIN' },
    { id: 'scan', icon: Scan, label: 'TARGET_ACQ' },
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
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 1,
                staggerChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.98 },
        visible: { opacity: 1, scale: 1 },
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="scanline-overlay" />

            {/* Ambient Atmosphere */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.01)_0%,_transparent_70%)]" />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-xl w-full z-10 space-y-12"
            >
                <div className="text-center space-y-6">
                    <motion.div
                        variants={itemVariants}
                        className="inline-block relative"
                    >
                        <div className="w-24 h-24 border border-white/5 flex items-center justify-center bg-white/[0.02] relative group">
                            <Layers className="w-10 h-10 text-white/20 group-hover:text-white/40 transition-colors" />
                            <div className="absolute -inset-4 border border-white/[0.02] animate-spin-slow pointer-events-none" />
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-2">
                        <h1 className="text-6xl font-heading font-bold tracking-tighter text-white uppercase">
                            Council<span className="text-primary/30">_</span>Internal
                        </h1>
                        <p className="system-label tracking-[0.5em] text-white/40">
                            Protocol 09 // Authorized Personnel Only
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    variants={itemVariants}
                    className="premium-card bg-card/40 backdrop-blur-xl p-12 space-y-10 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Avatar Selection */}
                    <div className="space-y-6 text-center">
                        <span className="system-label">Unit_Designation</span>
                        <div className="flex items-center justify-center gap-10">
                            <button
                                onClick={prevAvatar}
                                className="p-3 border border-white/5 hover:bg-white/5 text-white/20 hover:text-white transition-all"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <motion.div
                                key={avatarIndex}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-20 h-20 border border-white/10 flex items-center justify-center bg-white/[0.03]"
                            >
                                <CurrentAvatarIcon className="w-8 h-8 text-white/80" />
                            </motion.div>
                            <button
                                onClick={nextAvatar}
                                className="p-3 border border-white/5 hover:bg-white/5 text-white/20 hover:text-white transition-all"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">{AVATARS[avatarIndex].label}</p>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-4">
                        <label className="system-label px-1">Identity_String</label>
                        <div className="relative">
                            <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input
                                type="text"
                                placeholder="Input Aliaz..."
                                className="premium-input w-full pl-14 h-16 uppercase tracking-widest text-sm"
                                value={name}
                                onChange={(e) => setName(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleConnect}
                        disabled={!name.trim()}
                        variant="premium"
                        size="lg"
                        className="w-full h-16 shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                    >
                        INITIALIZE_UPLINK
                    </Button>
                </motion.div>

                <div className="flex justify-between items-center opacity-20 pointer-events-none">
                    <div className="flex flex-col gap-1">
                        <span className="system-label text-[8px]">Secure_Shell</span>
                        <span className="font-mono text-[8px]">PASSIVE_STUB / READY</span>
                    </div>
                    <Lock className="w-4 h-4" />
                </div>
            </motion.div>
        </div>
    );
}
