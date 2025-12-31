import { useEffect, useState } from 'react'
import { Users, DoorOpen, Gamepad2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveStats {
    online_players: number
    active_rooms: number
    players_in_game: number
    players_in_lobby: number
    timestamp: string
}

export function LiveStats() {
    const [stats, setStats] = useState<LiveStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchLiveStats()
        const interval = setInterval(fetchLiveStats, 5000) // 5 second polling
        return () => clearInterval(interval)
    }, [])

    async function fetchLiveStats() {
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'

        try {
            const response = await fetch(`${serverUrl}/api/stats/live`)
            if (!response.ok) throw new Error('Failed to fetch')
            const data = await response.json()
            setStats(data)
            setError(null)
        } catch (err) {
            setError('Server offline')
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="bg-card rounded-lg p-4 border border-border animate-pulse">
                <div className="h-6 bg-muted rounded w-32"></div>
            </div>
        )
    }

    if (error || !stats) {
        return (
            <div className="bg-card rounded-lg p-4 border border-border flex items-center gap-3 text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm">Server offline</span>
            </div>
        )
    }

    return (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/20">
            <div className="flex items-center gap-2 mb-3">
                <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping"></div>
                </div>
                <span className="text-sm font-medium text-green-400">Live Status</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatItem
                    icon={<Users className="w-4 h-4" />}
                    label="Online"
                    value={stats.online_players}
                    color="text-green-400"
                />
                <StatItem
                    icon={<DoorOpen className="w-4 h-4" />}
                    label="Rooms"
                    value={stats.active_rooms}
                    color="text-blue-400"
                />
                <StatItem
                    icon={<Gamepad2 className="w-4 h-4" />}
                    label="In Game"
                    value={stats.players_in_game}
                    color="text-purple-400"
                />
                <StatItem
                    icon={<Clock className="w-4 h-4" />}
                    label="In Lobby"
                    value={stats.players_in_lobby}
                    color="text-yellow-400"
                />
            </div>
        </div>
    )
}

function StatItem({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className={cn("opacity-70", color)}>{icon}</span>
            <div>
                <div className={cn("text-xl font-bold", color)}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
            </div>
        </div>
    )
}
