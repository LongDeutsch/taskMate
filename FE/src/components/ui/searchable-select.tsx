import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  /** Hiển thị khi không khớp option nào (vd. value rỗng nhưng list trống). */
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  /** Ẩn ô tìm kiếm cho danh sách ngắn (status/priority/sort) nhưng giữ panel đồng bộ. */
  searchable?: boolean;
}

/** Bỏ dấu tiếng Việt + hạ chữ thường để search không phân biệt hoa thường/dấu. */
function normalizeVi(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Chọn...",
  searchPlaceholder = "Tìm...",
  emptyText = "Không tìm thấy",
  disabled = false,
  className,
  ariaLabel,
  searchable = true,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? placeholder,
    [options, value, placeholder]
  );

  const filtered = useMemo(() => {
    const q = normalizeVi(query);
    if (!q) return options;
    return options.filter((o) => normalizeVi(o.label).includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      if (!searchable) return;
      const t = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open, searchable]);

  function handleSelect(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative w-full md:w-auto", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm transition-colors hover:border-gray-300 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 md:h-9 md:w-auto md:min-w-[150px]",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-gray-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg md:right-auto md:w-[260px]">
          {searchable && (
            <div className="border-b border-gray-100 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}
          <ul role="listbox" id={listboxId} className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-400">
                {emptyText}
              </li>
            ) : (
              filtered.map((opt) => {
                const active = opt.value === value;
                return (
                  <li key={opt.value || "__all__"} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-blue-50 font-medium text-blue-700"
                          : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {active && <Check className="size-4 shrink-0 text-blue-600" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
