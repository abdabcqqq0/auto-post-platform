import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { LogIn, ShieldAlert } from "lucide-react";

interface LoginGuardProps {
  /** 需要登入才能執行的動作名稱，例如「儲存設定」 */
  action?: string;
  /** 若已登入，渲染子元件；若未登入，渲染提示 */
  children: React.ReactNode;
  /** 使用 inline 模式（橫幅），預設為 inline */
  mode?: "banner" | "block";
}

/**
 * 包裹需要登入才能操作的區塊。
 * - 已登入：直接渲染 children
 * - 未登入：顯示提示橫幅 + 登入按鈕
 */
export default function LoginGuard({ action = "執行此操作", children, mode = "banner" }: LoginGuardProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <>{children}</>;

  if (!isAuthenticated) {
    if (mode === "block") {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <ShieldAlert className="h-12 w-12 text-muted-foreground/40" />
          <div className="text-center">
            <p className="font-semibold text-foreground">需要登入</p>
            <p className="text-sm text-muted-foreground mt-1">
              請先登入 Manus 帳號才能{action}
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
          >
            <LogIn className="h-4 w-4 mr-2" />
            立即登入
          </Button>
        </div>
      );
    }

    // banner 模式：在頁面頂部顯示提示橫幅，但仍渲染子元件（唯讀狀態）
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              需要登入才能{action}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              目前為訪客模式，所有儲存與執行操作皆已停用
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
          >
            <LogIn className="h-3.5 w-3.5 mr-1.5" />
            登入
          </Button>
        </div>
        {/* 未登入時，子元件仍顯示但按鈕會被 disabled */}
        <div className="pointer-events-none opacity-60 select-none">
          {children}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
