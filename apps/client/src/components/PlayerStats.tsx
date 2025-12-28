import { useEffect, useState } from 'react';
import { Trophy, Target, User, Skull, TrendingUp } from 'lucide-react';
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
            <div className="animate-pulse flex gap-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 w-24 bg-muted rounded-xl" />
                ))}
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center text-muted-foreground text-sm py-4">
                <p>No stats yet. Play some games!</p>
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
        <div className="space-y-4">
            <h3 className="font-heading font-black text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Statistics
            </h3>

            <div className="grid grid-cols-3 gap-3">
                {/* Games Played */}
                <div className="bg-card border border-border rounded-xl p-3 text-center">
                    <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="font-heading font-black text-xl text-foreground">{stats.games_played}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Games</p>
                </div>

                {/* Win Rate */}
                <div className="bg-card border border-border rounded-xl p-3 text-center">
                    <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                    <p className="font-heading font-black text-xl text-foreground">{winRate}%</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Win Rate</p>
                </div>

                {/* Total Wins */}
                <div className="bg-card border border-border rounded-xl p-3 text-center">
                    <Trophy className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                    <p className="font-heading font-black text-xl text-foreground">{stats.games_won}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wins</p>
                </div>
            </div>

            {/* Role Stats */}
            <div className="grid grid-cols-2 gap-3">
                {/* Imposter Stats */}
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Skull className="w-4 h-4 text-rose-500" />
                        <span className="text-xs font-bold uppercase text-rose-400">Imposter</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Games: {stats.imposter_games}</span>
                        <span className="text-rose-400 font-bold">{imposterWinRate}%</span>
                    </div>
                </div>

                {/* Citizen Stats */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold uppercase text-emerald-400">Citizen</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Games: {stats.citizen_games}</span>
                        <span className="text-emerald-400 font-bold">{citizenWinRate}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
