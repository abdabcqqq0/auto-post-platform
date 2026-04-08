import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useSite } from "@/contexts/SiteContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  FileCode,
  Plus,
  Trash2,
  CheckCircle,
  History,
  Zap,
  RefreshCw,
  Edit2,
  ChevronRight,
} from "lucide-react";
import LoginGuard from "@/components/LoginGuard";

const DEFAULT_PROMPT = `請根據以下標題，撰寫一篇高品質的繁體中文文章。

標題：{{title}}

要求：
- 文章長度約 800～1200 字
- 使用清晰的段落結構，包含引言、主體（3～4 段）與結語
- 語氣專業但易讀，適合一般讀者
- 每個段落可加入小標題（使用 ## 格式）
- 內容豐富、有見解，避免空洞的陳述
- 請直接輸出文章內容，不需要額外說明`;

type Template = {
  id: number;
  name: string;
  content: string;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
};

type Version = {
  id: number;
  templateId: number;
  content: string;
  createdAt: Date;
};

export default function PromptTemplatePage() {
  const { currentSiteId } = useSite();
  const utils = trpc.useUtils();

  // 選中的模板 ID
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // 編輯中的內容（與資料庫解耦，避免自動 invalidate 覆蓋）
  const [editingContent, setEditingContent] = useState<string>("");
  const [editingName, setEditingName] = useState<string>("");
  const [isEditingName, setIsEditingName] = useState(false);

  // 新增模板 Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState(DEFAULT_PROMPT);

  // 刪除確認 Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // 版本歷史 Sheet
  const [historySheetOpen, setHistorySheetOpen] = useState(false);

  // 快速預覽測試
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewResult, setPreviewResult] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<"preview" | "code">("preview");

  // ── 資料查詢 ──────────────────────────────────────────────
  const { data: templates = [], isLoading } = trpc.promptTemplates.list.useQuery({ siteId: currentSiteId });

  useEffect(() => {
    if (templates.length > 0 && selectedId === null) {
      const active = templates.find((t: Template) => t.isActive === 1) ?? templates[0];
      setSelectedId(active.id);
      setEditingContent(active.content);
      setEditingName(active.name);
    }
  }, [templates, selectedId]);

  const selectedTemplate = templates.find((t: Template) => t.id === selectedId) ?? null;

  const { data: versions = [] } = trpc.promptTemplates.getVersions.useQuery(
    { templateId: selectedId! },
    { enabled: !!selectedId && historySheetOpen }
  );

  // ── Mutations ─────────────────────────────────────────────
  const createMutation = trpc.promptTemplates.create.useMutation({
    onSuccess: () => {
      utils.promptTemplates.list.invalidate();
      setCreateDialogOpen(false);
      setNewName("");
      setNewContent(DEFAULT_PROMPT);
      toast.success("模板已建立");
    },
    onError: (e) => toast.error(`建立失敗：${e.message}`),
  });

  const updateMutation = trpc.promptTemplates.update.useMutation({
    onSuccess: () => {
      utils.promptTemplates.list.invalidate();
      toast.success("模板已儲存");
      setIsEditingName(false);
    },
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const deleteMutation = trpc.promptTemplates.delete.useMutation({
    onSuccess: () => {
      utils.promptTemplates.list.invalidate();
      setDeleteDialogOpen(false);
      setSelectedId(null);
      setEditingContent("");
      setEditingName("");
      toast.success("模板已刪除");
    },
    onError: (e) => toast.error(`刪除失敗：${e.message}`),
  });

  const setActiveMutation = trpc.promptTemplates.setActive.useMutation({
    onSuccess: () => {
      utils.promptTemplates.list.invalidate();
      toast.success("已設為使用中模板");
    },
    onError: (e) => toast.error(`設定失敗：${e.message}`),
  });

  const restoreVersionMutation = trpc.promptTemplates.restoreVersion.useMutation({
    onSuccess: () => {
      utils.promptTemplates.list.invalidate();
      utils.promptTemplates.getVersions.invalidate();
      setHistorySheetOpen(false);
      toast.success("已還原至該版本");
    },
    onError: (e) => toast.error(`還原失敗：${e.message}`),
  });

  const previewMutation = trpc.promptTemplates.preview.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setPreviewResult(data.content);
        setPreviewOpen(true);
      } else {
        toast.error(`預覽失敗：${data.error ?? "未知錯誤"}`);
      }
    },
    onError: (e) => toast.error(`預覽失敗：${e.message}`),
  });

  // ── 事件處理 ──────────────────────────────────────────────
  const handleSelectTemplate = (t: Template) => {
    setSelectedId(t.id);
    setEditingContent(t.content);
    setEditingName(t.name);
    setIsEditingName(false);
  };

  const handleSave = () => {
    if (!selectedId) return;
    updateMutation.mutate({ id: selectedId, content: editingContent, name: editingName, siteId: currentSiteId });
  };

  const handleDelete = (id: number) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetId !== null) {
      deleteMutation.mutate({ id: deleteTargetId });
    }
  };

  const handlePreview = () => {
    if (!previewTitle.trim()) {
      toast.warning("請輸入測試標題");
      return;
    }
     previewMutation.mutate({ title: previewTitle, content: editingContent, siteId: currentSiteId });
  };

  const handleRestoreVersion = (v: Version) => {
    if (!selectedId) return;
    restoreVersionMutation.mutate({ templateId: selectedId, content: v.content });
    setEditingContent(v.content);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">載入中...</div>;
  }

  const content = (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileCode className="h-6 w-6 text-primary" />
            Prompt 模板
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理多組文章生成 Prompt，使用 <code className="bg-muted px-1 rounded text-xs">{"{{title}}"}</code> 作為標題佔位符
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          新增模板
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左欄：模板列表（縮窄） */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            模板列表（{templates.length} 組）
          </p>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
              尚無模板，請點「新增模板」建立第一組
            </div>
          ) : (
            templates.map((t: Template) => (
              <div
                key={t.id}
                onClick={() => handleSelectTemplate(t)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedId === t.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      selectedId === t.id ? "text-primary rotate-90" : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-sm font-medium truncate">{t.name}</span>
                  {t.isActive === 1 && (
                    <Badge variant="default" className="text-xs shrink-0">使用中</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(t.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* 右欄：編輯區（加寬） */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedTemplate ? (
            <div className="flex items-center justify-center h-48 border rounded-lg text-muted-foreground text-sm">
              請從左側選擇一個模板進行編輯
            </div>
          ) : (
            <>
              {/* 模板名稱 */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    {isEditingName ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 text-sm font-medium"
                        autoFocus
                        onBlur={() => setIsEditingName(false)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setIsEditingName(false);
                          if (e.key === "Escape") {
                            setEditingName(selectedTemplate.name);
                            setIsEditingName(false);
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-semibold text-base">{editingName}</span>
                        {selectedTemplate.isActive === 1 && (
                          <Badge variant="default" className="text-xs">使用中</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setIsEditingName(true)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-1 shrink-0">
                      {selectedTemplate.isActive !== 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveMutation.mutate({ id: selectedTemplate.id, siteId: currentSiteId })}
                          disabled={setActiveMutation.isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          設為使用中
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistorySheetOpen(true)}
                      >
                        <History className="h-3.5 w-3.5 mr-1" />
                        版本歷史
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Prompt 編輯區 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Prompt 內容</CardTitle>
                  <CardDescription className="text-xs">
                    使用 <code className="bg-muted px-1 rounded">{"{{title}}"}</code> 作為標題佔位符，儲存時自動記錄版本歷史
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={14}
                    className="font-mono text-sm resize-y"
                    placeholder="輸入 Prompt 模板..."
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{editingContent.length} 字元</span>
                    <Button onClick={handleSave} disabled={updateMutation.isPending} size="sm">
                      {updateMutation.isPending && <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      儲存模板
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 快速預覽測試 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    快速預覽測試
                  </CardTitle>
                  <CardDescription className="text-xs">
                    輸入一個標題，立即用此 Prompt 生成文章預覽（不會儲存）
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="輸入測試標題，例如：如何提升工作效率？"
                      value={previewTitle}
                      onChange={(e) => setPreviewTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePreview()}
                      className="text-sm"
                    />
                    <Button
                      onClick={handlePreview}
                      disabled={previewMutation.isPending}
                      size="sm"
                      className="shrink-0"
                    >
                      {previewMutation.isPending ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1 hidden sm:inline">
                        {previewMutation.isPending ? "生成中..." : "生成預覽"}
                      </span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* 新增模板 Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增 Prompt 模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">模板名稱</label>
              <Input
                placeholder="例如：SEO 文章、新聞稿、產品介紹"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prompt 內容</label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={12}
                className="font-mono text-sm resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button
              onClick={() => createMutation.mutate({ name: newName, content: newContent, siteId: currentSiteId })}
              disabled={!newName.trim() || !newContent.trim() || createMutation.isPending}
            >
              {createMutation.isPending && <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />}
              建立模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認 Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除此模板？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除後無法復原，該模板的所有版本歷史也會一併刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 版本歷史 Sheet */}
      <Sheet open={historySheetOpen} onOpenChange={setHistorySheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              版本歷史
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {(versions as Version[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                尚無版本歷史。儲存模板時系統會自動記錄變更。
              </p>
            ) : (
              (versions as Version[]).map((v: Version) => (
                <div key={v.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreVersion(v)}
                      disabled={restoreVersionMutation.isPending}
                    >
                      還原此版本
                    </Button>
                  </div>
                  <Separator />
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 font-mono">
                    {v.content}
                  </pre>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 預覽結果 Dialog */}
      <Dialog open={previewOpen} onOpenChange={(open) => { setPreviewOpen(open); if (!open) setPreviewTab("preview"); }}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">預覽結果：{previewTitle}</DialogTitle>
          {/* 標題列：左側標題 + 右側 tabs + 關閉按鈕 */}
          <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
            <h2 className="text-base font-semibold truncate pr-4">預覽結果：{previewTitle}</h2>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setPreviewTab("preview")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  previewTab === "preview"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                預覽
              </button>
              <button
                onClick={() => setPreviewTab("code")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  previewTab === "code"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                程式碼
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {previewTab === "preview" ? (
              <div
                className="prose prose-sm max-w-none p-4"
                dangerouslySetInnerHTML={{ __html: previewResult }}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed bg-muted/30 p-4 rounded-lg m-0">
                {previewResult}
              </pre>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 border-t px-6 py-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(previewResult);
              }}
            >
              複製內容
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>關閉</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  return <LoginGuard action="管理 Prompt 模板">{content}</LoginGuard>;
}
