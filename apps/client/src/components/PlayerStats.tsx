
import { useEffect, useState } from 'react';
import { Trophy, Target, User, Skull, ChartBar, Loader2 } from 'lucide-react';
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
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="bg-black/20 rounded-2xl p-8 border border-white/5 text-center">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground font-heading text-sm uppercase tracking-wider">No Battle Data Found</p>
                <p className="text-xs text-slate-500 mt-1">Complete matches to build your record</p>
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-heading font-black text-xs uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <ChartBar className="w-4 h-4" />
                    Career Performance
                </h3>
                <div className="px-2 py-0.5 rounded bg-primary/20 border border-primary/30 text-[10px] font-bold text-primary uppercase tracking-wider">
                    Season 1
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Win Rate Card - Featured */}
                <div className="col-span-2 bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/20 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-violet-500/20 transition-all duration-500" />

                    <div className="flex justify-between items-end relative z-10">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-violet-300 mb-1 opacity-70">Global Win Rate</p>
                            <div className="flex items-baseline gap-1">
                                <span className="font-heading font-black text-5xl text-white tracking-tight">{winRate}</span>
                                <span className="font-heading text-xl text-violet-400">%</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30 mb-2 ml-auto">
                                <Trophy className="w-6 h-6 text-violet-300" />
                            </div>
                            <p className="text-xs text-violet-300/60 font-medium">Top {winRate > 50 ? '10%' : '50%'}</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-violet-600 to-indigo-400 rounded-full"
                            style={{ width: `${winRate}%` }}
                        />
                    </div>
                </div>

                {/* Games Played */}
                <div className="bg-card/50 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 transition-colors">
                    <Target className="w-5 h-5 text-slate-400 mb-2" />
                    <div>
                        <span className="font-heading font-black text-2xl text-white">{stats.games_played}</span>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1">Matches</p>
                    </div>
                </div>

                {/* Total Wins */}
                <div className="bg-card/50 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 transition-colors">
                    <Trophy className="w-5 h-5 text-amber-400 mb-2" />
                    <div>
                        <span className="font-heading font-black text-2xl text-white">{stats.games_won}</span>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1">Victories</p>
                    </div>
                </div>
            </div>

            {/* Role Breakdown */}
            <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 pl-1">Role Proficiency</p>

                {/* Imposter Stats Row */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-rose-950/30 to-rose-900/10 border border-rose-500/10 hover:border-rose-500/30 transition-all p-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                                <Skull className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="font-bold text-rose-100 text-sm">Imposter</p>
                                <p className="text-[10px] text-rose-400/60 font-medium">{stats.imposter_games} Games Played</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="font-heading font-black text-xl text-rose-500">{imposterWinRate}%</span>
                        </div>
                    </div>
                    {/* Role Progress */}
                    <div className="h-1 w-full bg-rose-950/50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-rose-500 rounded-full transition-all duration-300 group-hover:shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                            style={{ width: `${imposterWinRate}%` }}
                        />
                    </div>
                </div>

                {/* Citizen Stats Row */}
                <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-950/30 to-emerald-900/10 border border-emerald-500/10 hover:border-emerald-500/30 transition-all p-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <User className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="font-bold text-emerald-100 text-sm">Citizen</p>
                                <p className="text-[10px] text-emerald-400/60 font-medium">{stats.citizen_games} Games Played</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="font-heading font-black text-xl text-emerald-500">{citizenWinRate}%</span>
                        </div>
                    </div>
                    {/* Role Progress */}
                    <div className="h-1 w-full bg-emerald-950/50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300 group-hover:shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                            style={{ width: `${citizenWinRate}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
