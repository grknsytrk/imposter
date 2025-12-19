import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
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
    const { profile } = useAuthStore();

    // Profile'dan avatar index'i bul
    const avatarIndex = AVATARS.findIndex(a => a.id === profile?.avatar);
    const CurrentAvatarIcon = AVATARS[avatarIndex >= 0 ? avatarIndex : 0].icon;
    const currentLabel = AVATARS[avatarIndex >= 0 ? avatarIndex : 0].label;

    const handleConnect = () => {
        if (profile) {
            connect(profile.username, profile.avatar);
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
                    {/* Profile Display */}
                    <div className="space-y-4 text-center">
                        <span className="text-subtle font-black tracking-widest text-muted-foreground/50 text-xs">WELCOME BACK</span>
                        <div className="flex flex-col items-center gap-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="w-28 h-28 bg-muted border-4 border-border rounded-3xl flex items-center justify-center relative shadow-inner"
                            >
                                <CurrentAvatarIcon className="w-14 h-14 text-primary drop-shadow-lg" />
                            </motion.div>
                            <div className="space-y-1">
                                <p className="font-heading text-3xl font-black text-card-foreground uppercase tracking-wide">
                                    {profile?.username}
                                </p>
                                <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">
                                    {currentLabel}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleConnect}
                        variant="default"
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
