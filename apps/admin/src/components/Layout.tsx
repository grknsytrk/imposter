import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

interface LayoutProps {
    children: ReactNode
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen bg-background text-foreground flex">
            <Sidebar />
            <main className="flex-1 p-6 md:p-8 overflow-auto">
                {children}
            </main>
        </div>
    )
}
