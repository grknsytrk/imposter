import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { supabase } from '@/lib/supabase'

interface DailyData {
    date: string
    imposter_rate: number
    citizen_rate: number
}

export function RoleBalanceChart() {
    const [data, setData] = useState<DailyData[]>([])

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        if (!supabase) return

        const { data: dailyStats } = await supabase
            .from('daily_stats')
            .select('date, imposter_wins, citizen_wins, total_games')
            .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date', { ascending: true })

        if (dailyStats) {
            setData(dailyStats.map(d => ({
                date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                imposter_rate: d.total_games > 0 ? Math.round((d.imposter_wins / d.total_games) * 100) : 0,
                citizen_rate: d.total_games > 0 ? Math.round((d.citizen_wins / d.total_games) * 100) : 0
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
            <LineChart data={data}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(222, 47%, 9%)',
                        border: '1px solid hsl(217, 33%, 17%)',
                        borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value}%`, '']}
                />
                <Legend />
                <ReferenceLine y={50} stroke="hsl(215, 20%, 40%)" strokeDasharray="3 3" />
                <Line
                    type="monotone"
                    dataKey="imposter_rate"
                    name="Imposter Win %"
                    stroke="hsl(0, 84%, 60%)"
                    strokeWidth={2}
                    dot={false}
                />
                <Line
                    type="monotone"
                    dataKey="citizen_rate"
                    name="Citizen Win %"
                    stroke="hsl(173, 58%, 39%)"
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    )
}
