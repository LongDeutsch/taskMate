import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";

export type OverflowAction = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

type OverflowActionsMenuProps = {
  actions: OverflowAction[];
  className?: string;
  /** Chỉ hiện trên mobile */
  mobileOnly?: boolean;
};

export function OverflowActionsMenu({
  actions,
  className,
  mobileOnly = true,
}: OverflowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div ref={ref} className={cn("relative", mobileOnly && "md:hidden", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 shrink-0 border-border"
        aria-label="Thêm thao tác"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="size-5" />
      </Button>
      {open && (
        <ul
          className="absolute right-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground py-1 shadow-lg dark:border-slate-800"
          role="menu"
        >
          {actions.map((action) => (
            <li key={action.label} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={action.disabled}
                className={cn(
                  "flex min-h-11 w-full items-center px-4 text-left text-sm transition-colors",
                  action.destructive
                    ? "text-rose-600 hover:bg-rose-500/10"
                    : "text-foreground hover:bg-muted",
                  action.disabled && "opacity-50"
                )}
                onClick={() => {
                  setOpen(false);
                  action.onClick();
                }}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
