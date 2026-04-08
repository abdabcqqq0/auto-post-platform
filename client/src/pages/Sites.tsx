import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Building2, Plus, Pencil, Trash2, Globe, GripVertical } from "lucide-react";
import { useSite } from "@/contexts/SiteContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Site = {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
};

function SortableSiteRow({
  site,
  isActive,
  onSwitch,
  onEdit,
  onDelete,
  canDelete,
}: {
  site: Site;
  isActive: boolean;
  onSwitch: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: site.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
        isActive
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-card hover:bg-muted/40"
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      {/* 拖移把手 */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 touch-none"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* 站點圖示 */}
      <div
        className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${
          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        <Building2 className="h-3.5 w-3.5" />
      </div>

      {/* 站點名稱 + 描述 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{site.name}</span>
          {isActive && (
            <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
              目前
            </span>
          )}
        </div>
        {site.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{site.description}</p>
        )}
      </div>

      {/* 操作按鈕 */}
      <div className="flex items-center gap-1 shrink-0">
        {!isActive && (
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={onSwitch}>
            切換
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>確認刪除站點</AlertDialogTitle>
                <AlertDialogDescription>
                  刪除「{site.name}」站點後，該站點的所有標題、文章、設定和 Prompt 模板都將一併刪除，且無法復原。確定要繼續嗎？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  確認刪除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

export default function SitesPage() {
  const { currentSiteId, setCurrentSiteId } = useSite();
  const utils = trpc.useUtils();

  const { data: sites = [], isLoading } = trpc.sites.list.useQuery();
  const [localOrder, setLocalOrder] = useState<number[] | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editSite, setEditSite] = useState<{ id: number; name: string; description: string } | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const createMutation = trpc.sites.create.useMutation({
    onSuccess: () => {
      utils.sites.list.invalidate();
      setLocalOrder(null);
      setCreateOpen(false);
      setFormName("");
      setFormDescription("");
      toast.success("站點已建立");
    },
    onError: (e) => toast.error(`建立失敗：${e.message}`),
  });

  const updateMutation = trpc.sites.update.useMutation({
    onSuccess: () => {
      utils.sites.list.invalidate();
      setEditSite(null);
      toast.success("站點已更新");
    },
    onError: (e) => toast.error(`更新失敗：${e.message}`),
  });

  const deleteMutation = trpc.sites.delete.useMutation({
    onSuccess: (_, variables) => {
      utils.sites.list.invalidate();
      setLocalOrder(null);
      if (variables.id === currentSiteId) {
        const remaining = sites.filter(s => s.id !== variables.id);
        if (remaining.length > 0) setCurrentSiteId(remaining[0].id);
      }
      toast.success("站點已刪除");
    },
    onError: (e) => toast.error(`刪除失敗：${e.message}`),
  });

  const reorderMutation = trpc.sites.reorder.useMutation({
    onError: (e) => {
      toast.error(`排序失敗：${e.message}`);
      setLocalOrder(null);
      utils.sites.list.invalidate();
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 使用本地排序或伺服器資料
  const orderedSites = localOrder
    ? localOrder.map(id => sites.find(s => s.id === id)).filter(Boolean) as Site[]
    : sites;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentIds = orderedSites.map(s => s.id);
    const oldIndex = currentIds.indexOf(active.id as number);
    const newIndex = currentIds.indexOf(over.id as number);
    const newOrder = arrayMove(currentIds, oldIndex, newIndex);

    setLocalOrder(newOrder);
    reorderMutation.mutate({ orderedIds: newOrder });
  };

  const handleCreate = () => {
    if (!formName.trim()) return;
    createMutation.mutate({ name: formName.trim(), description: formDescription.trim() });
  };

  const handleUpdate = () => {
    if (!editSite || !formName.trim()) return;
    updateMutation.mutate({ id: editSite.id, name: formName.trim(), description: formDescription.trim() });
  };

  const openEdit = (site: Site) => {
    setEditSite({ id: site.id, name: site.name, description: site.description ?? "" });
    setFormName(site.name);
    setFormDescription(site.description ?? "");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            站點管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理不同產業的發文站點，每個站點有獨立的設定、標題和文章
          </p>
        </div>
        <Button onClick={() => { setFormName(""); setFormDescription(""); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          新增站點
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : sites.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">尚無站點</p>
            <p className="text-sm text-muted-foreground mt-1">點擊「新增站點」建立第一個站點</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedSites.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5">
              {orderedSites.map(site => (
                <SortableSiteRow
                  key={site.id}
                  site={site}
                  isActive={site.id === currentSiteId}
                  onSwitch={() => setCurrentSiteId(site.id)}
                  onEdit={() => openEdit(site)}
                  onDelete={() => deleteMutation.mutate({ id: site.id })}
                  canDelete={sites.length > 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* 新增站點 Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增站點</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="site-name">站點名稱 *</Label>
              <Input
                id="site-name"
                placeholder="例如：遊戲部落格、旅遊網站"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-desc">描述（選填）</Label>
              <Input
                id="site-desc"
                placeholder="簡短描述這個站點的用途"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button
              onClick={handleCreate}
              disabled={!formName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "建立中..." : "建立站點"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯站點 Dialog */}
      <Dialog open={!!editSite} onOpenChange={(open) => !open && setEditSite(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯站點</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-site-name">站點名稱 *</Label>
              <Input
                id="edit-site-name"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleUpdate()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-site-desc">描述（選填）</Label>
              <Input
                id="edit-site-desc"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSite(null)}>取消</Button>
            <Button
              onClick={handleUpdate}
              disabled={!formName.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "更新中..." : "儲存變更"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
