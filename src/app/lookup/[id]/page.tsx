"use client"

import { useState, useEffect, use } from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  BookOpen, 
  Scale, 
  Calendar, 
  Users, 
  ExternalLink, 
  Loader2,
  ScrollText,
  FileText,
  Gavel,
  History
} from "lucide-react";
import Link from "next/link";
import { getCaseDetails, CaseDetailsOutput } from "@/ai/flows/ai-case-details-flow";

export default function CaseDetailPage(props: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use() as required by Next.js 15
  // Avoiding destructuring in the signature to prevent proxy enumeration warnings
  const params = use(props.params);
  const { id } = params;
  
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<CaseDetailsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getCaseDetails({ caseId: id });
        setCaseData(data);
      } catch (e) {
        console.error(e);
        setError("Failed to load case intelligence. Please verify the ID or try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <Scale className="h-6 w-6 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-muted-foreground font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Accessing CourtListener Records...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="max-w-2xl mx-auto py-32 text-center space-y-8 px-6">
        <div className="bg-rose-500/10 p-6 rounded-[2rem] w-fit mx-auto shadow-inner">
          <Scale className="text-rose-500 h-12 w-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-primary">Case Not Found</h1>
          <p className="text-muted-foreground italic font-medium">{error || "We couldn't find the requested case in our database."}</p>
        </div>
        <Button asChild variant="outline" className="rounded-full px-10 h-14 border-2 font-bold uppercase tracking-widest text-xs">
          <Link href="/lookup">Return to Search</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24 px-6 pt-12">
      <nav className="flex items-center justify-between bg-muted/30 p-4 rounded-2xl border-2">
        <Link href="/lookup" className="flex items-center text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Intelligence Search
        </Link>
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-bold text-[10px] uppercase tracking-widest text-accent hover:bg-accent/5">
          <a href={caseData.courtListenerUrl} target="_blank" rel="noopener noreferrer">
            Official Records <ExternalLink className="ml-2 h-3 w-3" />
          </a>
        </Button>
      </nav>

      <header className="space-y-6 border-b-4 border-muted pb-10">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="bg-primary text-white p-5 rounded-[2rem] shadow-2xl w-fit">
            <BookOpen className="h-10 w-10" />
          </div>
          <div className="flex-1 space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-primary leading-tight uppercase">{caseData.caseName}</h1>
            <div className="flex flex-wrap gap-3">
              <span className="bg-accent/10 text-accent font-mono text-xs font-black px-3 py-1 rounded-full border border-accent/20 uppercase tracking-widest">{caseData.citation}</span>
              <span className="bg-muted text-muted-foreground font-mono text-[10px] font-bold px-3 py-1 rounded-full border border-border uppercase tracking-widest">DOCKET: {caseData.docketNumber}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* SIDEBAR METADATA */}
        <aside className="space-y-8">
          <Card className="border-2 shadow-lg rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-muted/30 p-6 border-b">
              <CardTitle className="text-xs font-black uppercase tracking-widest">Case Metadata</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Date Filed</p>
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Calendar className="h-4 w-4 text-accent" /> {caseData.dateFiled}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Court of Jurisdiction</p>
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Scale className="h-4 w-4 text-accent" /> {caseData.court}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Presiding Judges</p>
                <div className="flex flex-wrap gap-2">
                  {caseData.judges.map(j => (
                    <span key={j} className="bg-muted/50 px-3 py-1.5 rounded-xl text-[10px] font-bold border flex items-center gap-2">
                      <Gavel className="h-3 w-3 text-muted-foreground" /> {j}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-4 border-accent/20 bg-accent/5 rounded-[2.5rem] overflow-hidden shadow-xl">
            <CardHeader className="pb-2 p-6 border-b border-accent/10">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-accent">
                <FileText className="h-4 w-4" /> ProSeU Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              {caseData.keyTakeaways.map((item, i) => (
                <div key={i} className="flex gap-4 text-xs leading-relaxed italic text-primary/80 font-medium">
                  <div className="h-2 w-2 rounded-full bg-accent mt-1.5 shrink-0 shadow-[0_0_8px_rgba(204,154,67,0.5)]" />
                  <p>{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        {/* MAIN WIKI CONTENT */}
        <div className="lg:col-span-2 space-y-12">
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 pb-3">
              <ScrollText className="h-6 w-6 text-primary" />
              <h2 className="uppercase tracking-[0.2em] font-black text-xs text-primary">Executive Case Summary</h2>
            </div>
            <div className="prose prose-slate max-w-none">
              <p className="text-xl leading-relaxed first-letter:text-6xl first-letter:font-black first-letter:mr-4 first-letter:float-left first-letter:text-primary italic font-medium text-muted-foreground">
                {caseData.summary}
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 pb-3">
              <History className="h-6 w-6 text-primary" />
              <h2 className="uppercase tracking-[0.2em] font-black text-xs text-primary">Legal & Historical Impact</h2>
            </div>
            <div className="bg-[#020617] text-blue-100/80 p-10 rounded-[3rem] border-4 border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Scale className="h-32 w-32" />
              </div>
              <p className="leading-relaxed text-sm font-medium italic relative z-10">
                {caseData.legalImpact}
              </p>
            </div>
          </section>

          <footer className="pt-16 text-[9px] text-muted-foreground/50 border-t border-dashed space-y-4">
            <p className="uppercase tracking-[0.3em] font-black">CourtListener API Integration Verified</p>
            <p className="leading-relaxed italic">This organized case intelligence was synthesized directly from the official CourtListener API records for Case Reference: {id}. Data accuracy is synchronized with public judicial filings and corroborated with AI historical analysis. For educational purposes only.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
