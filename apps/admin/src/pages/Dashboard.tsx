import { useEffect, useState } from 'react'
import { Activity, Gamepad2, Users, TrendingUp, TrendingDown } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { StatsCard } from '@/components/StatsCard'
import { LiveStats } from '@/components/LiveStats'
import { ActivePlayersChart } from '@/components/charts/ActivePlayersChart'
import { GamesPerDayChart } from '@/components/charts/GamesPerDayChart'
import { RoleBalanceChart } from '@/components/charts/RoleBalanceChart'

interface DashboardStats {
    total_players: number
    total_games: number
    global_win_rate: number
    active_7d: number
    active_30d: number
}

export function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchStats()
        const interval = setInterval(fetchStats, 30000)
        return () => clearInterval(interval)
    }, [])

    async function fetchStats() {
        if (!isSupabaseConfigured() || !supabase) {
            setError('Supabase not configured - check .env file')
            setLoading(false)
            return
        }

        try {
            const { data, error: fetchError } = await supabase
                .from('v_dashboard_stats')
                .select('*')
                .single()

            if (fetchError) {
                setError(`View not found: ${fetchError.message}`)
            } else if (data) {
                setStats(data)
                setLastUpdated(new Date())
                setError(null)
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err)
            setError('Connection failed')
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        )
    }

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                    Game Analytics Overview
                    {lastUpdated && <span className="ml-2">• Updated {lastUpdated.toLocaleTimeString()}</span>}
                </p>
                {error && <p className="text-sm text-yellow-500 mt-2">⚠️ {error}</p>}
            </header>

            {/* Live Status */}
            <div className="mb-6">
                <LiveStats />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatsCard
                    title="Total Players"
                    value={stats?.total_players ?? 0}
                    icon={<Users className="w-5 h-5" />}
                />
                <StatsCard
                    title="Total Games"
                    value={stats?.total_games ?? 0}
                    icon={<Gamepad2 className="w-5 h-5" />}
                />
                <StatsCard
                    title="Active (7d)"
                    value={stats?.active_7d ?? 0}
                    icon={<Activity className="w-5 h-5" />}
                    trend={stats?.active_7d && stats?.active_30d && stats.active_30d > 0
                        ? ((stats.active_7d / stats.active_30d) * 100 - 100)
                        : undefined
                    }
                />
                <StatsCard
                    title="Win Rate"
                    value={`${stats?.global_win_rate ?? 0}%`}
                    icon={stats?.global_win_rate && stats.global_win_rate >= 50
                        ? <TrendingUp className="w-5 h-5" />
                        : <TrendingDown className="w-5 h-5" />
                    }
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card rounded-lg p-6 border border-border">
                    <h2 className="text-lg font-semibold mb-4">Active Players Trend</h2>
                    <ActivePlayersChart />
                </div>

                <div className="bg-card rounded-lg p-6 border border-border">
                    <h2 className="text-lg font-semibold mb-4">Games Per Day</h2>
                    <GamesPerDayChart />
                </div>

                <div className="bg-card rounded-lg p-6 border border-border lg:col-span-2">
                    <h2 className="text-lg font-semibold mb-4">Role Win Balance</h2>
                    <RoleBalanceChart />
                </div>
            </div>
        </div>
    )
}
