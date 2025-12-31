import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'

interface DailyData {
    date: string
    total_games: number
}

export function GamesPerDayChart() {
    const [data, setData] = useState<DailyData[]>([])

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        if (!supabase) return

        const { data: dailyStats } = await supabase
            .from('daily_stats')
            .select('date, total_games')
            .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date', { ascending: true })

        if (dailyStats) {
            setData(dailyStats.map(d => ({
                date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                total_games: d.total_games
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
            <BarChart data={data}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(222, 47%, 9%)',
                        border: '1px solid hsl(217, 33%, 17%)',
                        borderRadius: '8px'
                    }}
                />
                <Bar
                    dataKey="total_games"
                    fill="hsl(173, 58%, 39%)"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}
