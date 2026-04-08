import { trpc } from "@/lib/trpc";
import { useSite } from "@/contexts/SiteContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { Trash2, RefreshCw, CheckCircle, XCircle, Info, ScrollText, User, Bot } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

type LogStatus = "success" | "failed" | "info";

const statusConfig: Record<LogStatus, { label: string; icon: React.ReactNode; className: string }> = {
  success: {
    label: "成功",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    className: "bg-green-100 text-green-800 border-green-200",
  },
  failed: {
    label: "失敗",
    icon: <XCircle className="h-3.5 w-3.5" />,
    className: "bg-red-100 text-red-800 border-red-200",
  },
  info: {
    label: "資訊",
    icon: <Info className="h-3.5 w-3.5" />,
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

const actionLabels: Record<string, string> = {
  auto_post: "自動發文",
  auto_post_start: "開始發文",
  gemini_generate: "Gemini 生成",
  wp_publish: "WordPress 發布",
  wp_republish: "重新發布",
  generate_only_start: "開始生成",
  generate_only: "僅生成文章",
  手動編輯文章: "手動編輯",
  刪除文章: "刪除文章",
};

export default function LogsPage() {
  const { currentSiteId } = useSite();
  const utils = trpc.useUtils();
  const { data: logs = [], isLoading, refetch } = trpc.logs.list.useQuery({ limit: 200, siteId: currentSiteId });

  const clearMutation = trpc.logs.clear.useMutation({
    onSuccess: () => {
      utils.logs.list.invalidate();
      toast.success("日誌已清除");
    },
    onError: (e) => toast.error(`清除失敗：${e.message}`),
  });

  const successCount = logs.filter((l) => l.status === "success").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-primary" />
            執行日誌
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            記錄每次排程執行的詳細狀態、操作者與錯誤資訊
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            重新整理
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                清除日誌
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>確認清除所有日誌</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作將刪除所有執行日誌記錄，且無法復原。確定要繼續嗎？
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

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-foreground">{logs.length}</div>
            <div className="text-sm text-muted-foreground">總記錄數</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{successCount}</div>
            <div className="text-sm text-muted-foreground">成功</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
            <div className="text-sm text-muted-foreground">失敗</div>
          </CardContent>
        </Card>
      </div>

      {/* 日誌列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">日誌記錄（最近 200 筆）</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">載入中...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <ScrollText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">尚無日誌記錄</p>
              <p className="text-xs text-muted-foreground mt-1">
                執行排程或手動觸發後，日誌將顯示於此
              </p>
            </div>
          ) : (
            <div className="divide-y font-mono text-xs">
              {logs.map((log) => {
                const status = log.status as LogStatus;
                const cfg = statusConfig[status];
                const actionLabel = actionLabels[log.action] ?? log.action;
                const operator = (log as unknown as { operator?: string }).operator ?? "系統";
                const isSystemOp = operator === "系統";

                return (
                  <div
                    key={log.id}
                    className={`px-4 py-3 hover:bg-muted/20 transition-colors ${
                      status === "failed" ? "bg-red-50/50" : ""
                    }`}
                  >
                    {/* 第一行：時間 + 狀態 + 動作 + 操作者 */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                      <span className="text-muted-foreground">
                        {format(new Date(log.createdAt), "MM/dd HH:mm:ss", { locale: zhTW })}
                      </span>

                      <Badge
                        className={`text-xs flex items-center gap-1 ${cfg.className}`}
                        variant="outline"
                      >
                        {cfg.icon}
                        {cfg.label}
                      </Badge>

                      <span className="text-muted-foreground">{actionLabel}</span>

                      <div className={`flex items-center gap-1 ${
                        isSystemOp ? "text-muted-foreground" : "text-blue-600"
                      }`}>
                        {isSystemOp ? (
                          <Bot className="h-3 w-3 shrink-0" />
                        ) : (
                          <User className="h-3 w-3 shrink-0" />
                        )}
                        <span>{operator}</span>
                      </div>
                    </div>

                    {/* 第二行：訊息內容 */}
                    <div className="pl-0">
                      {log.message && (
                        <p className="text-foreground break-all">{log.message}</p>
                      )}
                      {log.errorMessage && (
                        <p className="text-red-600 mt-0.5 break-all">
                          ❌ {log.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
