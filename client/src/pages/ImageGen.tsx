import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSite } from "@/contexts/SiteContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Image, Download, RefreshCw, Sparkles } from "lucide-react";
import LoginGuard from "@/components/LoginGuard";

export default function ImageGenPage() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/png");
  const { currentSiteId } = useSite();

  const generateMutation = trpc.imageGen.generate.useMutation({
    onSuccess: (data) => {
      setImageUrl(data.dataUrl);
      setImageMime(data.mimeType);
      toast.success("圖片生成成功！");
    },
    onError: (e) => toast.error("生成失敗：" + e.message),
  });

  const handleGenerate = () => {
    if (!prompt.trim()) { toast.error("請輸入圖片描述"); return; }
    setImageUrl(null);
    generateMutation.mutate({ prompt, siteId: currentSiteId });
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const ext = imageMime.split("/")[1] || "png";
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `nano-banana-${Date.now()}.${ext}`;
    a.click();
  };

  const handleSuggestPrompt = () => {
    const examples = [
      "A vibrant flat-design illustration of a modern city at sunset, with colorful buildings and trees, suitable for a blog cover",
      "A minimalist tech-themed banner with abstract circuit patterns in blue and purple gradient, professional style",
      "A cozy coffee shop interior with warm lighting, plants, and wooden furniture, watercolor style",
      "An energetic sports illustration showing a runner in motion, dynamic composition, bold colors",
      "A serene mountain landscape at dawn with mist, photorealistic style, wide angle",
    ];
    setPrompt(examples[Math.floor(Math.random() * examples.length)]);
  };

  return (
    <LoginGuard action="使用製圖功能">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Image className="h-6 w-6 text-primary" />
            AI 製圖（Nano Banana）
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            使用 Google Gemini 2.5 Flash Image 生成圖片，每天免費 500 張
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">圖片描述</CardTitle>
            <CardDescription>用文字描述你想要的圖片，支援中英文</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="例如：一張現代科技風格的部落格封面圖，藍色漸層背景，簡潔大方..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                {generateMutation.isPending
                  ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />生成中...</>
                  : <><Sparkles className="h-4 w-4 mr-2" />生成圖片</>}
              </Button>
              <Button variant="outline" onClick={handleSuggestPrompt} disabled={generateMutation.isPending}>
                隨機範例
              </Button>
            </div>
          </CardContent>
        </Card>

        {generateMutation.isPending && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p>Nano Banana 正在作畫，請稍候（約 15-30 秒）...</p>
            </CardContent>
          </Card>
        )}

        {imageUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                生成結果
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />下載圖片
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={imageUrl}
                alt="AI 生成圖片"
                className="w-full rounded-lg border border-border"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </LoginGuard>
  );
}
