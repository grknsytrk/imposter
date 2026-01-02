import useSWR from 'swr'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabaseListFetcher } from '@/lib/fetcher'

interface CategoryStat {
    category: string
    total_games: number
    imposter_wins: number
    citizen_wins: number
}

const CUSTOM_TOOLTIP_STYLE = {
    backgroundColor: 'hsl(var(--card))',
    borderColor: 'hsl(var(--border))',
    color: 'hsl(var(--foreground))',
}

export function CategoryWinChart() {
    const { data, isLoading } = useSWR<CategoryStat[]>(
        'game_category_stats', // Table name
        supabaseListFetcher
    )

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
            </div>
        )
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                No category data available yet
            </div>
        )
    }

    // Sort by total games descending
    const sortedData = [...data].sort((a, b) => b.total_games - a.total_games)

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                    <XAxis
                        dataKey="category"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                        contentStyle={CUSTOM_TOOLTIP_STYLE}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    />
                    <Legend />
                    <Bar
                        dataKey="imposter_wins"
                        name="Imposter Wins"
                        stackId="a"
                        fill="#be123c" // Rose-700
                        radius={[0, 0, 4, 4]}
                        fillOpacity={0.9}
                    />
                    <Bar
                        dataKey="citizen_wins"
                        name="Citizen Wins"
                        stackId="a"
                        fill="#0ea5e9" // Sky-500
                        radius={[4, 4, 0, 0]}
                        fillOpacity={0.9}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
