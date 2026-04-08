import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useSite } from "@/contexts/SiteContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Trash2, Bot, User, MessageSquare, Lightbulb, Copy } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Streamdown } from "streamdown";

const EXAMPLE_PROMPTS = [
  "我希望文章語氣輕鬆活潑，像朋友聊天一樣，避免太正式的用詞",
  "每篇文章請加入實際案例或數據，讓內容更有說服力",
  "文章結尾要有行動呼籲（Call to Action），鼓勵讀者留言或分享",
  "我的部落格主題是科技與生活，文章要讓非技術背景的讀者也能看懂",
  "請在每篇文章加入 3～5 個小標題，方便讀者快速瀏覽",
];

export default function ChatPage() {
  const { currentSiteId } = useSite();
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; isNew?: boolean }>
  >([]);
  const [isSending, setIsSending] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: history = [], isLoading } = trpc.chat.history.useQuery({ siteId: currentSiteId });

  // 初始化時將歷史記錄載入 localMessages
  useEffect(() => {
    if (history.length > 0 && localMessages.length === 0) {
      setLocalMessages(
        history
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      );
    }
  }, [history]);

  // 自動捲動到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      setLocalMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, isNew: true },
      ]);
      setIsSending(false);
    },
    onError: (e) => {
      toast.error(`傳送失敗：${e.message}`);
      setIsSending(false);
      // 移除最後一條使用者訊息（失敗時回滾）
      setLocalMessages((prev) => prev.slice(0, -1));
    },
  });

  const clearMutation = trpc.chat.clear.useMutation({
    onSuccess: () => {
      setLocalMessages([]);
      utils.chat.history.invalidate();
      toast.success("對話記憶已清除");
    },
    onError: (e) => toast.error(`清除失敗：${e.message}`),
  });

  const createTemplateMutation = trpc.promptTemplates.create.useMutation({
    onSuccess: () => {
      setSaveDialogOpen(false);
      setTemplateName("");
      toast.success("已成功複製到 Prompt 模板");
    },
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) return;
    // 將對話記憶組合成 Prompt 模板內容
    const conversationSummary = localMessages
      .map((m) => `${m.role === "user" ? "用戶指導" : "AI 理解"}: ${m.content}`)
      .join("\n\n");
    const templateContent = `你是一個專業的文章寫手。以下是用戶對文章風格的指導：\n\n${conversationSummary}\n\n請根據以上風格指導，為以下標題撰寫一篇完整的 HTML 格式文章：\n\n{{title}}`;
    createTemplateMutation.mutate({
      siteId: currentSiteId,
      name: templateName.trim(),
      content: templateContent,
    });
  };

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || isSending) return;
    setInput("");
    setIsSending(true);
    setLocalMessages((prev) => [...prev, { role: "user", content: msg }]);
    sendMutation.mutate({ message: msg, siteId: currentSiteId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExamplePrompt = (prompt: string) => {
    setInput(prompt);
  };

  const displayMessages = localMessages.filter((m) => m.role !== "system" as string);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] max-h-[900px]">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Gemini 對話教育
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            與 Gemini 對話，教導它你想要的文章風格。對話記憶會自動應用到之後的文章生成中。
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {/* 複製到 Prompt 模板 */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={localMessages.length === 0}
                className="shrink-0"
              >
                <Copy className="h-4 w-4 mr-2" />
                複製到模板
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>複製對話記憶到 Prompt 模板</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  將目前的對話記憶儲存為新的 Prompt 模板，可在標題排程中選擇使用。
                </p>
                <Input
                  placeholder="輸入模板名稱，例如「輕鬆風格」"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveAsTemplate()}
                />
                <Button
                  onClick={handleSaveAsTemplate}
                  disabled={!templateName.trim() || createTemplateMutation.isPending}
                  className="w-full"
                >
                  {createTemplateMutation.isPending ? "儲存中..." : "儲存為模板"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive shrink-0">
              <Trash2 className="h-4 w-4 mr-2" />
              清除記憶
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確認清除對話記憶</AlertDialogTitle>
              <AlertDialogDescription>
                清除後，Gemini 將不再記得你的寫作風格指引。之後生成的文章將回到預設風格。確定要繼續嗎？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clearMutation.mutate({ siteId: currentSiteId })}
                className="bg-destructive hover:bg-destructive/90"
              >
                確認清除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>

      {/* 範例提示 */}
      {displayMessages.length === 0 && !isLoading && (
        <Card className="mb-4 shrink-0 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-primary">範例指引（點擊快速輸入）</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleExamplePrompt(prompt)}
                  className="text-xs bg-background border rounded-full px-3 py-1.5 hover:bg-primary/10 hover:border-primary/50 transition-colors text-left"
                >
                  {prompt.length > 40 ? prompt.slice(0, 40) + "..." : prompt}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 對話區域 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden border rounded-xl bg-muted/20 p-4 space-y-4 min-h-0">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">載入對話記憶中...</div>
        ) : displayMessages.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">開始與 Gemini 對話</p>
            <p className="text-xs text-muted-foreground mt-1">
              告訴 Gemini 你希望文章的風格、語氣、長度等要求
            </p>
          </div>
        ) : (
          displayMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* 頭像 */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted border"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4 text-primary" />
                )}
              </div>

              {/* 訊息氣泡 */}
              <div
                className={`max-w-[80%] min-w-0 rounded-2xl px-4 py-3 text-sm break-words overflow-hidden ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-background border rounded-tl-sm shadow-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-full overflow-x-auto">
                    <Streamdown>{msg.content}</Streamdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-all">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}

        {/* 等待回應動畫 */}
        {isSending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted border flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-background border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-5">
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 輸入區域 */}
      <div className="mt-3 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder="告訴 Gemini 你想要的文章風格...（Enter 送出，Shift+Enter 換行）"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="flex-1 resize-none text-sm"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            size="icon"
            className="h-[72px] w-12 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          💡 對話記憶會自動整合到文章生成的 Prompt 中，讓 Gemini 記住你的偏好
        </p>
      </div>
    </div>
  );
}
