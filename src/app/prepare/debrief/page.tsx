
"use client"

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  Printer, 
  ArrowLeft, 
  ShieldAlert, 
  CheckCircle2, 
  Scale, 
  Compass,
  AlertTriangle,
  ScrollText,
  Loader2,
  Share2
} from "lucide-react";
import Link from "next/link";
import { LegalDebriefOutput } from "@/ai/flows/ai-legal-debrief-flow";

export default function DebriefPage() {
  const [debrief, setDebrief] = useState<LegalDebriefOutput | null>(null);
  const [caseTitle, setCaseTitle] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("current_legal_debrief");
    const meta = sessionStorage.getItem("current_case_meta");
    if (stored) {
      setDebrief(JSON.parse(stored));
    }
    if (meta) {
      setCaseTitle(JSON.parse(meta).title);
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDoc = () => {
    if (!reportRef.current || !debrief) return;

    const content = reportRef.current.innerHTML;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Legal Debrief</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + content + footer;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `ProSeU_Debrief_${caseTitle.replace(/\s+/g, '_') || 'Case'}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  if (!debrief) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Accessing Strategy Intelligence...</p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/prepare/new">Back to Case Builder</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-6 pt-8">
      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-20 z-40 bg-background/80 backdrop-blur-md p-4 rounded-[2rem] border shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/prepare/new">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-bold text-lg leading-none uppercase tracking-tighter">Strategy Debrief</h1>
            <p className="text-[10px] font-black uppercase text-muted-foreground mt-1 truncate max-w-[200px]">{caseTitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-full font-bold text-[10px] uppercase">
            <Printer className="h-3.5 w-3.5 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadDoc} className="rounded-full font-bold text-[10px] uppercase">
            <Download className="h-3.5 w-3.5 mr-2" /> Download
          </Button>
          <Button variant="default" size="sm" className="rounded-full bg-accent hover:bg-accent/90 font-bold text-[10px] uppercase px-6">
            <Share2 className="h-3.5 w-3.5 mr-2" /> Share
          </Button>
        </div>
      </div>

      {/* REPORT CONTENT */}
      <div ref={reportRef} className="space-y-10 print:space-y-6">
        <header className="text-center space-y-4 pt-8">
          <div className="bg-primary text-white w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-xl print:hidden">
            <Scale className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-primary uppercase print:text-2xl">Strategy Debrief</h1>
          <div className="flex flex-col items-center gap-1">
            <p className="text-xl font-bold text-accent print:text-lg">{caseTitle}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black opacity-60">Confidential Case Analysis • AI Research Enabled</p>
          </div>
          <hr className="border-t-2 border-primary/5" />
        </header>

        {/* EXECUTIVE SUMMARY */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] border-b pb-2">
            <ScrollText className="h-4 w-4" />
            <h2>Executive Summary</h2>
          </div>
          <p className="text-lg leading-relaxed italic text-muted-foreground first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:text-primary">
            {debrief.executiveSummary}
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-2 shadow-sm rounded-[2rem]">
            <CardHeader className="bg-muted/30 p-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary" />
                Jurisdiction
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <p className="text-sm leading-relaxed text-muted-foreground italic">
                {debrief.jurisdictionalAnalysis}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm rounded-[2rem]">
            <CardHeader className="bg-accent/10 p-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-accent">
                <FileText className="h-4 w-4" />
                Statutes & Precedent
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap italic">
                {debrief.researchNotes}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* PARTY SWOT ANALYSIS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] border-b pb-2">
            <AlertTriangle className="h-4 w-4" />
            <h2>Litigation SWOT Analysis</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {debrief.partyStrengths.map((party, idx) => (
              <Card key={idx} className="bg-muted/10 rounded-[2rem] border-none">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest">{party.party}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-4">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest opacity-60">Strengths</p>
                    <ul className="space-y-1.5">
                      {party.strengths.map((s, i) => (
                        <li key={i} className="text-[11px] flex gap-2 font-medium">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest opacity-60">Weaknesses</p>
                    <ul className="space-y-1.5">
                      {party.weaknesses.map((w, i) => (
                        <li key={i} className="text-[11px] flex gap-2 font-medium">
                          <ShieldAlert className="h-3 w-3 text-rose-500 shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* PROCEDURAL ROADMAP */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] border-b pb-2">
            <Scale className="h-4 w-4" />
            <h2>Procedural Roadmap</h2>
          </div>
          <div className="space-y-6">
            {debrief.proceduralRoadmap.map((phase, idx) => (
              <div key={idx} className="relative pl-8 border-l-2 border-primary/10 pb-6 last:pb-0">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                <h3 className="font-bold text-lg tracking-tight uppercase">{phase.phase}</h3>
                <div className="mt-4 grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Expected Protocol</p>
                    <ul className="list-disc pl-4 text-xs space-y-1.5 font-medium italic">
                      {phase.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-accent/5 p-5 rounded-[1.5rem] border-2 border-accent/10">
                    <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-2">Strategic Hurdle</p>
                    <p className="text-xs italic font-medium leading-relaxed">{phase.potentialHurdles}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-black uppercase tracking-widest text-[10px] border-b pb-2">
              <ShieldAlert className="h-4 w-4" />
              <h2>Strategic Risks</h2>
            </div>
            <ul className="space-y-3">
              {debrief.strategicRisks.map((risk, idx) => (
                <li key={idx} className="bg-rose-50 dark:bg-rose-900/10 border-l-4 border-rose-500 p-4 text-xs font-bold italic rounded-r-xl">
                  {risk}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 font-black uppercase tracking-widest text-[10px] border-b pb-2">
              <CheckCircle2 className="h-4 w-4" />
              <h2>Next Actions</h2>
            </div>
            <ul className="space-y-3">
              {debrief.suggestedActions.map((action, idx) => (
                <li key={idx} className="bg-emerald-50 dark:bg-emerald-900/10 border-l-4 border-emerald-500 p-4 text-xs font-bold italic rounded-r-xl">
                  {action}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="mt-20 border-t pt-10 text-[9px] text-muted-foreground text-center space-y-3 print:mt-10">
          <p className="uppercase tracking-[0.3em] font-black opacity-40">ProSeU University AI Certification</p>
          <p className="max-w-3xl mx-auto leading-relaxed italic px-10">
            DISCLAIMER: This report is generated by artificial intelligence for educational and strategic planning purposes only. It does NOT constitute legal advice. ProSeU is not a law firm and is not a substitute for an attorney. Always consult with a qualified legal professional before making final decisions in a legal matter.
          </p>
        </footer>
      </div>
    </div>
  );
}
