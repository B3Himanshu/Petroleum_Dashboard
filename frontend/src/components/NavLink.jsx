import { NavLink as RouterNavLink } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// JSX version (no TypeScript generics or interfaces)
const NavLink = forwardRef((
  { className, activeClassName, pendingClassName, to, ...props },
  ref,
) => {
  return (
    <RouterNavLink
      ref={ref}
      to={to}
      className={({ isActive, isPending }) =>
        cn(className, isActive && activeClassName, isPending && pendingClassName)
      }
      {...props}
    />
  );
});

NavLink.displayName = "NavLink";

export { NavLink };
