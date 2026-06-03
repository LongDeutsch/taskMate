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
        className="size-11 shrink-0 border-gray-200"
        aria-label="Thêm thao tác"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="size-5" />
      </Button>
      {open && (
        <ul
          className="absolute right-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
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
                    ? "text-red-600 hover:bg-red-50"
                    : "text-gray-700 hover:bg-gray-50",
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
