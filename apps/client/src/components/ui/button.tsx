import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-none text-[10px] font-heading font-bold uppercase tracking-[0.2em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-white/90",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline:
                    "border border-white/10 bg-transparent hover:bg-white/5 hover:border-white/20 text-white/70 hover:text-white",
                secondary:
                    "bg-white/5 text-white/80 border border-white/5 hover:border-white/20 hover:bg-white/10",
                ghost: "hover:bg-white/5 text-white/50 hover:text-white",
                link: "text-primary underline-offset-4 hover:underline",
                premium: "bg-primary text-primary-foreground shadow-[0_4px_20px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_8px_30px_-10px_rgba(255,255,255,0.4)]",
            },
            size: {
                default: "h-12 px-8",
                sm: "h-9 px-4",
                lg: "h-14 px-10 text-[11px] tracking-[0.3em]",
                icon: "h-10 w-10",
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
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
