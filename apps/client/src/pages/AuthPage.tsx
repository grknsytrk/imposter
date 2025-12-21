import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, X, Shield, Gamepad2, MessageSquare, AlertTriangle, User, KeyRound, UserCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';

export function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [emailOrUsername, setEmailOrUsername] = useState(''); // Login için email veya username
    const [email, setEmail] = useState(''); // Sign up için email
    const [username, setUsername] = useState(''); // Sign up için username
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);

    // Forgot password states
    const [isForgotOpen, setIsForgotOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState('');
    const [forgotError, setForgotError] = useState('');

    const { signIn, signUp, signInWithGoogle, resetPassword, signInAnonymously } = useAuthStore();
    const { t } = useTranslation();
    const [guestLoading, setGuestLoading] = useState(false);

    // Supabase hata mesajlarını kullanıcı dostu mesajlara çevir
    const formatErrorMessage = (message: string): string => {
        const errorMap: Record<string, string> = {
            'Invalid login credentials': 'Wrong email/username or password. Try again!',
            'Email not confirmed': 'Please check your email and confirm your account first.',
            'User already registered': 'This email is already registered. Try logging in!',
            'Password should be at least 6 characters': 'Password must be at least 6 characters.',
            'Unable to validate email address: invalid format': 'Please enter a valid email address.',
            'Email rate limit exceeded': 'Too many attempts. Please wait a minute and try again.',
            'For security purposes, you can only request this once every 60 seconds': 'Please wait 60 seconds before trying again.',
            'User not found': 'No account found with this email/username.',
            'Invalid email or password': 'Wrong email or password. Try again!',
            'Signup requires a valid password': 'Please enter a valid password.',
            'To signup, please provide your email': 'Please enter your email address.',
            'Password is too weak': 'Please choose a stronger password.',
            'Password should be different from the old password': 'Please choose a different password.',
            'New password should be different from the old password': 'Please choose a different password.',
        };

        // Tam eşleşme kontrolü
        if (errorMap[message]) {
            return errorMap[message];
        }

        // Kısmi eşleşme kontrolü
        for (const [key, value] of Object.entries(errorMap)) {
            if (message.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }

        // Bilinmeyen hatalar için genel mesaj
        return message;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // Login: email veya username ile giriş yap
                const { error } = await signIn(emailOrUsername, password);
                if (error) setError(formatErrorMessage(error.message));
            } else {
                // Sign up: username kontrolü
                if (!username.trim()) {
                    setError('Please enter a username');
                    setLoading(false);
                    return;
                }
                if (username.length < 3) {
                    setError('Username must be at least 3 characters');
                    setLoading(false);
                    return;
                }
                const { error } = await signUp(email, password, username);
                if (error) setError(formatErrorMessage(error.message));
                else setError('Check your email for confirmation link!');
            }
        } catch (err) {
            setError('Something went wrong. Please try again!');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        const { error } = await signInWithGoogle();
        if (error) setError(error.message);
    };

    const handleGuestLogin = async () => {
        setError('');
        setGuestLoading(true);
        try {
            const { error } = await signInAnonymously();
            if (error) setError(formatErrorMessage(error.message));
        } catch (err) {
            setError('Something went wrong. Please try again!');
        } finally {
            setGuestLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center pt-12 md:pt-20 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8 h-20 flex flex-col justify-end">
                    <h1 className="text-5xl font-heading font-black text-white tracking-wide drop-shadow-md">
                        AMONG <span className="text-primary">LIES</span>
                    </h1>
                    <p className="text-white/70 mt-2 font-bold uppercase tracking-widest text-sm">
                        Find the Liar
                    </p>
                </div>

                {/* Auth Card */}
                <motion.div
                    layout
                    className="premium-card p-8 min-h-[520px] flex flex-col"
                >
                    {/* Tab Switch */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-3 rounded-xl font-heading font-black uppercase tracking-wide transition-all ${isLogin
                                ? 'bg-primary text-primary-foreground shadow-lg'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                        >
                            <LogIn className="w-4 h-4 inline mr-2" />
                            {t('auth.login')}
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-3 rounded-xl font-heading font-black uppercase tracking-wide transition-all ${!isLogin
                                ? 'bg-primary text-primary-foreground shadow-lg'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                        >
                            <UserPlus className="w-4 h-4 inline mr-2" />
                            {t('auth.signUp')}
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-center gap-2 p-3 rounded-xl mb-4 text-sm font-bold ${error.includes('Check your email')
                                ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200'
                                : 'bg-rose-100 text-rose-700 border-2 border-rose-200'
                                }`}
                        >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isLogin ? 'login-form' : 'signup-form'}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.15, ease: 'easeInOut' }}
                                className="space-y-4"
                            >
                                {/* Login: Email or Username */}
                                {isLogin ? (
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                                        <input
                                            type="text"
                                            value={emailOrUsername}
                                            onChange={(e) => setEmailOrUsername(e.target.value)}
                                            placeholder={t('auth.emailOrUsername')}
                                            required
                                            className="premium-input w-full h-14"
                                            style={{ paddingLeft: '48px' }}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {/* Sign Up: Username */}
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                placeholder={t('auth.username')}
                                                required
                                                minLength={3}
                                                className="premium-input w-full h-14"
                                                style={{ paddingLeft: '48px' }}
                                            />
                                        </div>
                                        {/* Sign Up: Email */}
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder={t('auth.email')}
                                                required
                                                className="premium-input w-full h-14"
                                                style={{ paddingLeft: '48px' }}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={t('auth.password')}
                                        required
                                        minLength={6}
                                        className="premium-input w-full h-14"
                                        style={{ paddingLeft: '48px' }}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-14 text-lg font-heading font-black uppercase tracking-wider"
                                >
                                    {loading ? '...' : isLogin ? t('auth.login') : t('auth.signUp')}
                                </Button>

                                {/* Forgot Password Link - Only show on Login */}
                                {isLogin && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForgotEmail('');
                                            setForgotMessage('');
                                            setForgotError('');
                                            setIsForgotOpen(true);
                                        }}
                                        className="w-full text-center text-sm text-muted-foreground hover:text-primary font-bold transition-colors mt-2"
                                    >
                                        {t('auth.forgotPassword')}
                                    </button>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-muted-foreground text-xs font-bold uppercase">{t('auth.or')}</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Guest Login */}
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleGuestLogin}
                        disabled={guestLoading}
                        className="w-full h-14 text-lg font-bold gap-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0"
                    >
                        <UserCheck className="w-5 h-5" />
                        {guestLoading ? '...' : t('buttons.playAsGuest')}
                    </Button>

                    {/* Google Login */}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleGoogleLogin}
                        className="w-full h-14 text-lg font-bold gap-3 mt-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        {t('auth.continueGoogle')}
                    </Button>
                </motion.div>

                {/* Footer */}
                <p className="text-center text-white/50 text-sm mt-6 font-bold">
                    {t('auth.termsPrefix')}{' '}
                    <button
                        onClick={() => setIsTermsOpen(true)}
                        className="text-primary hover:text-primary/80 underline transition-colors"
                    >
                        {t('auth.termsLink')}
                    </button>
                    {t('auth.termsSuffix') && ` ${t('auth.termsSuffix')}`}
                </p>
            </motion.div>

            {/* Terms of Service Modal */}
            <AnimatePresence>
                {isTermsOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setIsTermsOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="premium-card bg-card p-6 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-primary" />
                                    </div>
                                    <h2 className="text-xl font-heading font-black text-card-foreground uppercase">Terms of Service</h2>
                                </div>
                                <button
                                    onClick={() => setIsTermsOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-card-foreground">
                                <section>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Gamepad2 className="w-5 h-5 text-primary" />
                                        <h3 className="font-bold text-lg text-card-foreground">Welcome to Among Lies!</h3>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        By accessing and playing Among Lies, you agree to be bound by these Terms of Service.
                                        Please read them carefully before using our platform.
                                    </p>
                                </section>

                                <section>
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-5 h-5 text-emerald-500" />
                                        <h3 className="font-bold text-lg text-card-foreground">Fair Play & Conduct</h3>
                                    </div>
                                    <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-2 list-disc list-inside">
                                        <li>Be respectful to other players at all times</li>
                                        <li>No harassment, hate speech, or discriminatory behavior</li>
                                        <li>No cheating or exploiting game mechanics</li>
                                        <li>Keep chat friendly and appropriate for all ages</li>
                                    </ul>
                                </section>

                                <section>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield className="w-5 h-5 text-blue-500" />
                                        <h3 className="font-bold text-lg text-card-foreground">Your Account</h3>
                                    </div>
                                    <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-2 list-disc list-inside">
                                        <li>You are responsible for maintaining account security</li>
                                        <li>One account per person is allowed</li>
                                        <li>We may suspend accounts violating these terms</li>
                                    </ul>
                                </section>

                                <section>
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        <h3 className="font-bold text-lg text-card-foreground">Disclaimer</h3>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Among Lies is provided "as is" without warranties. We reserve the right to modify
                                        or discontinue the service at any time. Game data may be reset during updates.
                                    </p>
                                </section>

                                <div className="pt-4 border-t border-border">
                                    <p className="text-xs text-muted-foreground text-center">
                                        Last updated: December 2025
                                    </p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-6 pt-4 border-t border-border">
                                <Button
                                    onClick={() => setIsTermsOpen(false)}
                                    className="w-full h-12 font-heading font-black uppercase tracking-wider"
                                >
                                    I Understand
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Forgot Password Modal */}
            <AnimatePresence>
                {isForgotOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setIsForgotOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="premium-card bg-card p-6 w-full max-w-sm"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                                        <KeyRound className="w-5 h-5 text-primary" />
                                    </div>
                                    <h2 className="text-xl font-heading font-black text-card-foreground uppercase">Reset Password</h2>
                                </div>
                                <button
                                    onClick={() => setIsForgotOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Success Message */}
                            {forgotMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm font-bold bg-emerald-100 text-emerald-700 border-2 border-emerald-200"
                                >
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {forgotMessage}
                                </motion.div>
                            )}

                            {/* Error Message */}
                            {forgotError && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm font-bold bg-rose-100 text-rose-700 border-2 border-rose-200"
                                >
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {forgotError}
                                </motion.div>
                            )}

                            {!forgotMessage ? (
                                <>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                        Enter your email or username and we'll send you a link to reset your password.
                                    </p>

                                    <form
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            setForgotError('');
                                            setForgotLoading(true);

                                            const { error } = await resetPassword(forgotEmail);

                                            if (error) {
                                                setForgotError(formatErrorMessage(error.message));
                                            } else {
                                                setForgotMessage('Check your email for a password reset link!');
                                            }

                                            setForgotLoading(false);
                                        }}
                                        className="space-y-4"
                                    >
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                                            <input
                                                type="text"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                placeholder="Email or Username"
                                                required
                                                className="premium-input w-full h-14"
                                                style={{ paddingLeft: '48px' }}
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={forgotLoading}
                                            className="w-full h-12 font-heading font-black uppercase tracking-wider"
                                        >
                                            {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                                        </Button>
                                    </form>
                                </>
                            ) : (
                                <Button
                                    onClick={() => setIsForgotOpen(false)}
                                    className="w-full h-12 font-heading font-black uppercase tracking-wider"
                                >
                                    Got It
                                </Button>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}

