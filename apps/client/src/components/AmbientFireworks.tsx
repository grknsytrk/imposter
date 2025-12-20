import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Firework {
    id: number;
    x: number;
    y: number;
    color: string;
    scale: number;
}

const COLORS = [
    '#facc15', // Yellow-400
    '#eab308', // Yellow-500
    '#ca8a04', // Yellow-600
    '#fbbf24', // Amber-400
    '#d97706', // Amber-600
    '#fef08a', // Yellow-200 (Bright highlights)
];

export const AmbientFireworks = () => {
    const [fireworks, setFireworks] = useState<Firework[]>([]);

    useEffect(() => {
        // Reduced frequency for a chill ambient effect
        const interval = setInterval(() => {
            const id = Date.now();
            const x = Math.random() * 100; // %
            const y = Math.random() * 80;  // % (keep top mostly)
            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            const scale = 1 + Math.random() * 1.5; // Random size

            setFireworks(prev => [...prev, { id, x, y, color, scale }]);

            // Cleanup
            setTimeout(() => {
                setFireworks(prev => prev.filter(fw => fw.id !== id));
            }, 3000); // Life duration

        }, 2000); // Spawn rate

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <AnimatePresence>
                {fireworks.map(fw => (
                    <motion.div
                        key={fw.id}
                        initial={{
                            opacity: 0,
                            scale: 0.1,
                            x: "-50%",
                            y: "-50%"
                        }}
                        animate={{
                            opacity: [0, 0.6, 0],
                            scale: [0.1, fw.scale, fw.scale * 1.2],
                        }}
                        transition={{
                            duration: 2.5,
                            ease: "easeOut",
                            times: [0, 0.2, 1]
                        }}
                        style={{
                            left: `${fw.x}%`,
                            top: `${fw.y}%`,
                            backgroundColor: fw.color,
                        }}
                        className="absolute w-32 h-32 rounded-full blur-[60px] mix-blend-screen"
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};
