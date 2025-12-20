import { Moon, Sun } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// Helper to read initial theme
const getInitialTheme = (): boolean => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return saved === 'dark' || (!saved && prefersDark);
};

export const ThemeToggle = () => {
    // Initialize state directly from localStorage
    const [isDark, setIsDark] = useState(getInitialTheme);
    const isInitialized = useRef(false);

    // Apply theme class on mount (syncs if state was set before DOM)
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
        isInitialized.current = true;
    }, []);

    // Persist and apply on change (skip first render to avoid overwriting)
    useEffect(() => {
        if (!isInitialized.current) return; // Skip initial render
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    return (
        <button
            onClick={() => setIsDark(!isDark)}
            className="group w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/20 transition-all"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            <div className="relative">
                {isDark ? (
                    <Sun className="h-5 w-5 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] transition-transform" />
                ) : (
                    <Moon className="h-5 w-5 text-violet-200 drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] transition-transform" />
                )}
            </div>
            <span className="sr-only">Toggle theme</span>
        </button>
    );
};
