/**
 * Safe localStorage wrapper for Safari private browsing compatibility.
 * Safari private mode throws errors when accessing localStorage.
 */

export const safeStorage = {
    getItem: (key: string): string | null => {
        try {
            return localStorage.getItem(key);
        } catch {
            console.warn('localStorage not available (Safari private mode?)');
            return null;
        }
    },

    setItem: (key: string, value: string): void => {
        try {
            localStorage.setItem(key, value);
        } catch {
            console.warn('localStorage not available (Safari private mode?)');
        }
    },

    removeItem: (key: string): void => {
        try {
            localStorage.removeItem(key);
        } catch {
            console.warn('localStorage not available (Safari private mode?)');
        }
    }
};
