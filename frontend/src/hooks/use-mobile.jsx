import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/** Tailwind `sm` (640px) — true when layout should match desktop charts. */
export function useIsSmUp() {
  const [smUp, setSmUp] = React.useState(true);

  React.useEffect(() => {
    const mql = window.matchMedia("(min-width: 640px)");
    const onChange = () => setSmUp(mql.matches);
    mql.addEventListener("change", onChange);
    setSmUp(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return smUp;
}
