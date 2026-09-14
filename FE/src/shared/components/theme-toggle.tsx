// File: src/shared/components/theme-toggle.tsx
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/shared/lib/theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";

type ThemeToggleProps = {
  className?: string;
  variant?: "ghost" | "outline";
  showLabel?: boolean;
};

export function ThemeToggle({
  className,
  variant = "ghost",
  showLabel = false,
}: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant={variant}
      size={showLabel ? "default" : "icon"}
      onClick={toggleTheme}
      className={cn(
        "size-9 shrink-0 transition-colors text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
        showLabel && "w-full justify-start gap-2.5 px-3 h-10",
        className
      )}
      aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      title={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
    >
      <div className="relative flex size-4 items-center justify-center">
        <Sun
          className={cn(
            "size-4 transition-transform duration-300 absolute",
            isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100 text-amber-500"
          )}
        />
        <Moon
          className={cn(
            "size-4 transition-transform duration-300 absolute",
            isDark ? "rotate-0 scale-100 opacity-100 text-blue-400" : "-rotate-90 scale-0 opacity-0"
          )}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium">
          {isDark ? "Giao diện tối (Dark)" : "Giao diện sáng (Light)"}
        </span>
      )}
    </Button>
  );
}
