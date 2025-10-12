import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-turquoise-500 text-white shadow-md hover:bg-turquoise-600 focus-visible:ring-turquoise-500",
        destructive:
          "!text-red-600 bg-transparent shadow-md hover:bg-red-500/10 hover:!text-red-700 focus-visible:ring-red-500",
        outline:
          "border border-neutral-300 bg-white shadow-sm hover:bg-neutral-50 hover:text-foreground",
        secondary:
          "text-black bg-transparent hover:bg-neutral-100 hover:text-black focus-visible:ring-neutral-400",
        ghost: "hover:bg-neutral-100 hover:text-foreground hover:shadow-md",
        link: "text-turquoise-500 underline-offset-4 hover:underline",
        // Custom variants for backwards compatibility
        primary:
          "bg-turquoise-500 text-white shadow-md hover:bg-turquoise-600 focus-visible:ring-turquoise-500",
        role: "bg-turquoise-500 text-white shadow hover:bg-turquoise-600 focus-visible:ring-turquoise-500",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        // Map our existing sizes
        md: "h-9 px-4 py-2", // Same as default
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** User role for role-based styling (when variant="role") */
  role?: Role;
  /** Whether the button is in a loading state */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      role,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
