// File: src/shared/components/markdown-renderer.tsx
import { useMemo } from "react";
import { CheckSquare, Square, User, Code2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type MarkdownRendererProps = {
  content: string;
  className?: string;
  interactive?: boolean;
  onToggleChecklist?: (newContent: string) => void;
};

type ParsedBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "checklist"; checked: boolean; text: string; lineIndex: number }
  | { type: "bullet"; text: string; indent: number }
  | { type: "numbered"; num: string; text: string; indent: number }
  | { type: "quote"; text: string }
  | { type: "codeblock"; lang: string; lines: string[] }
  | { type: "assignee"; text: string; prefix: "=>" | "->" }
  | { type: "paragraph"; text: string };

/**
 * Format inline elements like **bold**, *italic*, `code`, and => Assignee
 */
function renderInlineText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const remaining = text;
  let keyIdx = 0;

  // Tokenize bold, italic, inline code, and => / -> assignee patterns
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|(=>|->)\s*[^,;.\n]+(?:,\s*[^,;.\n]+)*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(remaining.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`i-${keyIdx++}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`c-${keyIdx++}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground ring-1 ring-border/50"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("=>") || token.startsWith("->")) {
      const isArrow = token.startsWith("=>") ? "=>" : "->";
      const name = token.substring(2).trim();
      parts.push(
        <span
          key={`a-${keyIdx++}`}
          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200/70 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-900/60 mx-1 align-baseline"
        >
          <User className="size-3 shrink-0" />
          <span>{isArrow} {name}</span>
        </span>
      );
    } else {
      parts.push(token);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < remaining.length) {
    parts.push(remaining.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export function MarkdownRenderer({
  content,
  className,
  interactive = false,
  onToggleChecklist,
}: MarkdownRendererProps) {
  // Parse lines into blocks
  const { blocks, checklistStats, allLines } = useMemo(() => {
    if (!content) return { blocks: [], checklistStats: null, allLines: [] };
    const lines = content.split("\n");
    const parsed: ParsedBlock[] = [];
    let inCodeBlock = false;
    let codeLang = "";
    let codeLines: string[] = [];

    let totalChecklist = 0;
    let completedChecklist = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Code blocks ```
      if (trimmed.startsWith("```")) {
        if (inCodeBlock) {
          parsed.push({ type: "codeblock", lang: codeLang, lines: codeLines });
          inCodeBlock = false;
          codeLines = [];
          codeLang = "";
        } else {
          inCodeBlock = true;
          codeLang = trimmed.substring(3).trim();
          codeLines = [];
        }
        continue;
      }
      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      if (trimmed === "") {
        continue;
      }

      // Headings: #, ##, ###
      if (trimmed.startsWith("### ")) {
        parsed.push({ type: "heading", level: 3, text: trimmed.substring(4) });
        continue;
      }
      if (trimmed.startsWith("## ")) {
        parsed.push({ type: "heading", level: 2, text: trimmed.substring(3) });
        continue;
      }
      if (trimmed.startsWith("# ")) {
        parsed.push({ type: "heading", level: 1, text: trimmed.substring(2) });
        continue;
      }

      // Checklist: - [ ] or - [x] or * [ ] or + [ ]
      const checkMatch = line.match(/^(\s*)[-+*]\s+\[([ xX])\]\s+(.*)$/);
      if (checkMatch) {
        const isChecked = checkMatch[2].toLowerCase() === "x";
        totalChecklist++;
        if (isChecked) completedChecklist++;
        parsed.push({
          type: "checklist",
          checked: isChecked,
          text: checkMatch[3],
          lineIndex: i,
        });
        continue;
      }

      // Assignee line alone: => Tên hoặc -> Tên
      const assigneeMatch = line.match(/^(\s*)(=>|->)\s+(.*)$/);
      if (assigneeMatch) {
        parsed.push({
          type: "assignee",
          prefix: assigneeMatch[2] as "=>" | "->",
          text: assigneeMatch[3],
        });
        continue;
      }

      // Bullet List: - item or + item or * item
      const bulletMatch = line.match(/^(\s*)([-+*])\s+(.*)$/);
      if (bulletMatch) {
        const indent = Math.floor(bulletMatch[1].length / 2);
        parsed.push({
          type: "bullet",
          indent,
          text: bulletMatch[3],
        });
        continue;
      }

      // Numbered List: 1. item
      const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        const indent = Math.floor(numMatch[1].length / 2);
        parsed.push({
          type: "numbered",
          indent,
          num: numMatch[2],
          text: numMatch[3],
        });
        continue;
      }

      // Blockquote: > item
      if (trimmed.startsWith("> ")) {
        parsed.push({
          type: "quote",
          text: trimmed.substring(2),
        });
        continue;
      }

      // Regular paragraph
      parsed.push({
        type: "paragraph",
        text: line,
      });
    }

    if (inCodeBlock && codeLines.length > 0) {
      parsed.push({ type: "codeblock", lang: codeLang, lines: codeLines });
    }

    const stats =
      totalChecklist > 0
        ? {
            total: totalChecklist,
            completed: completedChecklist,
            percent: Math.round((completedChecklist / totalChecklist) * 100),
          }
        : null;

    return { blocks: parsed, checklistStats: stats, allLines: lines };
  }, [content]);

  // Handle toggling a checklist item in interactive mode
  const handleToggle = (lineIndex: number) => {
    if (!interactive || !onToggleChecklist || !allLines[lineIndex]) return;
    const lines = [...allLines];
    const targetLine = lines[lineIndex];
    if (targetLine.includes("- [ ]")) {
      lines[lineIndex] = targetLine.replace("- [ ]", "- [x]");
    } else if (targetLine.includes("- [x]") || targetLine.includes("- [X]")) {
      lines[lineIndex] = targetLine.replace(/- \[[xX]\]/, "- [ ]");
    } else if (targetLine.includes("+ [ ]")) {
      lines[lineIndex] = targetLine.replace("+ [ ]", "+ [x]");
    } else if (targetLine.includes("+ [x]") || targetLine.includes("+ [X]")) {
      lines[lineIndex] = targetLine.replace(/\+ \[[xX]\]/, "+ [ ]");
    }
    onToggleChecklist(lines.join("\n"));
  };

  if (!content || content.trim() === "") {
    return <p className="italic text-muted-foreground text-sm">Chưa có mô tả.</p>;
  }

  return (
    <div className={cn("space-y-2.5 leading-relaxed text-sm text-foreground", className)}>
      {/* Checklist Progress Bar if checklists exist */}
      {checklistStats && (
        <div className="mb-4 rounded-xl border border-border/80 bg-muted/40 p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              <CheckSquare className="size-4 text-emerald-600 dark:text-emerald-400" />
              Tiến độ đầu việc
            </span>
            <span className="text-muted-foreground">
              {checklistStats.completed}/{checklistStats.total} ({checklistStats.percent}%)
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
            <div
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                checklistStats.percent === 100
                  ? "bg-emerald-500"
                  : "bg-blue-600 dark:bg-blue-500"
              )}
              style={{ width: `${checklistStats.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Render Blocks */}
      <div className="space-y-2">
        {blocks.map((block, idx) => {
          switch (block.type) {
            case "heading": {
              if (block.level === 1) {
                return (
                  <h2
                    key={idx}
                    className="pt-3 pb-1 text-base font-bold tracking-tight text-foreground border-b border-border/60 first:pt-0"
                  >
                    {renderInlineText(block.text)}
                  </h2>
                );
              }
              if (block.level === 2) {
                return (
                  <h3
                    key={idx}
                    className="pt-2 pb-0.5 text-sm font-bold text-foreground first:pt-0"
                  >
                    {renderInlineText(block.text)}
                  </h3>
                );
              }
              return (
                <h4
                  key={idx}
                  className="pt-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 first:pt-0"
                >
                  {renderInlineText(block.text)}
                </h4>
              );
            }

            case "checklist": {
              return (
                <div
                  key={idx}
                  onClick={() => interactive && handleToggle(block.lineIndex)}
                  className={cn(
                    "flex items-start gap-2.5 py-0.5 transition-colors rounded-md px-1",
                    interactive && "cursor-pointer hover:bg-muted/50 -mx-1"
                  )}
                >
                  <button
                    type="button"
                    disabled={!interactive}
                    aria-label={block.checked ? "Đã hoàn thành" : "Chưa hoàn thành"}
                    className="mt-0.5 shrink-0 text-muted-foreground transition-colors focus:outline-none"
                  >
                    {block.checked ? (
                      <CheckSquare className="size-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="size-4 text-muted-foreground/70 hover:text-foreground" />
                    )}
                  </button>
                  <span
                    className={cn(
                      "flex-1 text-[13.5px] leading-relaxed break-words",
                      block.checked &&
                        "line-through text-muted-foreground/80 dark:text-muted-foreground"
                    )}
                  >
                    {renderInlineText(block.text)}
                  </span>
                </div>
              );
            }

            case "assignee": {
              return (
                <div key={idx} className="my-1 flex items-center pl-6">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200/80 dark:bg-blue-950/70 dark:text-blue-300 dark:ring-blue-900/60 shadow-2xs">
                    <User className="size-3.5" />
                    <span>Phụ trách: {block.text}</span>
                  </span>
                </div>
              );
            }

            case "bullet": {
              return (
                <div
                  key={idx}
                  className="flex items-start gap-2 py-0.5"
                  style={{ paddingLeft: `${block.indent * 16}px` }}
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                  <span className="flex-1 text-[13.5px] leading-relaxed break-words">
                    {renderInlineText(block.text)}
                  </span>
                </div>
              );
            }

            case "numbered": {
              return (
                <div
                  key={idx}
                  className="flex items-start gap-2 py-0.5"
                  style={{ paddingLeft: `${block.indent * 16}px` }}
                >
                  <span className="shrink-0 font-semibold text-xs text-muted-foreground min-w-4">
                    {block.num}.
                  </span>
                  <span className="flex-1 text-[13.5px] leading-relaxed break-words">
                    {renderInlineText(block.text)}
                  </span>
                </div>
              );
            }

            case "quote": {
              return (
                <blockquote
                  key={idx}
                  className="border-l-3 border-blue-500/70 bg-muted/30 py-1.5 pl-3 pr-2 text-xs italic text-muted-foreground rounded-r-md"
                >
                  {renderInlineText(block.text)}
                </blockquote>
              );
            }

            case "codeblock": {
              return (
                <div
                  key={idx}
                  className="my-2 overflow-hidden rounded-xl border border-border bg-slate-950 text-slate-100"
                >
                  {block.lang && (
                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-3 py-1 text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Code2 className="size-3.5" />
                        {block.lang}
                      </span>
                    </div>
                  )}
                  <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
                    <code>{block.lines.join("\n")}</code>
                  </pre>
                </div>
              );
            }

            case "paragraph":
            default: {
              return (
                <p key={idx} className="text-[13.5px] leading-relaxed break-words">
                  {renderInlineText(block.text)}
                </p>
              );
            }
          }
        })}
      </div>
    </div>
  );
}
