import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-base font-heading font-black tracking-wide transition-all duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background select-none active:scale-95",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground border-b-4 border-yellow-600 hover:brightness-110 active:border-b-0 active:translate-y-1",
                destructive:
                    "bg-destructive text-destructive-foreground border-b-4 border-red-800 hover:brightness-110 active:border-b-0 active:translate-y-1",
                outline:
                    "border-4 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:border-b-0 active:translate-y-1 active:border-t-4",
                secondary:
                    "bg-secondary text-secondary-foreground border-b-4 border-cyan-700 hover:brightness-110 active:border-b-0 active:translate-y-1",
                ghost: "hover:bg-slate-100 hover:text-slate-900 border-b-4 border-transparent hover:border-slate-200",
                link: "text-primary underline-offset-4 hover:underline",
                premium: "bg-gradient-to-b from-primary to-orange-400 text-white border-b-4 border-orange-700 shadow-lg hover:brightness-110 active:border-b-0 active:translate-y-1",
            },
            size: {
                default: "h-14 px-6",
                sm: "h-10 px-4 text-xs",
                lg: "h-16 px-8 text-lg",
                icon: "h-12 w-12",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, children, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"

        // Only apply shine structure if not using Slot (simplified for safety)
        if (asChild) {
            return (
                <Comp
                    className={cn(buttonVariants({ variant, size, className }))}
                    ref={ref}
                    {...props}
                >
                    {children}
                </Comp>
            )
        }

        return (
            <button
                className={cn(buttonVariants({ variant, size, className }), "group relative overflow-visible")}
                ref={ref}
                {...props}
            >
                {/* Shine Container - Clipped */}
                <span className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none">
                    <span className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                </span>

                {/* Content */}
                <span className="relative z-10 flex items-center justify-center gap-2">
                    {children}
                </span>
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
