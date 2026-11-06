import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import AppHeader from "./AppHeader";
import { MobileDrawer } from "./MobileDrawer";
import { MobileBottomBar } from "./MobileBottomBar";
import { AIAssistantDrawer } from "../ai/AIAssistantDrawer";
import { NetworkStatusIndicator } from "../pwa/NetworkStatusIndicator";
import { UpdateAvailableToast } from "../pwa/UpdateAvailableToast";
import { InstallPromptBanner } from "../pwa/InstallPromptBanner";

type AppLayoutProps = {
  children: ReactNode;
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Network connectivity banner & auto-reconnect notifications */}
      <NetworkStatusIndicator />

      {/* Skip to main content for screen readers and keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-emerald-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Mobile Drawer (Tablets & Phones < lg) */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex min-h-screen">
        {/* Desktop Sidebar (lg+) */}
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

          <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 pb-24 md:pb-8">
            <InstallPromptBanner />
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Phones < md) */}
      <MobileBottomBar />

      {/* Floating AI Learning Assistant */}
      <AIAssistantDrawer />

      {/* PWA Service Worker Update Notification */}
      <UpdateAvailableToast />
    </div>
  );
};

export default AppLayout;
