import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:   "bg-accent text-white border-transparent",
        secondary: "bg-bg-tertiary text-text-primary border-border",
        outline:   "text-text-primary border-border",
        success:   "bg-success-bg text-success-text border-success-border",
        warning:   "bg-warning-bg text-warning-text border-warning-border",
        danger:    "bg-danger-bg text-danger-text border-danger-border",
        info:      "bg-info-bg text-info-text border-info-border",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
