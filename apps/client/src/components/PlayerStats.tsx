
import { useEffect, useState } from 'react';
import { Skull, User, Loader2 } from 'lucide-react';
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

    const minGamesForStats = 1;
    const hasEnoughData = stats.games_played >= minGamesForStats;

    const winRate = stats.games_played > 0
        ? Math.round((stats.games_won / stats.games_played) * 100)
        : 0;

    return (
        <div className="w-full select-none">
            {/* Main Metrics - Compact Single Row */}
            <div className="flex items-center justify-between px-1 py-2 border-b border-white/5">
                <div className="flex flex-col items-center flex-1 border-r border-white/5 last:border-0">
                    <span className="text-[8px] uppercase font-bold text-muted-foreground/60 tracking-wider">Matches</span>
                    <span className="font-heading font-bold text-base text-foreground">{stats.games_played}</span>
                </div>

                <div className="flex flex-col items-center flex-1 border-r border-white/5 last:border-0">
                    <span className="text-[8px] uppercase font-bold text-muted-foreground/60 tracking-wider">Win Rate</span>
                    <span className={`font-heading font-bold text-base ${!hasEnoughData ? 'text-muted-foreground/30 text-sm' : 'text-foreground'}`}>
                        {hasEnoughData ? `${winRate}%` : 'N/A'}
                    </span>
                </div>

                <div className="flex flex-col items-center flex-1">
                    <span className="text-[8px] uppercase font-bold text-muted-foreground/60 tracking-wider">Victories</span>
                    <span className="font-heading font-bold text-base text-foreground">{stats.games_won}</span>
                </div>
            </div>

            {/* Role Breakdown - Compact Table */}
            <div className="pt-2 px-1">
                <div className="grid grid-cols-4 gap-1 mb-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 px-2">
                    <span className="col-span-2 text-left">Role</span>
                    <span className="text-center">Games</span>
                    <span className="text-right">Wins</span>
                </div>

                <div className="space-y-0.5">
                    {/* Imposter Row */}
                    <div className="grid grid-cols-4 gap-1 items-center px-2 py-1.5 rounded-md bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-colors group">
                        <div className="col-span-2 flex items-center gap-1.5">
                            <Skull className="w-3 h-3 text-rose-500/70 group-hover:text-rose-500 transition-colors" />
                            <span className="text-[10px] font-bold text-rose-200/80 group-hover:text-rose-100">Imposter</span>
                        </div>
                        <span className="text-center text-xs font-bold text-muted-foreground group-hover:text-foreground">
                            {stats.imposter_games}
                        </span>
                        <span className="text-right text-xs font-bold text-muted-foreground group-hover:text-foreground">
                            {stats.imposter_wins}
                        </span>
                    </div>

                    {/* Citizen Row */}
                    <div className="grid grid-cols-4 gap-1 items-center px-2 py-1.5 rounded-md bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-colors group">
                        <div className="col-span-2 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-emerald-500/70 group-hover:text-emerald-500 transition-colors" />
                            <span className="text-[10px] font-bold text-emerald-200/80 group-hover:text-emerald-100">Citizen</span>
                        </div>
                        <span className="text-center text-xs font-bold text-muted-foreground group-hover:text-foreground">
                            {stats.citizen_games}
                        </span>
                        <span className="text-right text-xs font-bold text-muted-foreground group-hover:text-foreground">
                            {stats.citizen_wins}
                        </span>
                    </div>
                </div>

                {!hasEnoughData && (
                    <div className="mt-2 text-center">
                        <p className="text-[9px] text-muted-foreground/30 font-medium">
                            Play 5 matches to unlock stats
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

