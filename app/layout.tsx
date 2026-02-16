import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { ChatSidebarProvider } from "@/components/chat/chat-sidebar-provider";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatSidebarToggle } from "@/components/chat/chat-sidebar-toggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Image Gen - AI Sprite & Asset Generator",
  description: "Generate game sprites and assets with AI-powered batch processing",
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <SettingsProvider>
            <ChatSidebarProvider>
              <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto py-6 px-4">
                  {children}
                </main>
              </div>
              <ChatSidebar />
              <ChatSidebarToggle />
            </ChatSidebarProvider>
            <Toaster />
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
