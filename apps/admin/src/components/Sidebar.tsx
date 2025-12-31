import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Trophy, Gamepad2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
]

export function Sidebar() {
    const location = useLocation()

    return (
        <aside className="w-64 bg-card border-r border-border flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Gamepad2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg">Among Lies</h1>
                        <p className="text-xs text-muted-foreground">Operator Dashboard</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                isActive
                                    ? "bg-primary/20 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                    v1.0.0 • 2024
                </p>
            </div>
        </aside>
    )
}
