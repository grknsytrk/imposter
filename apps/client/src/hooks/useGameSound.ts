import { useCallback, useEffect } from 'react';

// Map of sound types to their file paths in public/sounds/
const SOUND_FILES = {
    click: '/sounds/zapsplat_multimedia_pop_up_pop_002_91296.mp3',
    message: '/sounds/zapsplat_multimedia_bell_ping_new_alert_notification_002_87942.mp3',
    success: '/sounds/zapsplat_multimedia_ui_software_game_success_open_113743.mp3',
};

// Singleton cache to avoid re-fetching
const audioCache: Record<string, HTMLAudioElement> = {};

export const useGameSound = () => {
    // Preload MP3 sounds on mount
    useEffect(() => {
        Object.values(SOUND_FILES).forEach((src) => {
            if (!audioCache[src]) {
                const audio = new Audio(src);
                audio.volume = 0.5; // Default volume
                audioCache[src] = audio;
            }
        });
    }, []);

    const playTone = useCallback((type: 'hover' | 'click' | 'message' | 'success' | 'shush') => {


        if (type === 'hover') {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;

            // High pitched short tick (Orijinal Kod)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);

            gain.gain.setValueAtTime(0.05, now); // Very quiet
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.start(now);
            osc.stop(now + 0.06);
            return; // Hover için mp3 çalmıyoruz, synth bitti.
        }

        // -----------------------------------------------------
        // 2. DİĞER SESLER (MP3 DOSYALARI)
        // -----------------------------------------------------
        // @ts-ignore
        const src = SOUND_FILES[type];
        if (!src) return;

        const audio = audioCache[src];

        if (audio) {
            audio.currentTime = 0;
            audio.volume = type === 'message' ? 0.6 : 0.4;
            audio.play().catch(() => { });
        }
    }, []);

    return { playTone };
};
