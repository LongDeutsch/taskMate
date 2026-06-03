import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type FloatingActionButtonProps = {
  onClick: () => void;
  label: string;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function FloatingActionButton({
  onClick,
  label,
  icon,
  className,
  disabled,
}: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40",
        "flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg",
        "transition-colors hover:bg-blue-700 active:bg-blue-800",
        "disabled:opacity-50 md:hidden",
        className
      )}
    >
      {icon}
    </button>
  );
}
