import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, KeyRound, UserCog, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  const { data: users, isLoading } = trpc.adminUsers.list.useQuery();

  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [newPwd, setNewPwd] = useState("");

  const createMutation = trpc.adminUsers.create.useMutation({
    onSuccess: () => {
      toast.success("帳號建立成功");
      utils.adminUsers.list.invalidate();
      setCreateOpen(false);
      setNewUsername(""); setNewPassword(""); setNewName(""); setNewRole("user");
    },
    onError: (err) => toast.error(err.message || "建立失敗"),
  });

  const deleteMutation = trpc.adminUsers.delete.useMutation({
    onSuccess: () => {
      toast.success("帳號已刪除");
      utils.adminUsers.list.invalidate();
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error(err.message || "刪除失敗"),
  });

  const resetMutation = trpc.adminUsers.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("密碼已重設");
      setResetOpen(null);
      setNewPwd("");
    },
    onError: (err) => toast.error(err.message || "重設失敗"),
  });

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">僅管理員可存取此頁面</p>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="w-6 h-6" />
            帳號管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">管理平台使用者帳號，由管理員統一建立與刪除</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新增帳號
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>使用者列表</CardTitle>
          <CardDescription>共 {users?.length ?? 0} 個帳號</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : users?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">尚無帳號</p>
          ) : (
            <div className="flex flex-col gap-2">
              {users?.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      {u.role === "admin" ? <Shield className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.name}</span>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                          {u.role === "admin" ? "管理員" : "一般使用者"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        帳號：{u.username} · 建立於 {new Date(u.createdAt).toLocaleDateString("zh-TW")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setResetOpen(u.id); setNewPwd(""); }}
                      title="重設密碼"
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    {u.id !== currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(u.id)}
                        title="刪除帳號"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新增帳號 Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增帳號</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>顯示名稱</Label>
              <Input placeholder="例如：張小明" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>帳號</Label>
              <Input placeholder="登入用帳號（英數字）" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>密碼</Label>
              <Input type="password" placeholder="至少 6 個字元" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>角色</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "user" | "admin")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">一般使用者</SelectItem>
                  <SelectItem value="admin">管理員</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button
              onClick={() => createMutation.mutate({ username: newUsername, password: newPassword, name: newName, role: newRole })}
              disabled={createMutation.isPending || !newUsername || !newPassword || !newName}
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              建立帳號
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重設密碼 Dialog */}
      <Dialog open={resetOpen !== null} onOpenChange={(o) => { if (!o) setResetOpen(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重設密碼</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <Label>新密碼</Label>
            <Input type="password" placeholder="至少 6 個字元" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(null)}>取消</Button>
            <Button
              onClick={() => resetOpen !== null && resetMutation.mutate({ id: resetOpen, password: newPwd })}
              disabled={resetMutation.isPending || newPwd.length < 6}
            >
              {resetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              確認重設
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認 Dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除帳號？</AlertDialogTitle>
            <AlertDialogDescription>此操作無法復原，帳號刪除後將無法登入。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm !== null && deleteMutation.mutate({ id: deleteConfirm })}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
