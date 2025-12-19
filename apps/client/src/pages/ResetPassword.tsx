import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';

export function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const { updatePassword, session } = useAuthStore();
    const navigate = useNavigate();

    // Supabase otomatik olarak reset linkinden gelen kullanıcıyı login yapar
    // Session yoksa bu sayfaya erişim yok
    useEffect(() => {
        if (!session) {
            // Kısa bir süre bekle, belki session yükleniyordur
            const timer = setTimeout(() => {
                if (!session) {
                    navigate('/auth');
                }
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [session, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        const { error } = await updatePassword(password);

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            // 2 saniye sonra login'e yönlendir
            setTimeout(() => {
                navigate('/auth');
            }, 2000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-heading font-black text-white tracking-wide drop-shadow-lg">
                        IMPOSTER <span className="text-primary">GAME</span>
                    </h1>
                    <p className="text-white/70 mt-2 font-bold uppercase tracking-widest text-sm">
                        Reset Your Password
                    </p>
                </div>

                {/* Reset Card */}
                <div className="premium-card p-8">
                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-8"
                        >
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h2 className="text-xl font-heading font-black text-card-foreground mb-2">
                                PASSWORD UPDATED!
                            </h2>
                            <p className="text-muted-foreground">
                                Redirecting to login...
                            </p>
                        </motion.div>
                    ) : (
                        <>
                            <h2 className="text-xl font-heading font-black text-card-foreground text-center mb-6">
                                CREATE NEW PASSWORD
                            </h2>

                            {/* Error Message */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm font-bold bg-rose-100 text-rose-700 border-2 border-rose-200"
                                >
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* New Password */}
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="New Password"
                                        required
                                        minLength={6}
                                        className="premium-input w-full h-14"
                                        style={{ paddingLeft: '48px', paddingRight: '48px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Confirm Password */}
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm Password"
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
                                    {loading ? 'Updating...' : 'Update Password'}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
