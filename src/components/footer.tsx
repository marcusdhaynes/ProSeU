import { GraduationCap, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-20">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="col-span-1 lg:col-span-1">
            <div className="flex items-center space-x-2 mb-6">
              <GraduationCap className="h-10 w-10 text-secondary" />
              <span className="font-headline text-3xl font-bold tracking-tight">ProSeU</span>
            </div>
            <p className="text-primary-foreground/70 mb-8 leading-relaxed">
              Empowering individuals through professional legal education. Our mission is to democratize legal knowledge and provide accessible pathways to justice for everyone.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-secondary transition-colors"><Facebook className="h-5 w-5" /></a>
              <a href="#" className="hover:text-secondary transition-colors"><Twitter className="h-5 w-5" /></a>
              <a href="#" className="hover:text-secondary transition-colors"><Linkedin className="h-5 w-5" /></a>
              <a href="#" className="hover:text-secondary transition-colors"><Instagram className="h-5 w-5" /></a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-6">Programs</h4>
            <ul className="space-y-4 text-primary-foreground/70">
              <li><a href="#" className="hover:text-secondary transition-colors">ProSe Certification</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Paralegal Diploma</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Pre-Law Bachelors</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">JD Degree Program</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-6">Resources</h4>
            <ul className="space-y-4 text-primary-foreground/70">
              <li><a href="#" className="hover:text-secondary transition-colors">Legal Reference Library</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Digital Case Builder</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Case Search Portal</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Alumni Network</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-6">University</h4>
            <ul className="space-y-4 text-primary-foreground/70">
              <li><a href="#" className="hover:text-secondary transition-colors">About ProSeU</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Our Faculty</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Career Services</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Privacy & Terms</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-primary-foreground/50">
          <p>© 2024 ProSeU. All rights reserved. ProSeU is an educational platform and does not provide legal advice.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-secondary">Accessibility</a>
            <a href="#" className="hover:text-secondary">Support</a>
            <a href="#" className="hover:text-secondary">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}