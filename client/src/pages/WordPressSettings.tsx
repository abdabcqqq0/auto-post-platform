import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useSite } from "@/contexts/SiteContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle, XCircle, RefreshCw, Globe, Info } from "lucide-react";
import LoginGuard from "@/components/LoginGuard";

export default function WordPressSettingsPage() {
  const { currentSiteId } = useSite();
  const [wpUrl, setWpUrl] = useState("");
  const [wpUsername, setWpUsername] = useState("");
  const [wpPassword, setWpPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wpCategoryId, setWpCategoryId] = useState("");
  const [wpTags, setWpTags] = useState("");
  const [wpPublishStatus, setWpPublishStatus] = useState("publish");
  const [scheduleHour, setScheduleHour] = useState("12");
  const [scheduleMinute, setScheduleMinute] = useState("00");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [initialized, setInitialized] = useState(false);
  // 記錄最近一次儲存的密碼（遠蔽後），供連線測試使用
  const [savedPassword, setSavedPassword] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.settings.getAll.useQuery({ siteId: currentSiteId });

  // 只在第一次載入時同步設定值，避免儲存後 invalidate 覆蓋使用者的新輸入
  useEffect(() => {
    if (settings && !initialized) {
      setWpUrl(settings.wp_url || "");
      setWpUsername(settings.wp_username || "");
      setWpCategoryId(settings.wp_category_id || "");
      setWpTags(settings.wp_tags || "");
      setWpPublishStatus(settings.wp_publish_status || "publish");
      setScheduleHour(settings.schedule_hour || "12");
      setScheduleMinute(settings.schedule_minute || "00");
      setInitialized(true);
    }
  }, [settings, initialized]);

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.getAll.invalidate();
      toast.success("設定已儲存");
      // 儲存密碼到 savedPassword（供連線測試使用），再清空輸入框
      if (wpPassword && !wpPassword.includes("****")) {
        setSavedPassword(wpPassword);
      }
      setWpPassword(""); // 清空密碼輸入框
    },
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const testMutation = trpc.settings.testWordPress.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        toast.success("WordPress 連線成功");
      } else {
        toast.error("WordPress 連線失敗");
      }
    },
    onError: (e) => {
      setTestResult({ success: false, message: e.message });
      toast.error(`測試失敗：${e.message}`);
    },
  });

  const handleSave = () => {
    const updateData: Record<string, string> = {
      wp_url: wpUrl,
      wp_username: wpUsername,
      wp_category_id: wpCategoryId,
      wp_tags: wpTags,
      wp_publish_status: wpPublishStatus,
      schedule_hour: scheduleHour,
      schedule_minute: scheduleMinute,
    };
    if (wpPassword && !wpPassword.includes("****")) {
      updateData.wp_password = wpPassword;
    }
    updateMutation.mutate({ ...updateData, siteId: currentSiteId });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">載入中...</div>;
  }

  const content = (
    <div className="space-y-6 max-w-3xl">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          WordPress REST API 設定
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          設定 WordPress 網站連線資訊，系統將透過 REST API 自動發布文章
        </p>
      </div>

      {/* 說明卡片 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-medium">如何取得應用程式密碼？</p>
              <ol className="list-decimal list-inside space-y-0.5 text-xs">
                <li>登入 WordPress 後台</li>
                <li>前往「使用者」→「個人資料」</li>
                <li>滾動至「應用程式密碼」區塊</li>
                <li>輸入名稱（如「自動發文平台」）並點擊「新增應用程式密碼」</li>
                <li>複製產生的密碼（格式：xxxx xxxx xxxx xxxx xxxx xxxx）</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 連線設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">連線資訊</CardTitle>
          <CardDescription>WordPress 網站的基本連線設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wpUrl">WordPress 網站網址</Label>
            <Input
              id="wpUrl"
              type="url"
              placeholder="https://yourblog.com"
              value={wpUrl}
              onChange={(e) => setWpUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              請輸入網站根目錄網址，系統會自動附加 /wp-json/wp/v2/posts
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wpUsername">管理員帳號</Label>
            <Input
              id="wpUsername"
              placeholder="admin"
              value={wpUsername}
              onChange={(e) => setWpUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wpPassword">應用程式密碼</Label>
            <div className="relative">
              <Input
                id="wpPassword"
                type={showPassword ? "text" : "password"}
                placeholder={
                  settings?.wp_password_set
                    ? "已設定（輸入新值以更新）"
                    : "xxxx xxxx xxxx xxxx xxxx xxxx"
                }
                value={wpPassword}
                onChange={(e) => setWpPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {settings?.wp_password_set && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                目前已設定：{settings.wp_password}
              </p>
            )}
          </div>

          {/* 連線測試 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setTestResult(null);
                // 將目前表單輸入的帳號/密碼/網址一並傳給後端，优先使用新値
                // 密碼優先順序：1) 輸入框新密碼 2) 儲存後的 savedPassword 3) 後端資料庫舊値
                const passwordToTest = (wpPassword && !wpPassword.includes("****"))
                  ? wpPassword
                  : (savedPassword || undefined);
                testMutation.mutate({
                  siteId: currentSiteId,
                  wpUrl: wpUrl || undefined,
                  wpUsername: wpUsername || undefined,
                  wpPassword: passwordToTest,
                });
              }}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Globe className="h-4 w-4 mr-2" />
              )}
              {testMutation.isPending ? "測試中..." : "連線測試"}
            </Button>
            {testResult && (
              <div
                className={`flex items-start gap-2 text-sm ${
                  testResult.success ? "text-green-600" : "text-red-600"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span className="break-all">{testResult.message}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 發布設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">發布設定</CardTitle>
          <CardDescription>設定文章發布的分類、標籤與狀態</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wpCategoryId">分類 ID（選填）</Label>
            <Input
              id="wpCategoryId"
              placeholder="1"
              value={wpCategoryId}
              onChange={(e) => setWpCategoryId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              WordPress 分類的數字 ID。可在 WordPress 後台「文章」→「分類目錄」中查看 ID。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wpTags">標籤 ID（選填，多個以逗號分隔）</Label>
            <Input
              id="wpTags"
              placeholder="1,2,3"
              value={wpTags}
              onChange={(e) => setWpTags(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              WordPress 標籤的數字 ID，多個標籤以逗號分隔。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wpPublishStatus">發布狀態</Label>
            <Select value={wpPublishStatus} onValueChange={setWpPublishStatus}>
              <SelectTrigger id="wpPublishStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="publish">立即發布（publish）</SelectItem>
                <SelectItem value="draft">儲存為草稿（draft）</SelectItem>
                <SelectItem value="pending">待審核（pending）</SelectItem>
                <SelectItem value="private">私人（private）</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              建議先設為「草稿」進行測試，確認無誤後再改為「立即發布」。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 排程時間設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">自動排程時間</CardTitle>
          <CardDescription>設定每天自動生成並發布文章的時間</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2 w-28">
              <Label>小時</Label>
              <Select value={scheduleHour} onValueChange={setScheduleHour}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                    <SelectItem key={h} value={h}>{h} 時</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-28">
              <Label>分鐘</Label>
              <Select value={scheduleMinute} onValueChange={setScheduleMinute}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                    <SelectItem key={m} value={m}>{m} 分</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground pb-2">
              每天 {scheduleHour}:{scheduleMinute} 自動執行
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            儲存後，排程將在下一個指定時間點自動生成並發布文章。時區為台灣時間（GMT+8）。
          </p>
        </CardContent>
      </Card>

      {/* 儲存按鈕 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          儲存設定
        </Button>
      </div>
    </div>
  );

  return <LoginGuard action="儲存 WordPress 設定">{content}</LoginGuard>;
}
