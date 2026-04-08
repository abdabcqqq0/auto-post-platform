import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSite } from "@/contexts/SiteContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ListPlus, RefreshCw, FileText, Upload, GripVertical, BookTemplate } from "lucide-react";
import LoginGuard from "@/components/LoginGuard";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useIsMobile } from "@/hooks/useMobile";

// dnd-kit
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TitleStatus = "pending" | "running" | "completed" | "failed";

const statusConfig: Record<TitleStatus, { label: string; className: string }> = {
  pending: { label: "待執行", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  running: { label: "執行中", className: "bg-blue-100 text-blue-800 border-blue-200" },
  completed: { label: "已完成", className: "bg-green-100 text-green-800 border-green-200" },
  failed: { label: "失敗", className: "bg-red-100 text-red-800 border-red-200" },
};

// ─── 可拖曳的單行元件 ────────────────────────────────────────────────────────
type TitleItem = {
  id: number;
  title: string;
  status: string;
  sortOrder: number;
  promptTemplateId: number | null;
  scheduledDate: Date | null;
  createdAt: Date;
};

function SortableTitleRow({
  title,
  index,
  isMobile,
  isTriggering,
  isGenerating,
  promptTemplates,
  onGenerateOnly,
  onTrigger,
  onDelete,
  onChangeTemplate,
}: {
  title: TitleItem;
  index: number;
  isMobile: boolean;
  isTriggering: boolean;
  isGenerating: boolean;
  promptTemplates: { id: number; name: string; isActive: number }[];
  onGenerateOnly: (id: number) => void;
  onTrigger: (id: number) => void;
  onDelete: (id: number) => void;
  onChangeTemplate: (titleId: number, templateId: number | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: title.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const status = title.status as TitleStatus;
  const cfg = statusConfig[status];
  const isBusy = isTriggering || isGenerating || title.status === "running";

  const templateSelector = (
    <Select
      value={title.promptTemplateId ? String(title.promptTemplateId) : "default"}
      onValueChange={(v) => onChangeTemplate(title.id, v === "default" ? null : Number(v))}
    >
      <SelectTrigger className="h-7 text-xs w-[120px] sm:w-[140px]">
        <SelectValue placeholder="使用中模板" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="default">使用中模板</SelectItem>
        {promptTemplates.map((t) => (
          <SelectItem key={t.id} value={String(t.id)}>
            {t.name}{t.isActive ? " ✓" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const actionButtons = (
    <>
      {templateSelector}
      {/* 僅生成 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onGenerateOnly(title.id)}
            disabled={isBusy}
            className="h-8 border-blue-300 text-blue-600 hover:bg-blue-50 shrink-0"
          >
            {isGenerating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5 text-xs hidden sm:inline">
              {isGenerating ? "生成中" : "僅生成"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>生成文章但不發布到 WordPress</TooltipContent>
      </Tooltip>

      {/* 生成並發布 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="default"
            onClick={() => onTrigger(title.id)}
            disabled={isBusy}
            className="h-8 shrink-0"
          >
            {isTriggering ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5 text-xs hidden sm:inline">
              {isTriggering ? "執行中" : "生成並發布"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>生成文章並立即發布到 WordPress</TooltipContent>
      </Tooltip>

      {/* 刪除 */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-destructive hover:text-destructive shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除標題「{title.title}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(title.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="hover:bg-muted/30 transition-colors border-b last:border-b-0"
    >
      {isMobile ? (
        /* ── 手機版：兩行佈局 ── */
        <div className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-center gap-3">
            {/* 拖曳把手 */}
            <button
              {...attributes}
              {...listeners}
              className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-muted text-muted-foreground"
              aria-label="拖曳排序"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground w-5 text-center shrink-0">{index + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{title.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                新增於 {format(new Date(title.createdAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}
              </p>
            </div>
            <Badge className={`text-xs shrink-0 ${cfg.className}`} variant="outline">
              {cfg.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 pl-10">{actionButtons}</div>
        </div>
      ) : (
        /* ── 桌機版：單行佈局，按鈕在右側 ── */
        <div className="flex items-center gap-3 px-4 py-3">
          {/* 拖曳把手 */}
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-muted text-muted-foreground"
            aria-label="拖曳排序"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground w-5 text-center shrink-0">{index + 1}</span>
          {/* 標題資訊 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{title.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              新增於 {format(new Date(title.createdAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}
            </p>
          </div>
          {/* 狀態 */}
          <Badge className={`text-xs shrink-0 ${cfg.className}`} variant="outline">
            {cfg.label}
          </Badge>
          {/* 操作按鈕（右側） */}
          <div className="flex items-center gap-1.5 shrink-0">{actionButtons}</div>
        </div>
      )}
    </div>
  );
}

// ─── 主頁面 ─────────────────────────────────────────────────────────────────
export default function TitlesPage() {
  const [newTitle, setNewTitle] = useState("");
  const [bulkTitles, setBulkTitles] = useState("");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [triggeringId, setTriggeringId] = useState<number | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | TitleStatus>("all");
  const isMobile = useIsMobile();

  const { currentSiteId } = useSite();
  const utils = trpc.useUtils();
  const { data: titles = [], isLoading } = trpc.titles.list.useQuery({ siteId: currentSiteId });
  const { data: settings } = trpc.settings.getAll.useQuery({ siteId: currentSiteId });
  const { data: promptTemplatesList = [] } = trpc.promptTemplates.list.useQuery({ siteId: currentSiteId });

  const updateTemplateMutation = trpc.titles.update.useMutation({
    onSuccess: () => {
      utils.titles.list.invalidate();
      toast.success("已更新 Prompt 模板");
    },
    onError: (e) => toast.error(`更新失敗：${e.message}`),
  });

  const scheduleHour = settings?.schedule_hour ?? "12";
  const scheduleMinute = settings?.schedule_minute ?? "00";
  const scheduleTimeDisplay = `${scheduleHour.padStart(2, "0")}:${scheduleMinute.padStart(2, "0")}`;

  // dnd-kit sensors：支援滑鼠和觸控
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const createMutation = trpc.titles.create.useMutation({
    onSuccess: () => {
      setNewTitle("");
      utils.titles.list.invalidate();
      toast.success("標題已新增");
    },
    onError: (e) => toast.error(`新增失敗：${e.message}`),
  });

  const bulkCreateMutation = trpc.titles.bulkCreate.useMutation({
    onSuccess: (data) => {
      setBulkTitles("");
      setBulkDialogOpen(false);
      utils.titles.list.invalidate();
      toast.success(`成功新增 ${data.count} 個標題`);
    },
    onError: (e) => toast.error(`批量新增失敗：${e.message}`),
  });

  const deleteMutation = trpc.titles.delete.useMutation({
    onSuccess: () => {
      utils.titles.list.invalidate();
      toast.success("標題已刪除");
    },
    onError: (e) => toast.error(`刪除失敗：${e.message}`),
  });

  const reorderMutation = trpc.titles.reorder.useMutation({
    onSuccess: () => utils.titles.list.invalidate(),
    onError: () => utils.titles.list.invalidate(), // 失敗時回滾
  });

  const triggerMutation = trpc.titles.trigger.useMutation({
    onSuccess: (data) => {
      setTriggeringId(null);
      utils.titles.list.invalidate();
      utils.articles.list.invalidate();
      utils.logs.list.invalidate();
      if (data.success) toast.success(data.message);
      else toast.error(data.message);
    },
    onError: (e) => {
      setTriggeringId(null);
      toast.error(`執行失敗：${e.message}`);
    },
  });

  const generateOnlyMutation = trpc.titles.generateOnly.useMutation({
    onSuccess: (data) => {
      setGeneratingId(null);
      utils.titles.list.invalidate();
      utils.articles.list.invalidate();
      utils.logs.list.invalidate();
      if (data.success) toast.success(data.message);
      else toast.error(data.message);
    },
    onError: (e) => {
      setGeneratingId(null);
      toast.error(`生成失敗：${e.message}`);
    },
  });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({ title: newTitle.trim(), siteId: currentSiteId });
  };

  const handleBulkAdd = () => {
    const lines = bulkTitles.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    bulkCreateMutation.mutate({ titles: lines, siteId: currentSiteId });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = titles.findIndex((t) => t.id === active.id);
    const newIndex = titles.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // 樂觀更新：先更新本地快取
    const newOrder = arrayMove([...titles], oldIndex, newIndex);
    utils.titles.list.setData({ siteId: currentSiteId }, newOrder);

    // 送出後端
    reorderMutation.mutate(newOrder.map((t, i) => ({ id: t.id, sortOrder: i })));
  };

  const pendingCount = titles.filter((t) => t.status === "pending").length;
  const completedCount = titles.filter((t) => t.status === "completed").length;
  const failedCount = titles.filter((t) => t.status === "failed").length;

  // 狀態篩選
  const filteredTitles = statusFilter === "all"
    ? titles
    : titles.filter((t) => t.status === statusFilter);

  const filterTabs: { key: "all" | TitleStatus; label: string; count: number }[] = [
    { key: "all", label: "全部", count: titles.length },
    { key: "pending", label: "待執行", count: pendingCount },
    { key: "completed", label: "已完成", count: completedCount },
    { key: "failed", label: "失敗", count: failedCount },
  ];

  const content = (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">標題排程管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          管理待發布的文章標題，系統每天 {scheduleTimeDisplay} 自動取出第一個「待執行」標題生成文章
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-sm text-muted-foreground">待執行</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <div className="text-sm text-muted-foreground">已完成</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
            <div className="text-sm text-muted-foreground">失敗</div>
          </CardContent>
        </Card>
      </div>

      {/* 新增標題 + 批量新增 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">新增標題</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 單筆新增 */}
          <div className="flex gap-2">
            <Input
              placeholder="輸入文章標題..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={createMutation.isPending || !newTitle.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              新增
            </Button>
          </div>
          {/* 批量新增區塊 */}
          <div className="border-t pt-3">
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <ListPlus className="h-4 w-4 mr-2" />
                  批量新增標題
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>批量新增標題</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">每行輸入一個標題，最多可輸入 30 個</p>
                  <Textarea
                    placeholder={"標題一\n標題二\n標題三"}
                    value={bulkTitles}
                    onChange={(e) => setBulkTitles(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      已輸入 {bulkTitles.split("\n").filter((l) => l.trim()).length} 個標題
                    </span>
                    <Button onClick={handleBulkAdd} disabled={bulkCreateMutation.isPending}>
                      {bulkCreateMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      新增
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* 按鈕說明 */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span><strong>僅生成</strong>：只呼叫 Gemini 生成文章，不發布到 WordPress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Upload className="h-3.5 w-3.5 text-primary shrink-0" />
          <span><strong>生成並發布</strong>：生成文章後立即發布到 WordPress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span>拖曳左側把手可調整排序</span>
        </div>
      </div>

      {/* 標題列表 */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-base">標題列表（共 {titles.length} 個）</CardTitle>
          </div>
          {/* 狀態篩選 tabs */}
          <div className="flex gap-1 mt-3 border-b pb-0 -mx-6 px-6 overflow-x-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                  statusFilter === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  statusFilter === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">載入中...</div>
          ) : filteredTitles.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {statusFilter === "all" ? "尚無標題，請新增第一個標題" : `無「${filterTabs.find(t => t.key === statusFilter)?.label}」狀態的標題`}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredTitles.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div>
                  {filteredTitles.map((title, index) => (
                    <SortableTitleRow
                      key={title.id}
                      title={title as TitleItem}
                      index={index}
                      isMobile={isMobile}
                      isTriggering={triggeringId === title.id}
                      isGenerating={generatingId === title.id}
                      promptTemplates={promptTemplatesList}
                      onGenerateOnly={(id) => { setGeneratingId(id); generateOnlyMutation.mutate({ id, siteId: currentSiteId }); }}
                      onTrigger={(id) => { setTriggeringId(id); triggerMutation.mutate({ id, siteId: currentSiteId }); }}
                      onDelete={(id) => deleteMutation.mutate({ id })}
                      onChangeTemplate={(titleId, templateId) => updateTemplateMutation.mutate({ id: titleId, promptTemplateId: templateId })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return <LoginGuard action="新增或執行標題">{content}</LoginGuard>;
}
