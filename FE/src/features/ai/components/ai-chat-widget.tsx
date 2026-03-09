import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { aiChat } from "@/shared/api";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export function AiChatWidget() {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      const reply = await aiChat(message);
      return reply;
    },
    onSuccess: (reply) => {
      setMessages((prev) => [...prev, { id: Date.now(), role: "assistant", content: reply }]);
    },
  });

  if (!isAdmin) return null;

  const handleSend = () => {
    const text = input.trim();
    if (!text || mutation.isPending) return;
    const id = Date.now();
    setMessages((prev) => [...prev, { id, role: "user", content: text }]);
    setInput("");
    mutation.mutate(text);
  };

  return (
    <>
      {/* Floating button - xanh biển nhạt */}
      {!open && (
        <button
          type="button"
          className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-sky-400 text-white shadow-lg hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant"
        >
          <MessageCircle className="size-6" />
        </button>
      )}

      {/* Chat panel - nền đặc, đổ bóng */}
      {open && (
        <div
          className="fixed bottom-4 right-4 z-40 flex w-80 max-w-[90vw] flex-col rounded-xl border border-border bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:bg-gray-950 dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
          style={{ minHeight: "320px", maxHeight: "85vh" }}
        >
          {/* Header - xanh biển chủ đạo */}
          <div className="flex items-center justify-between rounded-t-xl border-b border-sky-700/30 bg-sky-600 px-3 py-2.5 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircle className="size-4 shrink-0" />
              <span>TaskMate Assistant</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-white hover:bg-white/20 hover:text-white"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          {/* Nội dung chat - bong bóng */}
          <div className="flex-1 max-h-72 overflow-y-auto bg-gray-50/80 px-3 py-3 dark:bg-gray-900/50">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Hỏi tôi về tasks/dự án, ví dụ: &quot;Những task đang in progress của dự án
                Website?&quot;
              </p>
            )}
            <div className="space-y-2.5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-sky-600 text-white"
                        : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {mutation.isPending && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl bg-gray-200 px-3 py-2 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    Đang suy nghĩ...
                  </div>
                </div>
              )}
              {mutation.isError && (
                <div className="flex justify-start">
                  <p className="max-w-[85%] rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {(mutation.error as Error).message}
                  </p>
                </div>
              )}
            </div>
          </div>
          {/* Khu vực nhập - viền rõ, nút Gửi nổi bật với icon máy bay */}
          <div className="rounded-b-xl border-t border-border bg-white p-3 dark:bg-gray-950">
            <Textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi..."
              className="min-h-[60px] resize-none border-2 border-input text-sm focus-visible:ring-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                className="gap-2 bg-sky-600 font-medium text-white shadow-md hover:bg-sky-700"
                onClick={handleSend}
                disabled={mutation.isPending || !input.trim()}
              >
                <Send className="size-4" aria-hidden />
                Gửi
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

