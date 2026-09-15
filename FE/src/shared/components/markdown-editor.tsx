// File: src/shared/components/markdown-editor.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  Italic,
  Heading,
  ListTodo,
  List,
  ListOrdered,
  Code,
  Quote,
  Eye,
  Edit3,
  Sparkles,
  UserCheck,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";
import { cn } from "@/shared/lib/utils";

export type MarkdownEditorProps = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minRows?: number;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** Kéo editor cao theo cột cha (layout 2 cột drawer) */
  fillHeight?: boolean;
};

const TEMPLATES = [
  {
    label: "Phân rã Module & Tính năng",
    description: "Chia nhóm việc theo Module, đầu việc con và người phụ trách",
    content: `### 1. [Tên Module/Tính năng 1]
- [ ] Đầu việc con 1
- [ ] Đầu việc con 2
- [ ] Kiểm thử & Review
=> Người phụ trách 1

### 2. [Tên Module/Tính năng 2]
- [ ] Đầu việc con 1
- [ ] Đầu việc con 2
=> Người phụ trách 2`,
  },
  {
    label: "Báo cáo Lỗi kỹ thuật (Bug)",
    description: "Khung báo cáo bug chuẩn: Hiện tượng, Tái hiện, Mong đợi",
    content: `### 🚨 Hiện tượng lỗi
- Mô tả vắn tắt hiện tượng xảy ra...

### 🔄 Các bước tái hiện (Steps)
1. Truy cập vào trang...
2. Thực hiện thao tác...
3. Gặp lỗi...

### ✅ Kết quả mong đợi
- Hệ thống cần phản hồi...

### 📋 Checklist khắc phục
- [ ] Tìm nguyên nhân gốc
- [ ] Sửa lỗi & Viết test
- [ ] Kiểm thử môi trường staging
=> Người phụ trách sửa`,
  },
  {
    label: "Checklist công việc hàng ngày",
    description: "Mục tiêu trọng tâm và danh sách việc cần hoàn thành",
    content: `### 🎯 Mục tiêu hôm nay
- Hoàn thành các tính năng ưu tiên cao

### 📋 Danh sách việc cần làm
- [ ] 
- [ ] 
- [ ] 

### ⚠️ Ghi chú / Vướng mắc
- Cần hỗ trợ từ: `,
  },
];

export function MarkdownEditor({
  value = "",
  onChange,
  placeholder = "Mô tả công việc (hỗ trợ Markdown, checklist `- [ ]`, gạch đầu dòng `- `)...",
  minRows = 6,
  id,
  disabled = false,
  className,
  fillHeight = false,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [showTemplates, setShowTemplates] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const templateMenuRef = useRef<HTMLDivElement | null>(null);
  const isComposingRef = useRef(false);
  const lastCompositionEndTimeRef = useRef(0);

  // Close template menu on click outside
  useEffect(() => {
    if (!showTemplates) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setShowTemplates(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTemplates]);

  useEffect(() => {
    if (!expanded) {
      delete document.documentElement.dataset.taskmateEditorExpanded;
      return;
    }
    document.documentElement.dataset.taskmateEditorExpanded = "1";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setExpanded(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      delete document.documentElement.dataset.taskmateEditorExpanded;
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [expanded]);

  // Insert text at current selection and focus.
  // Dùng textarea.value (DOM) thay vì React state — tránh lệch khi IME vừa commit từ.
  const insertTextAtCursor = useCallback(
    (textToInsert: string, cursorOffset?: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const current = textarea.value;
      const { selectionStart, selectionEnd } = textarea;
      const before = current.substring(0, selectionStart);
      const after = current.substring(selectionEnd);
      const nextValue = before + textToInsert + after;

      onChange(nextValue);

      requestAnimationFrame(() => {
        textarea.focus();
        const nextPos =
          cursorOffset !== undefined ? selectionStart + cursorOffset : selectionStart + textToInsert.length;
        textarea.setSelectionRange(nextPos, nextPos);
      });
    },
    [onChange]
  );

  // Wrap current selection with tokens (e.g., **bold**, *italic*)
  const wrapSelection = useCallback(
    (prefix: string, suffix: string, defaultPlaceholder: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;
      const selected = value.substring(selectionStart, selectionEnd);
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);

      if (selected.length > 0) {
        // If already selected, wrap it
        const nextValue = before + prefix + selected + suffix + after;
        onChange(nextValue);
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(
            selectionStart + prefix.length,
            selectionEnd + prefix.length
          );
        });
      } else {
        // Insert placeholder inside wrapped tags
        const nextValue = before + prefix + defaultPlaceholder + suffix + after;
        onChange(nextValue);
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(
            selectionStart + prefix.length,
            selectionStart + prefix.length + defaultPlaceholder.length
          );
        });
      }
    },
    [value, onChange]
  );

  // Insert line prefix at current line start
  const insertLinePrefix = useCallback(
    (prefix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const text = textarea.value;
      const { selectionStart } = textarea;
      const lineStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
      const currentLine = text.substring(lineStart, selectionStart);

      // If already at line start
      if (currentLine.trim() === "") {
        insertTextAtCursor(prefix);
      } else {
        // Insert a new line with prefix
        insertTextAtCursor(`\n${prefix}`);
      }
    },
    [insertTextAtCursor]
  );

  // Smart Key Down: Enter & Tab handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd } = textarea;
    // Nội dung thật trên DOM (IME có thể vừa commit từ chưa kịp sync React state)
    const text = textarea.value;

    // 1. Tab key indents 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const before = text.substring(0, selectionStart);
      const after = text.substring(selectionEnd);
      onChange(before + "  " + after);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
      });
      return;
    }

    // 2. Smart Enter: Auto continue list / exit empty list
    if (e.key === "Enter" && !e.shiftKey) {
      // Bỏ qua khi đang soạn IME (Telex/VNI) — Enter dùng để chốt từ, không nối dòng.
      // Một số trình duyệt vẫn fire keydown Enter ngay sau compositionend → chặn ~120ms.
      const native = e.nativeEvent as KeyboardEvent;
      const justCommittedIme = Date.now() - lastCompositionEndTimeRef.current < 120;
      if (native.isComposing || isComposingRef.current || justCommittedIme || native.keyCode === 229) {
        return;
      }

      const lineStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
      const currentLine = text.substring(lineStart, selectionStart);

      // Matchers for empty lists (User wants to EXIT list)
      const checklistEmpty = currentLine.match(/^(\s*)[-+*]\s*\[[ xX]\]\s*$/);
      const bulletEmpty = currentLine.match(/^(\s*)([-+*])\s*$/);
      const numberEmpty = currentLine.match(/^(\s*)\d+\.\s*$/);

      if (checklistEmpty || bulletEmpty || numberEmpty) {
        e.preventDefault();
        // Remove the empty bullet from current line
        const lineEnd = text.indexOf("\n", selectionStart);
        const endPos = lineEnd === -1 ? text.length : lineEnd;
        const nextValue = text.substring(0, lineStart) + text.substring(endPos);
        onChange(nextValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = lineStart;
        });
        return;
      }

      // Matchers for active lists with content
      const checklistMatch = currentLine.match(/^(\s*)[-+*]\s*\[[ xX]\]\s+(.+)$/);
      const bulletMatch = currentLine.match(/^(\s*)([-+*])\s+(.+)$/);
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.+)$/);

      // Case: Continue checklist
      if (checklistMatch) {
        e.preventDefault();
        const indent = checklistMatch[1];
        insertTextAtCursor(`\n${indent}- [ ] `);
        return;
      }

      // Case: Continue bullet
      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const bullet = bulletMatch[2];
        insertTextAtCursor(`\n${indent}${bullet} `);
        return;
      }

      // Case: Continue numbered list
      if (numberMatch) {
        e.preventDefault();
        const indent = numberMatch[1];
        const nextNum = parseInt(numberMatch[2], 10) + 1;
        insertTextAtCursor(`\n${indent}${nextNum}. `);
        return;
      }
    }

    // 3. Shortcuts: Ctrl/Cmd + B (Bold)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      wrapSelection("**", "**", "in đậm");
      return;
    }

    // 4. Shortcuts: Ctrl/Cmd + I (Italic)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      wrapSelection("*", "*", "in nghiêng");
      return;
    }
  };

  const applyTemplate = (templateContent: string) => {
    if (value.trim() !== "") {
      const ok = window.confirm(
        "Nội dung mô tả hiện tại sẽ được thay thế bằng mẫu mới. Bạn có muốn tiếp tục không?"
      );
      if (!ok) return;
    }
    onChange(templateContent);
    setShowTemplates(false);
    setActiveTab("write");
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const lineCount = value ? value.split("\n").length : 0;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  const editorShell = (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card shadow-2xs transition-colors overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20",
        fillHeight && !expanded && "h-full min-h-[240px]",
        expanded && "h-full min-h-0 rounded-none border-0 shadow-none focus-within:ring-0",
        className
      )}
    >
      {/* Header Bar: Toolbar & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border bg-muted/40 px-2.5 py-1.5 dark:bg-slate-900/60">
        {/* Left Formatting Action Buttons */}
        <div className="flex flex-wrap items-center gap-0.5">
          <button
            type="button"
            disabled={disabled || activeTab === "preview"}
            onClick={() => wrapSelection("**", "**", "văn bản")}
            title="In đậm (Ctrl+B)"
            aria-label="In đậm"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Bold className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled || activeTab === "preview"}
            onClick={() => wrapSelection("*", "*", "văn bản")}
            title="In nghiêng (Ctrl+I)"
            aria-label="In nghiêng"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Italic className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled || activeTab === "preview"}
            onClick={() => insertLinePrefix("### ")}
            title="Tiêu đề mục (###)"
            aria-label="Tiêu đề mục"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Heading className="size-3.5" />
          </button>

          <div className="mx-1 h-3.5 w-px bg-border/80" />

          <button
            type="button"
            disabled={disabled || activeTab === "preview"}
            onClick={() => insertLinePrefix("- [ ] ")}
            title="Chèn checklist (- [ ])"
            aria-label="Chèn checklist"
            className="cursor-pointer flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition disabled:opacity-40"
          >
            <ListTodo className="size-3.5" />
            <span>Checklist</span>
          </button>
          <button
            type="button"
            disabled={disabled || activeTab === "preview"}
            onClick={() => insertLinePrefix("- ")}
            title="Gạch đầu dòng (-)"
            aria-label="Gạch đầu dòng"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <List className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled || activeTab === "preview"}
            onClick={() => insertLinePrefix("1. ")}
            title="Danh sách số (1.)"
            aria-label="Danh sách số"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <ListOrdered className="size-3.5" />
          </button>

          <div className="mx-1 h-3.5 w-px bg-border/80" />

          <button
            type="button"
            disabled={disabled || activeTab === "preview"}
            onClick={() => wrapSelection("`", "`", "code")}
            title="Mã nguồn inline (`code`)"
            aria-label="Mã nguồn inline"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Code className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled || activeTab === "preview"}
            onClick={() => insertLinePrefix("> ")}
            title="Trích dẫn (>)"
            aria-label="Trích dẫn"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Quote className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled || activeTab === "preview"}
            onClick={() => insertLinePrefix("=> ")}
            title="Gắn người phụ trách (=> Tên)"
            aria-label="Gắn người phụ trách"
            className="cursor-pointer flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60 transition disabled:opacity-40"
          >
            <UserCheck className="size-3.5" />
            <span>Phụ trách</span>
          </button>

          {/* Quick Templates Dropdown */}
          <div className="relative" ref={templateMenuRef}>
            <button
              type="button"
              disabled={disabled || activeTab === "preview"}
              onClick={() => setShowTemplates((v) => !v)}
              className="cursor-pointer flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition disabled:opacity-40"
              title="Chọn mẫu log task sẵn"
            >
              <Sparkles className="size-3 text-amber-500" />
              <span>Mẫu gợi ý</span>
              <ChevronDown className="size-3" />
            </button>

            {showTemplates && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 dark:border-slate-800 dark:bg-slate-900">
                <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Chọn mẫu log công việc:
                </p>
                <div className="space-y-1">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => applyTemplate(tpl.content)}
                      className="cursor-pointer flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-accent"
                    >
                      <span className="font-semibold text-foreground">{tpl.label}</span>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">
                        {tpl.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Write / Preview + Expand */}
        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-lg border border-border bg-card/80 p-0.5 shadow-2xs dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setActiveTab("write")}
              className={cn(
                "cursor-pointer flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activeTab === "write"
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Edit3 className="size-3" />
              <span>Soạn thảo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={cn(
                "cursor-pointer flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activeTab === "preview"
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="size-3" />
              <span>Xem trước</span>
            </button>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Thu nhỏ (Esc)" : "Mở rộng toàn màn hình"}
            aria-label={expanded ? "Thu nhỏ editor" : "Mở rộng editor"}
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {activeTab === "write" ? (
        <div className={cn("relative min-h-0", (fillHeight || expanded) && "flex flex-1 flex-col")}>
          <textarea
            ref={textareaRef}
            id={id}
            rows={fillHeight || expanded ? undefined : minRows}
            disabled={disabled}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
              lastCompositionEndTimeRef.current = Date.now();
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full bg-transparent px-3.5 py-3 text-sm font-normal leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50",
              fillHeight || expanded
                ? "min-h-[200px] flex-1 resize-none h-full"
                : "min-h-[160px] resize-y"
            )}
          />
        </div>
      ) : (
        <div
          className={cn(
            "overflow-y-auto bg-muted/20 px-4 py-3.5 dark:bg-slate-950/40",
            fillHeight || expanded ? "min-h-0 flex-1" : "min-h-[160px] max-h-[400px]"
          )}
        >
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="italic text-xs text-muted-foreground">Chưa có nội dung để xem trước.</p>
          )}
        </div>
      )}

      {/* Footer info bar */}
      <div className="flex shrink-0 items-center justify-between border-t border-border/60 bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">
        <span className="hidden sm:inline">
          Phím tắt: <kbd className="font-mono font-semibold">Enter</kbd> tự nối dòng ·{" "}
          <kbd className="font-mono font-semibold">Tab</kbd> lùi dòng ·{" "}
          <kbd className="font-mono font-semibold">Ctrl+B</kbd> in đậm
          {expanded ? (
            <>
              {" "}
              · <kbd className="font-mono font-semibold">Esc</kbd> thu nhỏ
            </>
          ) : null}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span>{lineCount} dòng</span>
          <span>{wordCount} từ</span>
        </div>
      </div>
    </div>
  );

  if (expanded) {
    return (
      <>
        <div
          className={cn(
            "flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center",
            fillHeight && "h-full"
          )}
        >
          <p className="text-sm text-muted-foreground">Đang soạn thảo toàn màn hình</p>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent"
          >
            <Minimize2 className="size-3.5" />
            Thu nhỏ
          </button>
        </div>
        {createPortal(
          <div
            data-markdown-editor-expanded
            className="fixed inset-0 z-[80] flex flex-col bg-background/95 p-3 backdrop-blur-sm sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Soạn thảo toàn màn hình"
          >
            <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col">
              <div className="mb-2 flex shrink-0 items-center justify-between gap-2 px-0.5">
                <p className="text-sm font-medium text-foreground">Soạn thảo mô tả</p>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent"
                >
                  <Minimize2 className="size-3.5" />
                  Thu nhỏ
                </button>
              </div>
              <div className="min-h-0 flex-1">{editorShell}</div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return editorShell;
}
