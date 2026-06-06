import type { Metadata, Viewport } from "next";
import { Poppins, Lora, Libre_Baskerville } from "next/font/google";
import { Toaster } from "sonner";
import ThemeProvider from "@/components/ThemeProvider";
import { ProcessingProvider } from "@/lib/processingContext";
import { NavGuardProvider } from "@/lib/navGuard";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lora",
  style: ["normal", "italic"],
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-libre-baskerville",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "fluency.my",
  description: "AI-powered MUET speaking practice and coaching platform",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${lora.variable} ${libreBaskerville.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('voxready-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t===null&&d)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full antialiased" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        <ThemeProvider>
          <ProcessingProvider>
            <NavGuardProvider>
              {children}
            </NavGuardProvider>
          </ProcessingProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: 13,
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
