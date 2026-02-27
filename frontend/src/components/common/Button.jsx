import { Button as ShadButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// JSX version (no TypeScript types)
export const Button = ({
  className,
  variant = "primary",
  iconLeft,
  iconRight,
  children,
  ...props
}) => {
  const variantClass =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : variant === "secondary"
      ? "bg-muted text-foreground hover:bg-muted/80"
      : "border border-border text-foreground hover:bg-muted";

  return (
    <ShadButton className={cn("font-semibold", variantClass, className)} {...props}>
      {iconLeft && <span className="mr-2">{iconLeft}</span>}
      {children}
      {iconRight && <span className="ml-2">{iconRight}</span>}
    </ShadButton>
  );
};


