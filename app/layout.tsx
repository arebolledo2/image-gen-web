import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AIModelSettingsProvider } from "@/components/providers/ai-model-settings-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { ChatSidebarProvider } from "@/components/chat/chat-sidebar-provider";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatSidebarToggle } from "@/components/chat/chat-sidebar-toggle";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Image Gen - AI Sprite & Asset Generator",
  description: "Generate game sprites and assets with AI-powered batch processing",
};

interface LayoutContentProps {
  children: React.ReactNode;
}

const LayoutContent = ({ children }: LayoutContentProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
      <div className="flex min-h-[calc(100vh-300px)]">
        <ChatSidebar />
      </div>
    </div>
  );
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <AIModelSettingsProvider>
            <SettingsProvider>
              <ChatSidebarProvider>
                <LayoutContent>
                  {children}
                </LayoutContent>
                <Toaster />
              </ChatSidebarProvider>
            </SettingsProvider>
          </AIModelSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
