// File: src/shared/components/date-picker.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/components/ui/button";

export type DatePickerProps = {
  value?: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder?: string;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  disabled?: boolean;
  className?: string;
  id?: string;
  shortcuts?: boolean;
  clearable?: boolean;
};

const WEEKDAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function padZero(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDateDisplay(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return iso;
}

function toIsoString(year: number, month: number, day: number) {
  return `${year}-${padZero(month + 1)}-${padZero(day)}`;
}

export function DatePicker({
  value = "",
  onChange,
  placeholder = "Chọn ngày",
  min,
  max,
  disabled = false,
  className,
  id,
  shortcuts = true,
  clearable = true,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Parse initial view date from value or fallback to today
  const initialDate = value ? new Date(value) : new Date();
  const validInitial = Number.isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [viewYear, setViewYear] = useState(validInitial.getFullYear());
  const [viewMonth, setViewMonth] = useState(validInitial.getMonth()); // 0-indexed

  // Keep view year/month in sync if value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupHeight = 350;
    const popupWidth = 300;

    // Check if bottom overflow: place above if not enough space below
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popupHeight && rect.top > spaceBelow;

    let left = rect.left;
    if (left + popupWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - popupWidth - 10);
    }
    if (left < 10) {
      left = 10;
    }

    let top = placeAbove ? rect.top - popupHeight - 6 : rect.bottom + 6;
    if (top < 10) {
      top = 10;
    } else if (top + popupHeight > window.innerHeight - 10) {
      top = Math.max(10, window.innerHeight - popupHeight - 10);
    }

    setCoords({
      top,
      left,
    });
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!open) {
      updatePosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  // Update position on scroll or window resize
  useEffect(() => {
    if (!open) return;
    updatePosition();

    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  // Click outside and escape key to close
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const today = new Date();
  const todayIso = toIsoString(today.getFullYear(), today.getMonth(), today.getDate());

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDate(iso: string) {
    if (isDateDisabled(iso)) return;
    onChange(iso);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  function isDateDisabled(iso: string): boolean {
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  }

  // Generate calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays: {
    dayNumber: number;
    iso: string;
    isCurrentMonth: boolean;
  }[] = [];

  // Previous month trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarDays.push({
      dayNumber: day,
      iso: toIsoString(prevY, prevM, day),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({
      dayNumber: d,
      iso: toIsoString(viewYear, viewMonth, d),
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete 35 or 42 grid
  const totalCells = calendarDays.length > 35 ? 42 : 35;
  const remaining = totalCells - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarDays.push({
      dayNumber: d,
      iso: toIsoString(nextY, nextM, d),
      isCurrentMonth: false,
    });
  }

  // Shortcut helpers
  function addDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return toIsoString(d.getFullYear(), d.getMonth(), d.getDate());
  }

  const shortcutOptions = [
    { label: "Hôm nay", iso: todayIso },
    { label: "Ngày mai", iso: addDays(1) },
    { label: "+3 ngày", iso: addDays(3) },
    { label: "+1 tuần", iso: addDays(7) },
  ];

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors",
          "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "hover:border-slate-300 dark:hover:border-slate-700",
          disabled && "cursor-not-allowed opacity-50",
          !value && "text-muted-foreground",
          value && "font-medium text-foreground",
          className
        )}
      >
        <span className="flex items-center gap-2 truncate pointer-events-none">
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{value ? formatDateDisplay(value) : placeholder}</span>
        </span>

        {value && clearable && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClear(e as unknown as React.MouseEvent);
              }
            }}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Xóa ngày"
            aria-label="Xóa ngày đã chọn"
          >
            <X className="size-3.5" />
          </span>
        )}
      </button>

      {/* Dropdown Calendar Popover rendered via Portal to avoid any overflow clipping */}
      {open &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Lịch chọn ngày"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 9999,
            }}
            className={cn(
              "w-[290px] rounded-xl border border-border bg-card p-3 shadow-2xl transition-all",
              "animate-in fade-in zoom-in-95 duration-150",
              "dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] dark:text-slate-100"
            )}
          >
            {/* Quick Preset Shortcuts */}
            {shortcuts && (
              <div className="mb-2.5 flex flex-wrap gap-1 border-b border-border pb-2 dark:border-slate-800">
                {shortcutOptions.map((s) => {
                  const isSelected = value === s.iso;
                  const isDis = isDateDisabled(s.iso);
                  return (
                    <button
                      key={s.label}
                      type="button"
                      disabled={isDis}
                      onClick={() => selectDate(s.iso)}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-muted/70 text-muted-foreground hover:bg-accent hover:text-foreground dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                        isDis && "cursor-not-allowed opacity-40"
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Month / Year Navigation */}
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                onClick={prevMonth}
                className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Tháng trước"
              >
                <ChevronLeft className="size-4" />
              </button>

              <span className="text-xs font-semibold text-foreground dark:text-slate-100">
                Tháng {viewMonth + 1}, {viewYear}
              </span>

              <button
                type="button"
                onClick={nextMonth}
                className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Tháng sau"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground pb-1 dark:text-slate-400">
              {WEEKDAY_NAMES.map((w) => (
                <div key={w} className="py-0.5">
                  {w}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map(({ dayNumber, iso, isCurrentMonth }) => {
                const isSelected = value === iso;
                const isToday = iso === todayIso;
                const isDisabled = isDateDisabled(iso);

                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => selectDate(iso)}
                    className={cn(
                      "flex size-8 cursor-pointer items-center justify-center rounded-lg text-xs transition-colors",
                      !isCurrentMonth && "text-muted-foreground/30 dark:text-slate-600",
                      isCurrentMonth && !isSelected && "text-foreground hover:bg-accent dark:text-slate-200 dark:hover:bg-slate-800",
                      isToday && !isSelected && "font-bold text-primary ring-1 ring-primary/40 dark:text-blue-400 dark:ring-blue-500/40",
                      isSelected && "bg-primary text-primary-foreground font-semibold shadow-xs",
                      isDisabled && "cursor-not-allowed opacity-25 hover:bg-transparent"
                    )}
                  >
                    {dayNumber}
                  </button>
                );
              })}
            </div>

            {/* Footer actions */}
            <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2 dark:border-slate-800">
              <button
                type="button"
                onClick={() => selectDate(todayIso)}
                disabled={isDateDisabled(todayIso)}
                className="cursor-pointer text-xs font-medium text-primary hover:underline focus:outline-none dark:text-blue-400"
              >
                Hôm nay
              </button>
              <div className="flex gap-2">
                {value && clearable && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="cursor-pointer text-xs text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Xóa
                  </button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 cursor-pointer px-2 text-xs"
                  onClick={() => setOpen(false)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
