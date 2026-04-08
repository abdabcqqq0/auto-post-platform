import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useSite } from '@/contexts/SiteContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, CheckCircle, XCircle, RefreshCw, Zap } from 'lucide-react';
import LoginGuard from '@/components/LoginGuard';

export default function GeminiSettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { currentSiteId } = useSite();
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.settings.getAll.useQuery({ siteId: currentSiteId });

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.getAll.invalidate();
      toast.success('設定已儲存');
      setApiKey('');
    },
    onError: (e) => toast.error('儲存失敗：' + e.message),
  });

  const testMutation = trpc.settings.testGemini.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) toast.success('連線測試成功');
      else toast.error('連線測試失敗');
    },
    onError: (e) => {
      setTestResult({ success: false, message: e.message });
      toast.error('測試失敗：' + e.message);
    },
  });

  const handleSave = () => {
    if (!apiKey || apiKey.includes('****')) {
      toast.info('請輸入 API Key 再儲存');
      return;
    }
    updateMutation.mutate({ gemini_api_key: apiKey, siteId: currentSiteId });
  };

  const maskedKey = (key: string) => {
    if (!key || key.length <= 8) return key;
    return key.slice(0, 4) + '****' + key.slice(-4);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>;

  return (
    <LoginGuard action="儲存 Gemini 設定">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Gemini API 設定
          </h1>
          <p className="text-sm text-muted-foreground mt-1">設定 Gemini API 金鑰，並測試連線狀態</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">API 金鑰</CardTitle>
            <CardDescription>
              若不填寫，系統將使用平台內建的 LLM 服務（免費）。填寫後可使用 Gemini 2.5 Flash 模型。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Gemini API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={settings?.gemini_api_key ? '已設定（輸入新值以更新）' : 'AIza...'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {settings?.gemini_api_key && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  目前已設定：{maskedKey(settings.gemini_api_key)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => { setTestResult(null); testMutation.mutate({ siteId: currentSiteId }); }}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending
                  ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  : <Zap className="h-4 w-4 mr-2" />}
                連線測試
              </Button>
              {testResult && (
                <div className={'flex items-start gap-2 text-sm ' + (testResult.success ? 'text-green-600' : 'text-red-600')}>
                  {testResult.success
                    ? <CheckCircle className="h-4 w-4 mt-0.5" />
                    : <XCircle className="h-4 w-4 mt-0.5" />}
                  <span className="break-all">{testResult.message}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
            儲存設定
          </Button>
        </div>
      </div>
    </LoginGuard>
  );
}
