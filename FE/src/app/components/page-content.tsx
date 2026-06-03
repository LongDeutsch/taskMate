import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type PageContentProps = {
  children: ReactNode;
  className?: string;
};

/** Wrapper chung cho nội dung trang — tránh tràn ngang trên mobile. */
export function PageContent({ children, className }: PageContentProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  );
}
