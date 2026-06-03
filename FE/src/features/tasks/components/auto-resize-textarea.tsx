import { useEffect, useRef } from "react";

function fitHeight(el: HTMLTextAreaElement, minRows: number) {
  el.style.height = "auto";
  const minPx = minRows * 24;
  el.style.height = `${Math.max(minPx, el.scrollHeight)}px`;
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

  useEffect(() => {
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
