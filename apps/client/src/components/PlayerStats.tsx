
import { useEffect, useState } from 'react';
import { TrendingUp, Skull, User, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

interface PlayerStats {
    games_played: number;
    games_won: number;
    imposter_games: number;
    imposter_wins: number;
    citizen_games: number;
    citizen_wins: number;
}

export const PlayerStats = () => {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('player_stats')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (!error && data) {
                    setStats(data);
                }
            } catch (err) {
                console.warn('[PlayerStats] Failed to fetch stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-6 text-muted-foreground/50">
                <p className="text-xs font-bold uppercase tracking-widest">No Matches Recorded</p>
            </div>
        );
    }

    const winRate = stats.games_played > 0
        ? Math.round((stats.games_won / stats.games_played) * 100)
        : 0;

    const imposterWinRate = stats.imposter_games > 0
        ? Math.round((stats.imposter_wins / stats.imposter_games) * 100)
        : 0;

    const citizenWinRate = stats.citizen_games > 0
        ? Math.round((stats.citizen_wins / stats.citizen_games) * 100)
        : 0;

    return (
        <div className="w-full space-y-4">
            {/* Header with Title and Season Badge - Compact */}
            <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Performance
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-white/5">
                    SEASON 1
                </span>
            </div>

            {/* Main Stats Row - Clean & Minimal */}
            <div className="grid grid-cols-3 gap-0 divide-x divide-border bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                <div className="p-3 text-center hover:bg-white/5 transition-colors group">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider block mb-0.5 group-hover:text-primary transition-colors">Games</span>
                    <span className="font-heading font-black text-xl text-foreground">{stats.games_played}</span>
                </div>
                <div className="p-3 text-center hover:bg-white/5 transition-colors group">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider block mb-0.5 group-hover:text-yellow-500 transition-colors">Win Rate</span>
                    <span className={`font-heading font-black text-xl ${winRate >= 50 ? 'text-yellow-500' : 'text-foreground'}`}>{winRate}%</span>
                </div>
                <div className="p-3 text-center hover:bg-white/5 transition-colors group">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider block mb-0.5 group-hover:text-emerald-500 transition-colors">Wins</span>
                    <span className="font-heading font-black text-xl text-foreground">{stats.games_won}</span>
                </div>
            </div>

            {/* Role Breakdown - Compact List */}
            <div className="space-y-2 pt-1">
                {/* Imposter Row */}
                <div className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 group-hover:border-rose-500/50 transition-colors">
                        <Skull className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-xs font-bold text-rose-200">Imposter</span>
                            <span className="text-xs font-black text-rose-500">{imposterWinRate}%</span>
                        </div>
                        <div className="h-1 w-full bg-rose-950/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-rose-500 rounded-full opacity-80 group-hover:opacity-100 transition-all"
                                style={{ width: `${imposterWinRate}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Citizen Row */}
                <div className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:border-emerald-500/50 transition-colors">
                        <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-xs font-bold text-emerald-200">Citizen</span>
                            <span className="text-xs font-black text-emerald-500">{citizenWinRate}%</span>
                        </div>
                        <div className="h-1 w-full bg-emerald-950/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full opacity-80 group-hover:opacity-100 transition-all"
                                style={{ width: `${citizenWinRate}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
