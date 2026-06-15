import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Mobile only (< sm): expands the chart into a fixed fullscreen layer so wide plots
 * use the full viewport without horizontal page scroll. Looks like a horizontal / landscape view.
 *
 * The `targetRef` node should wrap the chart block. Mark the plot wrapper with `data-rotate-plot`
 * (the element that has a fixed height for ResponsiveContainer).
 */
export const RotateViewButton = ({ targetRef }) => {
  const [open, setOpen] = useState(false);
  const savedRef = useRef({ root: "", plot: "", fill: "", bodyOverflow: "" });
  const expandedRef = useRef(false);

  const collapse = useCallback(() => {
    const root = targetRef?.current;
    if (!root) {
      expandedRef.current = false;
      setOpen(false);
      document.body.style.overflow = savedRef.current.bodyOverflow || "";
      return;
    }
    root.style.cssText = savedRef.current.root;
    const plot = root.querySelector("[data-rotate-plot]");
    if (plot) {
      plot.removeAttribute("data-chart-expanded");
      plot.style.cssText = savedRef.current.plot;
    }
    const fill = root.querySelector("[data-rotate-fill]");
    if (fill) fill.style.cssText = savedRef.current.fill;
    document.body.style.overflow = savedRef.current.bodyOverflow || "";
    expandedRef.current = false;
    setOpen(false);
  }, [targetRef]);

  const expand = useCallback(() => {
    const root = targetRef?.current;
    if (!root) return;

    savedRef.current.root = root.style.cssText;
    savedRef.current.bodyOverflow = document.body.style.overflow;

    const plot = root.querySelector("[data-rotate-plot]");
    if (plot) savedRef.current.plot = plot.style.cssText;
    const fill = root.querySelector("[data-rotate-fill]");
    if (fill) savedRef.current.fill = fill.style.cssText;

    root.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "bottom:0",
      "z-index:10050",
      "display:flex",
      "flex-direction:column",
      "background:hsl(var(--background))",
      "padding:max(10px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))",
      "overflow:hidden",
      "box-sizing:border-box",
    ].join(";");

    const fillEl = root.querySelector("[data-rotate-fill]");
    if (fillEl) {
      fillEl.style.cssText = [
        "flex:1",
        "min-height:0",
        "display:flex",
        "flex-direction:column",
        "width:100%",
        "overflow:auto",
        "-webkit-overflow-scrolling:touch",
      ].join(";");
    }

    if (plot) {
      plot.setAttribute("data-chart-expanded", "true");
    }

    document.body.style.overflow = "hidden";
    expandedRef.current = true;
    setOpen(true);
  }, [targetRef]);

  const onToggle = useCallback(() => {
    if (open) collapse();
    else expand();
  }, [open, collapse, expand]);

  useEffect(() => {
    return () => {
      if (!expandedRef.current) return;
      document.body.style.overflow = savedRef.current.bodyOverflow || "";
      const root = targetRef?.current;
      if (root) {
        root.style.cssText = savedRef.current.root;
        const plot = root.querySelector("[data-rotate-plot]");
        if (plot) {
          plot.removeAttribute("data-chart-expanded");
          plot.style.cssText = savedRef.current.plot;
        }
        const fill = root.querySelector("[data-rotate-fill]");
        if (fill) fill.style.cssText = savedRef.current.fill;
      }
      expandedRef.current = false;
    };
  }, [targetRef]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="h-8 px-2 text-xs sm:hidden shrink-0"
        aria-expanded={open}
        aria-label={open ? "Close expanded chart" : "Expand chart to full screen"}
      >
        {open ? <X className="w-3.5 h-3.5" /> : <RotateCw className="w-3.5 h-3.5" />}
        {open ? "Close" : "Rotate"}
      </Button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="fixed right-3 top-[max(12px,env(safe-area-inset-top))] z-[10060] h-9 px-3 text-xs shadow-md sm:hidden"
            onClick={collapse}
            aria-label="Close chart"
          >
            <X className="w-4 h-4 mr-1.5" />
            Done
          </Button>,
          document.body
        )}
    </>
  );
};
