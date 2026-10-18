"use client"

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, 
  Scale, 
  AlertTriangle, 
  ThumbsUp, 
  XCircle, 
  CheckCircle2, 
  Gavel, 
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import Markdown from "react-markdown";
import { GoogleGenAI } from "@google/genai";

function AnalysisContent() {
  const searchParams = useSearchParams();
  const situation = searchParams.get("situation") || "";
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (situation) {
      handleAnalyze();
    }
  }, [situation]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key not configured.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const systemPrompt = `You are an advanced legal guidance engine for an app called "ProSeU". You provide structured, high-quality, non-binding legal guidance based strictly on user input. You MUST NOT fabricate facts, distort details, or provide misleading certainty.

TONE & ACCESSIBILITY:
- Use professional, accurate language (as if from a top law firm).
- Keep it accessible and simple for individuals with minimal education who may feel overwhelmed.
- Be clear, concise, and empathetic.

MANDATORY FORMATTING RULES:
- IMMEDIATE ACTIONS (DO/DO NOT): EVERY item MUST start with "- ". You MUST include a double line break (\\n\\n) between each item.
- POTENTIAL OUTCOMES: EVERY item MUST start with "- ". You MUST include a double line break (\\n\\n) between each item.
- NEXT STEPS: EVERY item MUST start with "1. ", "2. ", etc. Do NOT include extra line breaks between items (use single \\n).
- SIMILAR CASES: EVERY item MUST start with "1. ", "2. ", etc. MUST include a double line break (\\n\\n) between each case.
- Do NOT use any horizontal separators like "---" or "===".
- Ensure every item in a list starts on a new line.

OUTPUT STRUCTURE:

[DISCLAIMER]
(This must ALWAYS be exactly one sentence.)
This information is for general informational purposes only and does not constitute legal advice or create an attorney-client relationship.

[SUMMARY]
(2–4 sentences)
Accurately summarize the user’s situation without omitting key facts or adding assumptions.

[LEGAL INTERPRETATION]
(2–4 sentences)
Explain what the situation means from a legal standpoint using plain but precise language.

[IMMEDIATE ACTIONS]
LEFT PANEL — GREEN (DO):
- (Actionable step 1)

- (Actionable step 2)

- (Actionable step 3)

RIGHT PANEL — RED (DO NOT):
- (Mistake to avoid 1)

- (Mistake to avoid 2)

- (Mistake to avoid 3)

[AREA OF LAW]
(1 line)
State the primary legal category.

[POTENTIAL OUTCOMES]
LEFT PANEL — GREEN (POSITIVE):
- Best Case Scenario: (Description)

- Likeliest Good Case Scenario: (Description)

- Other Potential Positive Outcome: (Description)

RIGHT PANEL — RED (NEGATIVE):
- Worst Case Scenario: (Description)

- Likeliest Bad Case Scenario: (Description)

- Other Potential Negative Outcome: (Description)

[NEXT STEPS — COMPREHENSIVE PLAN]
1. (Step 1)
2. (Step 2)
3. (Step 3)

[SIMILAR CASES]
1. Case Name — 1–2 sentence explanation of similarity.

2. Case Name — explanation.

3. Case Name — explanation.

STYLE + UI INTEGRATION RULES:
- Use concise headers exactly as written.
- Content must be easily scannable.
- “DO” = positive, action-oriented tone.
- “DO NOT” = cautionary, protective tone.
- Avoid legal jargon unless necessary; if used, keep it simple.
- Maintain visual symmetry between DO and DO NOT sections.

FAILSAFE RULES:
- If the situation is unclear, still produce output using best interpretation WITHOUT asking questions.
- If legal certainty is low, reflect uncertainty carefully (e.g., “may,” “could,” “depends on jurisdiction”).
- NEVER provide absolute guarantees.
- NEVER encourage illegal activity.
- ALWAYS prioritize user safety and legal risk reduction.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: situation,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      setResult(response.text || "No analysis generated.");
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const parseSection = (text: string, header: string) => {
    const regex = new RegExp(`\\[${header}\\]([\\s\\S]*?)(?=\\[|$)`, 'i');
    const match = text.match(regex);
    if (!match) return null;
    
    // Clean up any stray horizontal separators that the model might still include
    return match[1]
      .replace(/^[ \t]*[-=_]{3,}[ \t]*$/gm, '')
      .trim();
  };

  const parseSplitSection = (text: string, header: string, leftLabel: string, rightLabel: string) => {
    const section = parseSection(text, header);
    if (!section) return { left: null, right: null };

    const leftRegex = new RegExp(`${leftLabel}:([\\s\\S]*?)(?=${rightLabel}|$)`, 'i');
    const rightRegex = new RegExp(`${rightLabel}:([\\s\\S]*?)$`, 'i');

    const leftPart = section.match(leftRegex);
    const rightPart = section.match(rightRegex);

    return {
      left: leftPart ? leftPart[1].trim() : null,
      right: rightPart ? rightPart[1].trim() : null
    };
  };

  const forceList = (text: string | null, type: 'bullet' | 'number' = 'bullet', doubleSpacing: boolean = false) => {
    if (!text) return null;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    const formatted = lines.map(line => {
      if (type === 'bullet') {
        if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) return line;
        return `- ${line}`;
      } else {
        if (/^\d+\.\s/.test(line)) return line;
        return `1. ${line}`;
      }
    });
    return formatted.join(doubleSpacing ? '\n\n' : '\n');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold uppercase tracking-widest text-primary">Analyzing Situation</h2>
          <p className="text-xs text-muted-foreground italic">Consulting legal precedents and strategic frameworks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto pt-20 text-center space-y-6">
        <div className="bg-rose-500/10 p-8 rounded-[2rem] border-2 border-rose-500/20">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-rose-600 uppercase mb-2">Analysis Failed</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button asChild variant="outline" className="rounded-full px-8 h-12 font-bold uppercase tracking-widest text-xs">
          <Link href="/">Try Again</Link>
        </Button>
      </div>
    );
  }

  if (!result) return null;

  const disclaimer = parseSection(result, "DISCLAIMER");
  const summary = parseSection(result, "SUMMARY");
  const interpretation = parseSection(result, "LEGAL INTERPRETATION");
  const actions = parseSplitSection(result, "IMMEDIATE ACTIONS", "LEFT PANEL — GREEN \\(DO\\)", "RIGHT PANEL — RED \\(DO NOT\\)");
  const areaOfLaw = parseSection(result, "AREA OF LAW");
  const outcomes = parseSplitSection(result, "POTENTIAL OUTCOMES", "LEFT PANEL — GREEN \\(POSITIVE\\)", "RIGHT PANEL — RED \\(NEGATIVE\\)");
  const nextSteps = parseSection(result, "NEXT STEPS — COMPREHENSIVE PLAN");
  const similarCases = parseSection(result, "SIMILAR CASES");

  const MarkdownComponents = {
    p: ({ children }: any) => <p className="mb-4 last:mb-0">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc pl-4 space-y-4 mb-4">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-4 space-y-4 mb-4">{children}</ol>,
    li: ({ children }: any) => <li className="pl-1">{children}</li>,
  };

  const TightMarkdownComponents = {
    p: ({ children }: any) => <p className="mb-1 last:mb-0">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc pl-4 space-y-1 mb-2">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-4 space-y-1 mb-2">{children}</ol>,
    li: ({ children }: any) => <li className="pl-1">{children}</li>,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 px-4">
      <header className="flex items-center justify-between pt-4">
        <Button variant="ghost" size="sm" asChild className="rounded-full hover:bg-muted">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
          </Link>
        </Button>
        <div className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] border border-accent/20">
          <Sparkles className="h-3.5 w-3.5" />
          PROSEU GUIDANCE ENGINE
        </div>
      </header>

      {disclaimer && (
        <div className="bg-muted/30 border-2 border-dashed border-muted-foreground/20 p-4 rounded-2xl text-center">
          <p className="text-[10px] font-medium italic text-muted-foreground leading-relaxed">
            {disclaimer}
          </p>
        </div>
      )}

      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2 px-2">
            <Bot className="h-4 w-4 text-accent" /> Situation Summary
          </h2>
          <Card className="border-2 shadow-sm rounded-[2rem] bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <p className="text-lg leading-relaxed font-medium text-primary/90 italic">
                {summary}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2 px-2">
            <Scale className="h-4 w-4 text-accent" /> Legal Interpretation
          </h2>
          <div className="bg-muted/20 p-8 rounded-[2rem] border-2 border-muted leading-relaxed text-base text-muted-foreground italic">
            {interpretation}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2 px-2">
            <ShieldCheck className="h-4 w-4 text-accent" /> Immediate Actions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none bg-emerald-600 text-white rounded-[2rem] shadow-xl shadow-emerald-600/10">
              <CardHeader className="pb-2 border-b border-white/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4" /> DO
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-sm font-bold leading-relaxed max-w-none">
                  <Markdown components={MarkdownComponents}>{forceList(actions.left, 'bullet', true)}</Markdown>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none bg-rose-600 text-white rounded-[2rem] shadow-xl shadow-rose-600/10">
              <CardHeader className="pb-2 border-b border-white/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <XCircle className="h-4 w-4" /> DO NOT
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-sm font-bold leading-relaxed max-w-none">
                  <Markdown components={MarkdownComponents}>{forceList(actions.right, 'bullet', true)}</Markdown>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Potential Outcomes
            </h2>
            <div className="bg-primary text-white px-3 py-1 rounded-lg font-black uppercase tracking-widest text-[8px]">
              {areaOfLaw}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 border-emerald-500/20 bg-emerald-500/5 rounded-[2rem]">
              <CardHeader className="py-4 px-6 border-b border-emerald-500/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Positive Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-sm leading-relaxed text-emerald-700 font-bold max-w-none">
                  <Markdown components={MarkdownComponents}>{forceList(outcomes.left, 'bullet', true)}</Markdown>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-rose-500/20 bg-rose-500/5 rounded-[2rem]">
              <CardHeader className="py-4 px-6 border-b border-rose-500/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Negative Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-sm leading-relaxed text-rose-700 font-bold max-w-none">
                  <Markdown components={MarkdownComponents}>{forceList(outcomes.right, 'bullet', true)}</Markdown>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2 px-2">
            <CheckCircle2 className="h-4 w-4 text-accent" /> Next Steps — Comprehensive Plan
          </h2>
          <Card className="border-2 shadow-sm rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-10 bg-muted/5">
              <div className="max-w-none font-medium text-primary/80 leading-loose">
                <Markdown components={TightMarkdownComponents}>{forceList(nextSteps, 'number', false)}</Markdown>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2 px-2">
            <Gavel className="h-4 w-4 text-accent" /> Similar Cases & Precedents
          </h2>
          <Card className="border-2 shadow-sm rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-10 bg-[#020617] text-white">
              <div className="max-w-none font-medium leading-relaxed italic opacity-90">
                <Markdown components={MarkdownComponents}>{forceList(similarCases, 'number', true)}</Markdown>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="text-center pt-10">
        <Button asChild size="lg" className="rounded-full px-12 h-16 text-lg font-bold shadow-2xl shadow-primary/20">
          <Link href="/prepare/new">
            Build Case File Now
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function SituationAnalysisPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    }>
      <AnalysisContent />
    </Suspense>
  );
}
