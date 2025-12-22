import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Image Gen - AI Sprite & Asset Generator",
  description: "Generate game sprites and assets with AI-powered batch processing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <SettingsProvider>
            <div className="min-h-screen bg-background">
              <Navigation />
              <main className="container mx-auto py-6 px-4">
                {children}
              </main>
            </div>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
