

import '../src/app/globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { MainNav } from "@/components/main-nav";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { DevModeProvider } from "@/components/dev-mode-context";
import { SiteContentProvider } from "@/components/site-content-context";


export default function AppLayout({children}: {children:React.ReactNode}){return <>
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
      </>}
