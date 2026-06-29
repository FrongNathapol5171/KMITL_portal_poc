import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AskKMITL",
  description: "Your KMITL academic assistant",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "AskKMITL" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#e86020",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full" suppressHydrationWarning>
      <body className="h-full flex flex-col antialiased"
            style={{ fontFamily: "var(--font-sans)", background: "var(--bg)", color: "var(--text)" }}>
        {children}
      </body>
    </html>
  );
}
