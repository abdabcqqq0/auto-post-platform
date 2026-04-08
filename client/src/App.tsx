import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import TitlesPage from "./pages/Titles";
import ArticlesPage from "./pages/Articles";
import GeminiSettingsPage from "./pages/GeminiSettings";
import WordPressSettingsPage from "./pages/WordPressSettings";
import LogsPage from "./pages/Logs";
import ChatPage from "./pages/Chat";
import TelegramSettingsPage from "./pages/TelegramSettings";
import PromptTemplatePage from "./pages/PromptTemplate";
import SitesPage from "./pages/Sites";
import AdminUsersPage from "./pages/AdminUsers";
import ImageGenPage from "./pages/ImageGen";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./_core/hooks/useAuth";

function ProtectedRouter() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={TitlesPage} />
        <Route path="/titles" component={TitlesPage} />
        <Route path="/articles" component={ArticlesPage} />
        <Route path="/gemini-settings" component={GeminiSettingsPage} />
        <Route path="/wordpress-settings" component={WordPressSettingsPage} />
        <Route path="/logs" component={LogsPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/telegram-settings" component={TelegramSettingsPage} />
        <Route path="/prompt-template" component={PromptTemplatePage} />
        <Route path="/sites" component={SitesPage} />
        <Route path="/admin/users" component={AdminUsersPage} />
        <Route path="/image-gen" component={ImageGenPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" switchable={true}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route component={ProtectedRouter} />
        </Switch>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
