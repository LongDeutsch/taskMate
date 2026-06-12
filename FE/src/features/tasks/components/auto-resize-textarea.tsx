import { useLayoutEffect, useRef } from "react";

/** Auto-grow without resetting scroll position or caret (height=auto briefly collapses the field). */
function fitHeight(el: HTMLTextAreaElement, minRows: number) {
  const scrollTop = el.scrollTop;
  const selStart = el.selectionStart;
  const selEnd = el.selectionEnd;
  const parent = el.parentElement;
  const parentScrollTop = parent?.scrollTop ?? 0;

  el.style.height = "auto";
  const minPx = minRows * 24;
  el.style.height = `${Math.max(minPx, el.scrollHeight)}px`;

  el.scrollTop = scrollTop;
  if (parent) parent.scrollTop = parentScrollTop;
  try {
    el.setSelectionRange(selStart, selEnd);
  } catch {
    /* ignore if element not focused */
  }
}

type AutoResizeTextareaProps = {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  minRows?: number;
  maxLength?: number;
  className?: string;
  disabled?: boolean;
};

export function AutoResizeTextarea({
  id,
  value,
  onChange,
  placeholder,
  minRows = 3,
  maxLength,
  className,
  disabled,
}: AutoResizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (ref.current) fitHeight(ref.current, minRows);
  }, [value, minRows]);

  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      disabled={disabled}
      onChange={onChange}
      onInput={(e) => fitHeight(e.currentTarget, minRows)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={minRows}
      className={[
        "w-full resize-y overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
