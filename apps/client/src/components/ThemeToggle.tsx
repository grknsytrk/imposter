import { Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

export const ThemeToggle = () => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const shouldBeDark = saved === 'dark' || (!saved && prefersDark);
        setIsDark(shouldBeDark);
        document.documentElement.classList.toggle('dark', shouldBeDark);
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    return (
        <button
            onClick={() => setIsDark(!isDark)}
            className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border-2 border-white/20 hover:bg-white/20 text-white shadow-md transition-all hover:scale-110 active:scale-95"
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
