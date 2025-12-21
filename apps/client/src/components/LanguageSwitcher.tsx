import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { LANGUAGES, type SupportedLanguage } from '../lib/i18n';

// Inline SVG flags for cross-platform compatibility
const FlagGB = () => (
    <svg className="w-6 h-4 rounded-sm shadow-sm" viewBox="0 0 60 40" fill="none">
        <rect width="60" height="40" fill="#012169" />
        <path d="M0 0L60 40M60 0L0 40" stroke="white" strokeWidth="8" />
        <path d="M0 0L60 40M60 0L0 40" stroke="#C8102E" strokeWidth="4" />
        <path d="M30 0V40M0 20H60" stroke="white" strokeWidth="12" />
        <path d="M30 0V40M0 20H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
);

const FlagTR = () => (
    <svg className="w-6 h-4 rounded-sm shadow-sm" viewBox="0 0 60 40" fill="none">
        <rect width="60" height="40" fill="#E30A17" />
        <circle cx="22" cy="20" r="10" fill="white" />
        <circle cx="25" cy="20" r="8" fill="#E30A17" />
        <polygon fill="white" points="35,20 28,23 30,19 28,17" transform="rotate(20 35 20)" />
    </svg>
);

const FLAGS: Record<string, React.FC> = {
    en: FlagGB,
    tr: FlagTR,
};

export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Use only base language code (e.g., 'tr' from 'tr-TR') for comparison
    const baseLangCode = i18n.language?.substring(0, 2) || 'en';
    const currentLang = LANGUAGES.find(l => l.code === baseLangCode) || LANGUAGES[0];

    const handleLanguageChange = (langCode: SupportedLanguage) => {
        i18n.changeLanguage(langCode);
        setIsOpen(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/20 transition-all"
                title="Change Language"
            >
                <Globe className="w-5 h-5" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-12 w-44 bg-card border-2 border-border rounded-xl shadow-xl overflow-hidden z-[9999]"
                    >
                        {LANGUAGES.map((lang) => {
                            const Flag = FLAGS[lang.code] || FlagGB;
                            return (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLanguageChange(lang.code)}
                                    className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted transition-colors ${currentLang.code === lang.code ? 'bg-primary/10' : ''
                                        }`}
                                >
                                    <Flag />
                                    <span className={`font-bold text-sm flex-1 ${currentLang.code === lang.code ? 'text-primary' : 'text-card-foreground'}`}>
                                        {lang.label}
                                    </span>
                                    {currentLang.code === lang.code && (
                                        <Check className="w-4 h-4 text-primary" />
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
