
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { MainNav } from "@/components/main-nav";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { DevModeProvider } from "@/components/dev-mode-context";
import { SiteContentProvider } from "@/components/site-content-context";

export const metadata: Metadata = {
  title: 'ProSeU – Courtroom Self-Representation',
  description: 'Master the courtroom with ProSeU. Education, preparation, and AI-powered legal coaching.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Handlee&family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <FirebaseClientProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <SiteContentProvider>
              <DevModeProvider>
                <MainNav />
                <main className="flex-1 w-full">
                  {children}
                </main>
                <Toaster />
              </DevModeProvider>
            </SiteContentProvider>
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
