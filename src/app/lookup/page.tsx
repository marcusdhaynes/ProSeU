"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Scale, FileText, ArrowRight, Gavel } from "lucide-react";
import { EditableContent } from "@/components/editable-content";

export default function CaseLookupPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/lookup/${encodeURIComponent(query)}`);
  };

  const SAMPLE_CASES = [
    { id: "roe-v-wade", name: "Roe v. Wade", citation: "410 U.S. 113", type: "Constitutional" },
    { id: "miranda-v-arizona", name: "Miranda v. Arizona", citation: "384 U.S. 436", type: "Criminal Procedure" },
    { id: "plessy-v-ferguson", name: "Plessy v. Ferguson", citation: "163 U.S. 537", type: "Civil Rights" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 px-6 pt-12">
      <header className="text-center space-y-6">
        <div className="bg-primary text-white p-4 rounded-3xl shadow-xl w-fit mx-auto">
          <Search className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <EditableContent 
            tag="h1" 
            contentKey="lookup_title" 
            content="Legal Case Lookup" 
            className="text-4xl font-bold tracking-tighter text-primary uppercase" 
          />
          <EditableContent 
            tag="p" 
            contentKey="lookup_desc" 
            content="Search the CourtListener database for public case records, judicial opinions, and legal precedents." 
            className="text-muted-foreground italic font-medium" 
          />
        </div>
      </header>

      <Card className="border-4 shadow-2xl overflow-hidden rounded-[3rem] bg-card/50 backdrop-blur-sm">
        <CardContent className="p-10">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <Input 
              placeholder="Case Name, Citation, or Docket Number..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-16 text-lg px-8 rounded-2xl border-2 focus-visible:ring-accent"
            />
            <Button type="submit" size="lg" className="h-16 px-10 rounded-2xl bg-accent hover:bg-accent/90 font-black uppercase tracking-widest shadow-lg">
              <Search className="h-5 w-5 mr-2" /> Find Intelligence
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-accent" />
          <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
            <Gavel className="h-5 w-5 text-accent" /> Notable Precedents
          </h2>
        </div>
        <div className="grid gap-4">
          {SAMPLE_CASES.map((c) => (
            <Card 
              key={c.id} 
              className="proseu-card cursor-pointer group hover:border-accent rounded-3xl" 
              onClick={() => router.push(`/lookup/${c.id}`)}
            >
              <CardContent className="p-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="bg-muted p-4 rounded-2xl text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl uppercase tracking-tight group-hover:text-accent transition-colors">{c.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">{c.citation} • {c.type}</p>
                  </div>
                </div>
                <div className="bg-muted/50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                  <ArrowRight className="h-5 w-5 text-accent" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
