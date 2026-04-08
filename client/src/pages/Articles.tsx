import { useState, useRef } from "react";
import { useIsMobile } from "@/hooks/useMobile";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { trpc } from "@/lib/trpc";
import { useSite } from "@/contexts/SiteContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogOverlay,
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
import { toast } from "sonner";
import {
  ExternalLink,
  RefreshCw,
  Eye,
  FileText,
  Upload,
  Pencil,
  Save,
  Trash2,
  Send,
  Bot,
  User,
  Tag,
  KeyRound,
  Monitor,
  Smartphone,
  AlignLeft,
} from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import SummernoteEditor from "@/components/SummernoteEditor";

type WpStatus = "pending" | "published" | "failed";
type GeminiStatus = "success" | "failed";

const wpStatusConfig: Record<WpStatus, { label: string; className: string }> = {
  pending: { label: "未發布", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  published: { label: "已發布", className: "bg-green-100 text-green-800 border-green-200" },
  failed: { label: "發布失敗", className: "bg-red-100 text-red-800 border-red-200" },
};

const geminiStatusConfig: Record<GeminiStatus, { label: string; className: string }> = {
  success: { label: "生成成功", className: "bg-blue-100 text-blue-800 border-blue-200" },
  failed: { label: "生成失敗", className: "bg-red-100 text-red-800 border-red-200" },
};

type ArticleItem = {
  id: number;
  title: string;
  content: string | null;
  geminiStatus: string;
  wpStatus: string;
  publishedUrl: string | null;
  tags: string | null;
  keywords: string | null;
  excerpt: string | null;
  coverImageUrl: string | null;
  createdAt: Date;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function ArticlesPage() {
  const [previewArticle, setPreviewArticle] = useState<ArticleItem | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [editMode, setEditMode] = useState<"desktop" | "mobile">("desktop");
  const [editArticle, setEditArticle] = useState<ArticleItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [editExcerpt, setEditExcerpt] = useState("");
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [republishingId, setRepublishingId] = useState<number | null>(null);
  const [deleteArticleId, setDeleteArticleId] = useState<number | null>(null);
  const [wpStatusFilter, setWpStatusFilter] = useState<"all" | WpStatus>("all");
  const isMobile = useIsMobile();

  // Gemini 即時對話狀態
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const { currentSiteId } = useSite();
  const utils = trpc.useUtils();
  const { data: articles = [], isLoading } = trpc.articles.list.useQuery({ siteId: currentSiteId });

  const publishMutation = trpc.articles.publish.useMutation({
    onSuccess: (data) => {
      setPublishingId(null);
      utils.articles.list.invalidate();
      utils.logs.list.invalidate();
      if (data.success) {
        toast.success("發布成功！");
      } else {
        toast.error(`發布失敗：${data.message}`);
      }
    },
    onError: (e) => {
      setPublishingId(null);
      toast.error(`操作失敗：${e.message}`);
    },
  });

  const republishMutation = trpc.articles.republish.useMutation({
    onSuccess: (data) => {
      setRepublishingId(null);
      utils.articles.list.invalidate();
      utils.logs.list.invalidate();
      if (data.success) {
        toast.success("重新發布成功");
      } else {
        toast.error(`重新發布失敗：${data.message}`);
      }
    },
    onError: (e) => {
      setRepublishingId(null);
      toast.error(`操作失敗：${e.message}`);
    },
  });

  const updateMutation = trpc.articles.update.useMutation({
    onSuccess: () => {
      utils.articles.list.invalidate();
      toast.success("文章已儲存");
    },
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const deleteMutation = trpc.articles.delete.useMutation({
    onSuccess: () => {
      utils.articles.list.invalidate();
      toast.success("文章已刪除");
      setDeleteArticleId(null);
    },
    onError: (e) => {
      toast.error(`刪除失敗：${e.message}`);
      setDeleteArticleId(null);
    },
  });

  const geminiEditMutation = trpc.articles.geminiEdit.useMutation({
    onSuccess: (data) => {
      if (data.success && data.content) {
        setEditContent(data.content);
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: "✅ 已根據您的指令修改文章內容，請在左側編輯器查看結果。",
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
        setTimeout(() => {
          if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
          }
        }, 100);
      }
      setIsChatLoading(false);
    },
    onError: (e) => {
      const errMsg: ChatMessage = {
        role: "assistant",
        content: `❌ 修改失敗：${e.message}`,
      };
      setChatMessages((prev) => [...prev, errMsg]);
      setIsChatLoading(false);
    },
  });

  const handlePublish = (id: number) => {
    setPublishingId(id);
    publishMutation.mutate({ id, siteId: currentSiteId });
  };

  const handleRepublish = (id: number) => {
    setRepublishingId(id);
    republishMutation.mutate({ id, siteId: currentSiteId });
  };

  const openEdit = (article: ArticleItem) => {
    const raw = article.content ?? "";
    const isHtml = /<[a-z][\s\S]*>/i.test(raw);
    const initialHtml = isHtml
      ? raw
      : raw
          .split(/\n\n+/)
          .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
          .join("\n");

    setEditTitle(article.title);
    setEditContent(initialHtml);
    setEditTags(article.tags ?? "");
    setEditKeywords(article.keywords ?? "");
    setEditExcerpt(article.excerpt ?? "");
    setEditArticle(article);
    setChatMessages([
      {
        role: "assistant",
        content: `您好！我是 Gemini 編輯助手。您可以告訴我如何修改這篇文章「${article.title}」，例如：\n• 「幫我加入更多細節」\n• 「把語氣改得更輕鬆」\n• 「在文章末尾加入 CTA」\n• 「幫我加入 SEO 關鍵字：XXX」`,
      },
    ]);
    setChatInput("");
  };

  const handleSaveEdit = async (publishAfterSave = false) => {
    if (!editArticle) return;
    await updateMutation.mutateAsync({
      id: editArticle.id,
      siteId: currentSiteId,
      title: editTitle,
      content: editContent,
      tags: editTags,
      keywords: editKeywords,
      excerpt: editExcerpt,
    });
    if (publishAfterSave) {
      setPublishingId(editArticle.id);
      publishMutation.mutate({ id: editArticle.id, siteId: currentSiteId });
    }
    setEditArticle(null);
  };

  const handleChatSend = () => {
    if (!chatInput.trim() || !editArticle || isChatLoading) return;

    const userMsg: ChatMessage = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 50);

    geminiEditMutation.mutate({
      articleId: editArticle.id,
      siteId: currentSiteId,
      currentContent: editContent,
      instruction: chatInput,
    });
  };

  const publishedCount = articles.filter((a) => a.wpStatus === "published").length;
  const pendingCount = articles.filter((a) => a.wpStatus === "pending").length;
  const failedCount = articles.filter((a) => a.wpStatus === "failed").length;

  // 狀態篩選
  const filteredArticles = wpStatusFilter === "all"
    ? articles
    : articles.filter((a) => a.wpStatus === wpStatusFilter);

  const articleFilterTabs: { key: "all" | WpStatus; label: string; count: number }[] = [
    { key: "all", label: "全部", count: articles.length },
    { key: "published", label: "已發布", count: publishedCount },
    { key: "pending", label: "未發布", count: pendingCount },
    { key: "failed", label: "失敗", count: failedCount },
  ];

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">已生成文章</h1>
        <p className="text-sm text-muted-foreground mt-1">
          瀏覽、編輯並發布所有由 Gemini 生成的文章
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-foreground">{articles.length}</div>
            <div className="text-sm text-muted-foreground">總文章數</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
            <div className="text-sm text-muted-foreground">已發布</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
            <div className="text-sm text-muted-foreground">發布失敗</div>
          </CardContent>
        </Card>
      </div>

      {/* 文章列表 */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">文章列表</CardTitle>
          {/* 狀態篩選 tabs */}
          <div className="flex gap-1 mt-3 border-b pb-0 -mx-6 px-6 overflow-x-auto">
            {articleFilterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setWpStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                  wpStatusFilter === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  wpStatusFilter === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
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
          ) : articles.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">尚無生成的文章</p>
              <p className="text-xs text-muted-foreground mt-1">
                請至「標題排程管理」新增標題並執行
              </p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              無「{articleFilterTabs.find(t => t.key === wpStatusFilter)?.label}」狀態的文章
            </div>
          ) : (
            <div className="divide-y">
              {filteredArticles.map((article) => {
                const wpStatus = article.wpStatus as WpStatus;
                const geminiStatus = article.geminiStatus as GeminiStatus;
                const wpCfg = wpStatusConfig[wpStatus];
                const geminiCfg = geminiStatusConfig[geminiStatus];
                const isPublishing = publishingId === article.id;
                const isRepublishing = republishingId === article.id;
                const articleTyped = article as unknown as ArticleItem;

                // 操作按鈕組
                const actionBtns = (
                  <>
                    {article.content && (
                      <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => setPreviewArticle(articleTyped)}>
                        <Eye className="h-3.5 w-3.5" />
                        <span className="ml-1 hidden sm:inline">預覽</span>
                      </Button>
                    )}
                    {article.content && (
                      <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => openEdit(articleTyped)}>
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="ml-1 hidden sm:inline">編輯</span>
                      </Button>
                    )}
                    {article.content && (
                      <Button size="sm" variant="default" className="h-8 shrink-0" onClick={() => handlePublish(article.id)} disabled={isPublishing}>
                        {isPublishing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        <span className="ml-1 hidden sm:inline">{isPublishing ? "發布中" : "發布"}</span>
                      </Button>
                    )}
                    {wpStatus === "failed" && (
                      <Button size="sm" variant="outline" className="h-8 text-orange-600 border-orange-300 hover:bg-orange-50 shrink-0" onClick={() => handleRepublish(article.id)} disabled={isRepublishing}>
                        {isRepublishing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        <span className="ml-1 hidden sm:inline">重試</span>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200 hover:bg-red-50 shrink-0" onClick={() => setDeleteArticleId(article.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                );

                return (
                  <div key={article.id} className="hover:bg-muted/30 transition-colors">
                    {/* 手機版：兩行佈局 */}
                    <div className="flex flex-col gap-2 px-4 py-4 sm:hidden">
                      {(article as any).coverImageUrl && (
                        <img src={(article as any).coverImageUrl} alt={article.title} className="w-full h-32 object-cover rounded-md border border-border" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{article.title}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge className={`text-xs ${geminiCfg.className}`} variant="outline">{geminiCfg.label}</Badge>
                          <Badge className={`text-xs ${wpCfg.className}`} variant="outline">{wpCfg.label}</Badge>
                          <span className="text-xs text-muted-foreground">{format(new Date(article.createdAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}</span>
                        </div>
                        {(articleTyped.tags || articleTyped.keywords) && (
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {articleTyped.tags && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Tag className="h-3 w-3 shrink-0" /><span className="break-all">{articleTyped.tags}</span></div>}
                            {articleTyped.keywords && <div className="flex items-center gap-1 text-xs text-muted-foreground"><KeyRound className="h-3 w-3 shrink-0" /><span className="break-all">{articleTyped.keywords}</span></div>}
                          </div>
                        )}
                        {article.publishedUrl && (
                          <a href={article.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 flex items-center gap-1 w-fit">
                            <ExternalLink className="h-3 w-3" />查看 WordPress 文章
                          </a>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-wrap">{actionBtns}</div>
                    </div>

                    {/* 桌機版：單行，按鈕在右側 */}
                    <div className="hidden sm:flex items-center gap-3 px-4 py-3">
                      {(article as any).coverImageUrl && (
                        <img src={(article as any).coverImageUrl} alt={article.title} className="w-16 h-12 object-cover rounded border border-border shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{article.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={`text-xs ${geminiCfg.className}`} variant="outline">{geminiCfg.label}</Badge>
                          <Badge className={`text-xs ${wpCfg.className}`} variant="outline">{wpCfg.label}</Badge>
                          <span className="text-xs text-muted-foreground">{format(new Date(article.createdAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}</span>
                          {articleTyped.tags && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Tag className="h-3 w-3 shrink-0" /><span className="truncate max-w-[120px]">{articleTyped.tags}</span></div>}
                          {article.publishedUrl && (
                            <a href={article.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />查看
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">{actionBtns}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 文章預覽 Dialog（全螢幕 + 電腦版/手機版切換） ── */}
      <DialogPrimitive.Root
        open={!!previewArticle}
        onOpenChange={(open) => {
          if (!open) setPreviewArticle(null);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogOverlay className="z-50" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 flex flex-col bg-background focus:outline-none"
            aria-describedby={undefined}
          >
            {/* 頁首列 */}
            <div className="flex items-center gap-3 px-6 pt-4 pb-3 border-b shrink-0">
              <div className="flex-1 min-w-0">
                <DialogPrimitive.Title className="text-base font-semibold truncate pr-2">
                  {previewArticle?.title}
                </DialogPrimitive.Title>
                {previewArticle && (
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      生成於 {format(new Date(previewArticle.createdAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}
                    </span>
                    {previewArticle.tags && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        <span>{previewArticle.tags}</span>
                      </div>
                    )}
                    {previewArticle.keywords && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <KeyRound className="h-3 w-3" />
                        <span>{previewArticle.keywords}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 電腦版/手機版切換 */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1 shrink-0">
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    previewMode === "desktop"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  電腦版
                </button>
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    previewMode === "mobile"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  手機版
                </button>
              </div>

              <DialogPrimitive.Close className="shrink-0 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            {/* 內容區 */}
            {previewMode === "desktop" ? (
              /* 電腦版：全螢幕滿寬 */
              <div className="flex-1 overflow-y-auto px-8 py-6">
                {previewArticle?.content && /<[a-z][\s\S]*>/i.test(previewArticle.content) ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewArticle.content }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {previewArticle?.content ?? ""}
                  </pre>
                )}
              </div>
            ) : (
              /* 手機版：手機框模擬 */
              <div className="flex-1 overflow-y-auto flex items-start justify-center bg-muted/40 py-8 px-4">
                <div className="relative shrink-0" style={{ width: 390 }}>
                  {/* 手機外框 */}
                  <div className="relative bg-background border-4 border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden" style={{ minHeight: 700 }}>
                    {/* 頂部瀏覽列 */}
                    <div className="bg-gray-800 flex items-center justify-between px-6 py-2 shrink-0">
                      <span className="text-white text-xs font-medium">
                        {format(new Date(), "HH:mm")}
                      </span>
                      <div className="w-20 h-4 bg-gray-900 rounded-full" />
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-white/60" />
                        <div className="w-3 h-3 rounded-full bg-white/60" />
                        <div className="w-3 h-3 rounded-full bg-white/60" />
                      </div>
                    </div>
                    {/* 文章內容 */}
                    <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: 680 }}>
                      <h1 className="text-base font-bold mb-3 leading-snug">{previewArticle?.title}</h1>
                      {previewArticle?.content && /<[a-z][\s\S]*>/i.test(previewArticle.content) ? (
                        <div
                          className="prose prose-xs max-w-none text-sm"
                          dangerouslySetInnerHTML={{ __html: previewArticle.content }}
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                          {previewArticle?.content ?? ""}
                        </pre>
                      )}
                    </div>
                  </div>
                  {/* 底部按鈕 */}
                  <div className="flex justify-center mt-3">
                    <div className="w-28 h-1.5 bg-gray-800 rounded-full" />
                  </div>
                </div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* ── 文章編輯 Dialog（全螢幕：左右雙欄：TinyMCE + Gemini 對話） ── */}
      <DialogPrimitive.Root open={!!editArticle} onOpenChange={(open) => !open && setEditArticle(null)}>
        <DialogPrimitive.Portal>
          <DialogOverlay className="z-50" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 flex flex-col bg-background focus:outline-none"
            aria-describedby={undefined}
          >
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-3 border-b shrink-0">
            <DialogPrimitive.Title className="flex items-center gap-2 text-base font-semibold shrink-0">
              <Pencil className="h-4 w-4" />
              後製編輯
            </DialogPrimitive.Title>

            {/* 電腦版/手機版切換 */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setEditMode("desktop")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  editMode === "desktop"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">編輯模式</span>
              </button>
              <button
                onClick={() => setEditMode("mobile")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  editMode === "mobile"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">手機預覽</span>
              </button>
            </div>

            <DialogPrimitive.Close className="ml-auto shrink-0 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* 標題 + 標籤 + 關鍵字列 */}
          <div className="px-6 py-3 border-b shrink-0 space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="editTitle" className="text-sm font-medium shrink-0 w-14">標題</Label>
              <Input
                id="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="文章標題..."
                className="flex-1 text-sm font-medium"
              />
            </div>
            {/* 標籤 + 關鍵字：手機版垂直排列，桌機版水平 */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1 shrink-0 w-14">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">標籤</Label>
                </div>
                <Input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="標籤1,標籤2（逗號分隔）"
                  className="flex-1 text-xs h-8"
                />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1 shrink-0 w-14">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">關鍵字</Label>
                </div>
                <Input
                  value={editKeywords}
                  onChange={(e) => setEditKeywords(e.target.value)}
                  placeholder="SEO關鍵字1,SEO關鍵字2（逗號分隔）"
                  className="flex-1 text-xs h-8"
                />
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex items-center gap-1 shrink-0 w-14 pt-1.5">
                <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground">摘要</Label>
              </div>
              <Textarea
                value={editExcerpt}
                onChange={(e) => setEditExcerpt(e.target.value)}
                placeholder="WordPress 文章摘要（100～150 字，Gemini 自動填入）"
                className="flex-1 text-xs resize-none min-h-[52px] max-h-[80px]"
              />
            </div>
          </div>

          {/* 雙欄主體 */}
          <div className="flex flex-1 overflow-hidden">
            {/* 左欄：編輯器 or 手機預覽 */}
            <div className="flex-1 flex flex-col overflow-hidden border-r">
              {editMode === "desktop" ? (
                /* 電腦版：Summernote 編輯器 */
                <>
                  <div className="px-4 py-2 bg-muted/30 border-b shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">文章編輯器</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({editContent.replace(/<[^>]*>/g, "").length} 字)
                    </span>
                  </div>
                  <div className="flex-1 overflow-auto p-3">
                    {editArticle && (
                      <SummernoteEditor
                        key={`summernote-${editArticle.id}`}
                        value={editContent}
                        onChange={(content) => setEditContent(content)}
                        height={480}
                      />
                    )}
                  </div>
                </>
              ) : (
                /* 手機版：手機框即時預覽 */
                <div className="flex-1 overflow-y-auto flex items-start justify-center bg-muted/40 py-8 px-4">
                  <div className="relative shrink-0" style={{ width: 390 }}>
                    <div className="relative bg-background border-4 border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden" style={{ minHeight: 700 }}>
                      <div className="bg-gray-800 flex items-center justify-between px-6 py-2 shrink-0">
                        <span className="text-white text-xs font-medium">{format(new Date(), "HH:mm")}</span>
                        <div className="w-20 h-4 bg-gray-900 rounded-full" />
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-white/60" />
                          <div className="w-3 h-3 rounded-full bg-white/60" />
                          <div className="w-3 h-3 rounded-full bg-white/60" />
                        </div>
                      </div>
                      <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: 680 }}>
                        <h1 className="text-base font-bold mb-3 leading-snug">{editTitle}</h1>
                        {editContent && /<[a-z][\s\S]*>/i.test(editContent) ? (
                          <div
                            className="prose prose-xs max-w-none text-sm"
                            dangerouslySetInnerHTML={{ __html: editContent }}
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{editContent}</pre>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-center mt-3">
                      <div className="w-28 h-1.5 bg-gray-800 rounded-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 右欄：Gemini 即時對話（手機版隱藏） */}
            <div className={`${isMobile ? 'hidden' : 'w-80'} flex flex-col overflow-hidden bg-muted/10 border-l`}>
              <div className="px-4 py-2 bg-muted/30 border-b shrink-0 flex items-center gap-2">
                <Bot className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Gemini 編輯助手</span>
              </div>

              {/* 對話記錄 */}
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-3 space-y-3"
              >
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                    </div>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border text-foreground"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-2">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="bg-background border rounded-lg px-3 py-2 text-xs text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Gemini 修改中...
                    </div>
                  </div>
                )}
              </div>

              {/* 輸入框 */}
              <div className="p-3 border-t shrink-0">
                <div className="flex gap-2">
                  <Textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="告訴 Gemini 如何修改文章..."
                    className="flex-1 text-xs resize-none min-h-[60px] max-h-[120px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSend();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="self-end h-8 w-8 p-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Enter 送出，Shift+Enter 換行</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-3 border-t shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setEditArticle(null)}>
              取消
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSaveEdit(false)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              儲存草稿
            </Button>
            <Button
              onClick={() => handleSaveEdit(true)}
              disabled={updateMutation.isPending || publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              儲存並發布
            </Button>
          </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* ── 刪除確認 Dialog ── */}
      <AlertDialog open={!!deleteArticleId} onOpenChange={(open) => !open && setDeleteArticleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除文章？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原。文章將從平台中永久刪除，但不會影響已發布到 WordPress 的文章。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteArticleId) deleteMutation.mutate({ id: deleteArticleId, siteId: currentSiteId });
              }}
            >
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
