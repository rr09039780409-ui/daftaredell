import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "کتابخانه | کتاب‌خوان آنلاین",
  description: "کتاب‌خوان آنلاین با حفاظت متن، تغییر تم و سایز فونت",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "کتابخانه",
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
      </head>
      <body className="antialiased bg-background text-foreground" style={{ fontFamily: 'Vazirmatn, Tahoma, "Segoe UI", sans-serif' }}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
