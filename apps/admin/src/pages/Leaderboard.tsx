import { useEffect, useState } from 'react'
import { Trophy, User, Gamepad2, Target, Clock, Skull, Users } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface LeaderboardPlayer {
    id: string
    username: string
    avatar: string
    games_played: number
    games_won: number
    win_rate: number
    imposter_games: number
    imposter_wins: number
    citizen_games: number
    citizen_wins: number
    last_played_at: string
    rank: number
}

type TabType = 'overall' | 'imposter' | 'citizen'

export function Leaderboard() {
    const [players, setPlayers] = useState<LeaderboardPlayer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<TabType>('overall')

    useEffect(() => {
        fetchLeaderboard()
    }, [])

    async function fetchLeaderboard() {
        if (!isSupabaseConfigured() || !supabase) {
            setError('Supabase not configured')
            setLoading(false)
            return
        }

        try {
            const { data, error: fetchError } = await supabase
                .from('v_leaderboard')
                .select('*')
                .limit(50)

            if (fetchError) {
                setError(`View not found: ${fetchError.message}`)
            } else if (data) {
                setPlayers(data)
                setError(null)
            }
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err)
            setError('Connection failed')
        }
        setLoading(false)
    }

    // Sort players based on active tab
    const sortedPlayers = [...players].sort((a, b) => {
        if (activeTab === 'imposter') {
            return b.imposter_wins - a.imposter_wins
        } else if (activeTab === 'citizen') {
            return b.citizen_wins - a.citizen_wins
        }
        return b.games_won - a.games_won
    }).map((player, index) => ({ ...player, rank: index + 1 }))

    const tabs = [
        { id: 'overall' as TabType, label: 'Overall', icon: Trophy },
        { id: 'imposter' as TabType, label: 'Best Imposters', icon: Skull },
        { id: 'citizen' as TabType, label: 'Best Citizens', icon: Users },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        )
    }

    return (
        <div>
            <header className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Leaderboard
                </h1>
                <p className="text-sm text-muted-foreground">
                    Top players ranked by wins (minimum 3 games)
                </p>
                {error && <p className="text-sm text-yellow-500 mt-2">⚠️ {error}</p>}
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                                activeTab === tab.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-card border border-border hover:bg-muted"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {sortedPlayers.length === 0 ? (
                <div className="bg-card rounded-lg p-12 border border-border text-center">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h2 className="text-xl font-semibold mb-2">No Players Yet</h2>
                    <p className="text-muted-foreground">
                        Players with at least 3 completed games will appear here.
                    </p>
                </div>
            ) : (
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rank</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Player</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                                    <Gamepad2 className="w-4 h-4 inline" /> Games
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                                    <Trophy className="w-4 h-4 inline" />
                                    {activeTab === 'imposter' ? ' Imposter Wins' :
                                        activeTab === 'citizen' ? ' Citizen Wins' : ' Wins'}
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                                    <Target className="w-4 h-4 inline" /> Win %
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                                    <Clock className="w-4 h-4 inline" /> Last Active
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sortedPlayers.map((player) => {
                                const wins = activeTab === 'imposter' ? player.imposter_wins :
                                    activeTab === 'citizen' ? player.citizen_wins :
                                        player.games_won
                                const games = activeTab === 'imposter' ? player.imposter_games :
                                    activeTab === 'citizen' ? player.citizen_games :
                                        player.games_played
                                const winRate = games > 0 ? Math.round((wins / games) * 100) : 0

                                return (
                                    <tr key={player.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className={`font-bold ${player.rank === 1 ? 'text-yellow-500' :
                                                    player.rank === 2 ? 'text-gray-400' :
                                                        player.rank === 3 ? 'text-amber-600' :
                                                            'text-muted-foreground'
                                                }`}>
                                                #{player.rank}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                                    activeTab === 'imposter' ? "bg-red-500/20" :
                                                        activeTab === 'citizen' ? "bg-green-500/20" :
                                                            "bg-primary/20"
                                                )}>
                                                    <User className={cn(
                                                        "w-4 h-4",
                                                        activeTab === 'imposter' ? "text-red-400" :
                                                            activeTab === 'citizen' ? "text-green-400" :
                                                                "text-primary"
                                                    )} />
                                                </div>
                                                <span className="font-medium">{player.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">{games}</td>
                                        <td className="px-4 py-3 text-center font-semibold">{wins}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-sm ${winRate >= 60 ? 'bg-green-500/20 text-green-400' :
                                                    winRate >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-red-500/20 text-red-400'
                                                }`}>
                                                {winRate}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                                            {player.last_played_at
                                                ? new Date(player.last_played_at).toLocaleDateString()
                                                : '-'
                                            }
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
