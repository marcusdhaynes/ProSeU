'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Scale, Sun, Moon, LogIn, LayoutDashboard, BookOpen, FileText, Bot, Library, Menu, UserCircle, Database } from "lucide-react";
import { useTheme } from "next-themes";
import { useDevMode } from "./dev-mode-context";
import { useSiteContent } from "./site-content-context";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useUser } from "@/firebase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, isUserLoading } = useUser();
  const { 
    isEditMode, 
    setIsEditMode, 
    hasUnsavedChanges, 
    setHasUnsavedChanges, 
    resetEdits,
    pendingUrl,
    setPendingUrl 
  } = useDevMode();
  const { saveChanges } = useSiteContent();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { name: "Hub", href: "/", icon: LayoutDashboard },
    { name: "Learn", href: "/learn", icon: BookOpen },
    { name: "CasePrep", href: "/prepare", icon: FileText },
    { name: "Research", href: "/coach", icon: Bot },
    { name: "Resources", href: "/resources", icon: Library },
  ];

  const handleToggleEditMode = (checked: boolean) => {
    if (!checked && hasUnsavedChanges) {
      setPendingUrl("TOGGLE_OFF");
    } else {
      setIsEditMode(checked);
    }
  };

  const handleConfirmDiscard = () => {
    const target = pendingUrl;
    resetEdits();
    if (target && target !== "TOGGLE_OFF") {
      router.push(target);
    }
  };

  const handleConfirmKeep = async () => {
    const target = pendingUrl;
    await saveChanges();
    setHasUnsavedChanges(false);
    setPendingUrl(null);
    if (target === "TOGGLE_OFF") {
      setIsEditMode(false);
    } else if (target) {
      router.push(target);
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (hasUnsavedChanges && pathname !== href) {
      e.preventDefault();
      setPendingUrl(href);
    }
  };

  if (!mounted) {
    return (
      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="w-full px-4 h-14 grid grid-cols-3 items-center">
          <div className="flex items-center justify-self-start">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-1 rounded-lg">
                <Scale className="h-4 w-4" />
              </div>
              <span className="font-bold text-lg tracking-tighter text-primary">
                ProSe<span className="text-accent">U</span>
              </span>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  const isAnonymous = user?.isAnonymous;

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="w-full px-4 h-14 grid grid-cols-3 items-center">
          <div className="flex items-center justify-self-start">
            <Link href="/" className="flex items-center gap-2 group" onClick={(e) => handleNavClick(e, '/')}>
              <div className="bg-primary text-primary-foreground p-1 rounded-lg group-hover:rotate-12 transition-transform">
                <Scale className="h-4 w-4" />
              </div>
              <span className="font-bold text-lg tracking-tighter text-primary">
                ProSe<span className="text-accent">U</span>
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-0.5 justify-self-center">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "gap-1.5 px-2.5 h-9",
                  pathname === item.href && "bg-muted text-primary font-bold"
                )}
              >
                <Link href={item.href} onClick={(e) => handleNavClick(e, item.href)}>
                  <item.icon className="h-3.5 w-3.5" />
                  <span className="text-[11px]">{item.name}</span>
                </Link>
              </Button>
            ))}
            
            {user && !isAnonymous && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "gap-1.5 px-2.5 h-9 text-emerald-600 dark:text-emerald-400",
                  pathname === '/admin' && "bg-emerald-50 dark:bg-emerald-950/30 font-bold"
                )}
              >
                <Link href="/admin" onClick={(e) => handleNavClick(e, '/admin')}>
                  <Database className="h-3.5 w-3.5" />
                  <span className="text-[11px]">Admin</span>
                </Link>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3 justify-self-end">
            <div className="hidden sm:flex items-center gap-1.5 mr-1">
              <Label className="text-[9px] font-bold uppercase tracking-widest opacity-50">
                Edit
              </Label>
              <Switch
                checked={isEditMode}
                onCheckedChange={handleToggleEditMode}
                className="scale-75"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full h-8 w-8"
            >
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {!isUserLoading && (
              user && !isAnonymous ? (
                <Button variant="ghost" size="sm" asChild className="gap-1.5 font-bold h-9">
                  <Link href="/profile" onClick={(e) => handleNavClick(e, '/profile')}>
                    <UserCircle className="h-4 w-4 text-accent" />
                    <span className="text-[10px]">PROFILE</span>
                  </Link>
                </Button>
              ) : (
                <Button size="sm" className="hidden sm:flex gap-1.5 rounded-lg font-bold bg-accent hover:bg-accent/90 text-accent-foreground h-9" asChild>
                  <Link href="/login" onClick={(e) => handleNavClick(e, '/login')}>
                    <LogIn className="h-3.5 w-3.5" />
                    <span className="text-[10px]">LOGIN</span>
                  </Link>
                </Button>
              )
            )}

            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      <AlertDialog open={!!pendingUrl} onOpenChange={(open) => !open && setPendingUrl(null)}>
        <AlertDialogContent className="rounded-[2rem] border-[#342E55]/10 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#342E55]">Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Keep your modifications or discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              onClick={handleConfirmDiscard} 
              className="rounded-full font-bold border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px]"
            >
              Discard Changes
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmKeep} 
              className="rounded-full bg-[#342E55] hover:bg-[#2a2544] font-bold text-[10px]"
            >
              Keep Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
