import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Search, UserCircle, Menu } from "lucide-react";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="font-headline text-2xl font-bold tracking-tight text-primary">ProSeU</span>
          </Link>
          <div className="hidden items-center space-x-6 text-sm font-medium md:flex">
            <Link href="#" className="transition-colors hover:text-secondary">Curriculum</Link>
            <Link href="#" className="transition-colors hover:text-secondary">Library</Link>
            <Link href="#" className="transition-colors hover:text-secondary">Cases</Link>
            <Link href="#" className="transition-colors hover:text-secondary">Programs</Link>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden items-center md:flex">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-primary font-semibold">Login</Button>
          </div>
          <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md">
            Enroll Now
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </nav>
  );
}