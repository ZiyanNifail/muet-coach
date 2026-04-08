import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Presentation Coach",
  description: "AI-driven multimodal presentation coaching for MUET/SPM and university students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full`}>
      <body className="min-h-full bg-bg-base text-text-base antialiased">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'rgba(18, 18, 28, 0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#e8e8f0',
              fontSize: 13,
            },
          }}
        />
      </body>
    </html>
  );
}
