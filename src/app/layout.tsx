import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  metadataBase: new URL("https://daftaredell.ir"),
  title: "کتابخانه | دفتر دل",
  description: "کتاب‌خوان آنلاین با حفاظت متن، تغییر تم و سایز فونت",
  icons: {
    icon: "/icon.gif",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "دفتر دل",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

function ServiceWorkerRegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `,
      }}
    />
  );
}

function AntiCopyScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('copy', function(e) { e.preventDefault(); });
          document.addEventListener('selectstart', function(e) {
            if (e.target.tagName === 'CANVAS') e.preventDefault();
          });
          document.addEventListener('dragstart', function(e) { e.preventDefault(); });
        `,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
          rel="stylesheet"
        />
        <ServiceWorkerRegister />
        <AntiCopyScript />
      </head>
      <body className="antialiased bg-background text-foreground" style={{ fontFamily: 'Vazirmatn, Tahoma, "Segoe UI", sans-serif' }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
