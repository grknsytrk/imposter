import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'

interface DailyData {
    date: string
    active_players: number
}

export function ActivePlayersChart() {
    const [data, setData] = useState<DailyData[]>([])

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        if (!supabase) return

        const { data: dailyStats } = await supabase
            .from('daily_stats')
            .select('date, active_players')
            .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date', { ascending: true })

        if (dailyStats) {
            setData(dailyStats.map(d => ({
                date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                active_players: d.active_players
            })))
        }
    }

    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data yet
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={256}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(263, 70%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(263, 70%, 50%)" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(222, 47%, 9%)',
                        border: '1px solid hsl(217, 33%, 17%)',
                        borderRadius: '8px'
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="active_players"
                    stroke="hsl(263, 70%, 50%)"
                    fillOpacity={1}
                    fill="url(#colorActive)"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
