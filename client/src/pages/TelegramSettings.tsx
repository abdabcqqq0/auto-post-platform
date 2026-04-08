import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useSite } from "@/contexts/SiteContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, CheckCircle, XCircle, Bot, MessageSquare, Info, Search, Copy } from "lucide-react";
import LoginGuard from "@/components/LoginGuard";

const TYPE_LABEL: Record<string, string> = {
  private: "私人對話",
  group: "群組",
  supergroup: "超級群組",
  channel: "頻道",
};

export default function TelegramSettingsPage() {
  const { currentSiteId } = useSite();
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [detectedChats, setDetectedChats] = useState<Array<{ chatId: string; type: string; title: string }>>([]);
  const [detectMessage, setDetectMessage] = useState<string>("");
  const initialized = useRef(false);

  const { data: settings, isLoading } = trpc.settings.getAll.useQuery({ siteId: currentSiteId });

  useEffect(() => {
    if (settings && !initialized.current) {
      initialized.current = true;
      setBotToken(settings.telegram_bot_token ?? "");
      setChatId(settings.telegram_chat_id ?? "");
    }
  }, [settings]);

  const utils = trpc.useUtils();

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.getAll.invalidate();
      toast.success("Telegram 設定已儲存");
    },
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const testMutation = trpc.settings.testTelegram.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (e) => {
      setTestResult({ success: false, message: e.message });
      toast.error(`測試失敗：${e.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      telegram_bot_token: botToken,
      telegram_chat_id: chatId,
      siteId: currentSiteId,
    });
  };

  const detectMutation = trpc.settings.getTelegramChatId.useMutation({
    onSuccess: (data) => {
      setDetectMessage(data.message);
      setDetectedChats(data.chats);
      if (!data.success) toast.error(data.message);
    },
    onError: (e) => {
      setDetectMessage(e.message);
      setDetectedChats([]);
      toast.error(`偵測失敗：${e.message}`);
    },
  });

  const handleTest = () => {
    setTestResult(null);
    testMutation.mutate({
      siteId: currentSiteId,
      botToken: botToken.includes("****") ? undefined : botToken,
      chatId,
    });
  };

  const handleDetect = () => {
    setDetectedChats([]);
    setDetectMessage("");
    detectMutation.mutate({
      siteId: currentSiteId,
      botToken: botToken.includes("****") ? undefined : botToken,
    });
  };

  const handleUseChatId = (id: string) => {
    setChatId(id);
    toast.success(`已填入 Chat ID：${id}`);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("已複製"));
  };

  const content = (
    <div className="space-y-6 max-w-2xl">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bot className="h-6 w-6 text-blue-500" />
          Telegram 通知設定
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          設定 Telegram Bot，文章發布成功或失敗時自動推送通知
        </p>
      </div>

      {/* 設定步驟說明 */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
              <p className="font-medium">設定步驟</p>
              <ol className="list-decimal list-inside space-y-1.5 text-blue-600 dark:text-blue-400">
                <li>
                  在 Telegram 搜尋 <strong>@BotFather</strong>，輸入 <code>/newbot</code> 建立新 Bot，取得 <strong>Bot Token</strong>（格式：<code>123456789:ABCdef...</code>）
                </li>
                <li>
                  <strong>取得 Chat ID 的方式（擇一）：</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li><strong>私人對話：</strong>直接與您的 Bot 私訊傳送 <code>/start</code></li>
                    <li><strong>群組：</strong>將 Bot 加入群組，然後在群組中傳任意訊息</li>
                    <li><strong>頻道：</strong>將 Bot 設為頻道管理員，然後在頻道發一則訊息</li>
                  </ul>
                </li>
                <li>填入 Bot Token 後，點擊「<strong>自動偵測 Chat ID</strong>」按鈕，系統會自動找出可用的 Chat ID</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bot Token */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Bot Token
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings?.telegram_bot_token_set && (
            <div className="text-xs text-muted-foreground">
              目前已設定：<span className="font-mono">{settings.telegram_bot_token}</span>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="bot-token">
              {settings?.telegram_bot_token_set ? "更換 Bot Token" : "Bot Token"}
            </Label>
            <Input
              id="bot-token"
              type="password"
              placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              格式：<code>數字:英數字串</code>，由 @BotFather 提供
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Chat ID 區塊 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat ID
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="chat-id">Chat ID</Label>
            <Input
              id="chat-id"
              placeholder="例：123456789 或 -1001234567890"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              個人聊天為正整數；群組/頻道通常以 <code>-100</code> 開頭
            </p>
          </div>

          {/* 自動偵測按鈕 */}
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDetect}
              disabled={detectMutation.isPending || !botToken}
              className="w-full sm:w-auto"
            >
              <Search className="h-4 w-4 mr-2" />
              {detectMutation.isPending ? "偵測中..." : "自動偵測 Chat ID"}
            </Button>

            {/* 偵測結果訊息 */}
            {detectMessage && detectedChats.length === 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300 break-all">{detectMessage}</p>
              </div>
            )}

            {/* 偵測到的 Chat 列表 */}
            {detectedChats.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">偵測到以下對話，點擊「使用」填入 Chat ID：</p>
                {detectedChats.map((chat) => (
                  <div
                    key={chat.chatId}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{chat.title}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {TYPE_LABEL[chat.type] ?? chat.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <code className="text-xs text-muted-foreground">{chat.chatId}</code>
                        <button
                          onClick={() => handleCopy(chat.chatId)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="複製 Chat ID"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={chatId === chat.chatId ? "default" : "outline"}
                      onClick={() => handleUseChatId(chat.chatId)}
                      className="shrink-0"
                    >
                      {chatId === chat.chatId ? "已選用" : "使用"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 常見錯誤排解 */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
            <div className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
              <p className="font-medium">常見錯誤：「chat not found」</p>
              <ul className="list-disc list-inside space-y-1 text-orange-600 dark:text-orange-400">
                <li>Chat ID 輸入錯誤（注意負號，頻道/群組 ID 通常為負數）</li>
                <li>Bot 尚未與該對話互動過（請先傳送訊息給 Bot）</li>
                <li>頻道 Bot 未設為管理員（需要有發送訊息的權限）</li>
                <li>使用了其他 Bot 的 Chat ID（每個 Bot Token 對應的 Chat ID 不同）</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 通知內容說明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">通知內容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">發布成功通知</p>
                <p className="text-green-600 dark:text-green-400 text-xs mt-0.5">
                  包含文章標題、WordPress 發布網址、發布時間
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-300">發布失敗通知</p>
                <p className="text-red-600 dark:text-red-400 text-xs mt-0.5">
                  包含文章標題、錯誤原因、發生時間
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 測試結果 */}
      {testResult && (
        <Card className={testResult.success
          ? "border-green-200 bg-green-50 dark:bg-green-950/20"
          : "border-red-200 bg-red-50 dark:bg-red-950/20"
        }>
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              {testResult.success
                ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                : <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              }
              <p className={`text-sm break-all ${testResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                {testResult.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作按鈕 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || isLoading}
          className="flex-1 sm:flex-none"
        >
          {updateMutation.isPending ? "儲存中..." : "儲存設定"}
        </Button>
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={testMutation.isPending || !chatId}
          className="flex-1 sm:flex-none"
        >
          <Send className="h-4 w-4 mr-2" />
          {testMutation.isPending ? "發送中..." : "發送測試通知"}
        </Button>
        {settings?.telegram_bot_token_set && settings?.telegram_chat_id && (
          <Badge variant="outline" className="self-center text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            已設定
          </Badge>
        )}
      </div>
    </div>
  );

  return <LoginGuard>{content}</LoginGuard>;
}
