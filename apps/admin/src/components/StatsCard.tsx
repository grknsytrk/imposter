import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
    title: string
    value: string | number
    icon: ReactNode
    trend?: number
    className?: string
}

export function StatsCard({ title, value, icon, trend, className }: StatsCardProps) {
    return (
        <div className={cn(
            "bg-card rounded-lg p-6 border border-border",
            className
        )}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{title}</span>
                <span className="text-primary">{icon}</span>
            </div>
            <div className="text-3xl font-bold">{value}</div>
            {trend !== undefined && (
                <div className={cn(
                    "text-sm mt-1",
                    trend >= 0 ? "text-green-500" : "text-red-500"
                )}>
                    {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
                </div>
            )}
        </div>
    )
}
