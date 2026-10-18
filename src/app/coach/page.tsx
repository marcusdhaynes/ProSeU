"use client"

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Bot, 
  FileText, 
  MessageCircle, 
  ShieldAlert, 
  BrainCircuit, 
  Loader2,
  Sparkles,
  Search,
  Scale,
  Send,
  ShieldCheck,
  AlertTriangle,
  ThumbsUp,
  XCircle,
  Plus,
  BookOpen,
  History,
  Eraser,
  Download,
  Gavel,
  ChevronRight,
  Users,
  CheckCircle2,
  Zap
} from "lucide-react";
import { 
  aiLegalTermSimplification, 
  AILegalTermSimplificationOutput 
} from "@/ai/flows/ai-legal-term-simplification-flow";
import { 
  aiCourtroomInteraction, 
  AICourtroomInteractionOutput 
} from "@/ai/flows/ai-courtroom-interaction-flow";
import {
  analyzeSituation,
} from "@/ai/flows/ai-situation-analysis-flow";
import {
  draftLegalDocument,
  AIDocumentDraftingOutput
} from "@/ai/flows/ai-document-drafting-flow";
import {
  aiMockHearingSimulation,
  AIMockHearingSimulationOutput
} from "@/ai/flows/ai-mock-hearing-simulation-flow";
import {
  aiExaminationCoach,
  AIExaminationCoachOutput
} from "@/ai/flows/ai-examination-coach-flow";
import { sanitizeAnalysisOutput, SanitizedAnalysis } from "@/services/analysisOutputSanitizer";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { EditableContent } from "@/components/editable-content";
import { useDevMode } from "@/components/dev-mode-context";
import { cn } from "@/lib/utils";

function CoachContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "analysis";
  const initialSituation = searchParams.get("situation");

  const [activeTab, setActiveTab] = useState(initialTab);
  const { isEditMode } = useDevMode();
  const { toast } = useToast();
  
  // Situation Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [userSituation, setUserSituation] = useState(initialSituation || "");
  const [analysisResult, setAnalysisResult] = useState<SanitizedAnalysis | null>(null);

  // Term Simplification State
  const [simplifying, setSimplifying] = useState(false);
  const [term, setTerm] = useState("");
  const [simplified, setSimplified] = useState<AILegalTermSimplificationOutput | null>(null);

  // Courtroom Interaction State
  const [simulating, setSimulating] = useState(false);
  const [scenario, setScenario] = useState("");
  const [interactRole, setInteractRole] = useState("Plaintiff");
  const [simulationResult, setSimulationResult] = useState<AICourtroomInteractionOutput | null>(null);

  // Drafting State
  const [drafting, setDrafting] = useState(false);
  const [draftType, setDraftType] = useState("Motion");
  const [draftJurisdiction, setDraftJurisdiction] = useState("");
  const [draftCaseDetails, setDraftCaseDetails] = useState("");
  const [draftFacts, setDraftFacts] = useState("");
  const [draftInstructions, setDraftInstructions] = useState("");
  const [draftResult, setDraftResult] = useState<AIDocumentDraftingOutput | null>(null);

  // Mock Hearing State
  const [mocking, setMocking] = useState(false);
  const [mockRole, setMockRole] = useState("Plaintiff");
  const [mockCaseType, setMockCaseType] = useState("Civil");
  const [mockStatement, setMockStatement] = useState("");
  const [mockResponse, setMockResponse] = useState<AIMockHearingSimulationOutput | null>(null);
  const [mockHistory, setMockHistory] = useState<{role: 'user' | 'model', content: string}[]>([]);

  // Examination Coach State
  const [examining, setExamining] = useState(false);
  const [examType, setExamType] = useState("Direct");
  const [examPerspective, setExamPerspective] = useState("Attorney");
  const [examCaseContext, setExamCaseContext] = useState("");
  const [examWitnessDetails, setExamWitnessDetails] = useState("");
  const [examResult, setExamResult] = useState<AIExaminationCoachOutput | null>(null);

  useEffect(() => {
    if (initialSituation && initialTab === "analysis") {
      handleAnalyzeSituation(initialSituation);
    }
  }, [initialSituation, initialTab]);

  const handleAnalyzeSituation = async (textToAnalyze?: string) => {
    const input = textToAnalyze || userSituation;
    if (!input.trim() || isEditMode) return;
    
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeSituation({ situation: input });
      const sanitized = sanitizeAnalysisOutput(result);
      setAnalysisResult(sanitized);
    } catch (e: any) {
      console.error("Analysis failed", e);
      toast({
        title: "Analysis Failed",
        description: "An error occurred during analysis.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSimplify = async () => {
    if (!term || isEditMode) return;
    setSimplifying(true);
    try {
      const result = await aiLegalTermSimplification({ legalTerm: term });
      setSimplified(result);
    } catch (e: any) {
      console.error("Failed to simplify term", e);
      toast({ title: "Error", description: "Failed to simplify term.", variant: "destructive" });
    } finally {
      setSimplifying(false);
    }
  };

  const handleSimulate = async () => {
    if (!scenario || isEditMode) return;
    setSimulating(true);
    try {
      const result = await aiCourtroomInteraction({
        scenario: "Courtroom Hearing",
        role: interactRole,
        context: scenario,
      });
      setSimulationResult(result);
    } catch (e) {
      console.error("Simulation failed", e);
      toast({ title: "Error", description: "Simulation failed.", variant: "destructive" });
    } finally {
      setSimulating(false);
    }
  };

  const handleDraft = async () => {
    if (!draftCaseDetails || !draftJurisdiction || isEditMode) return;
    setDrafting(true);
    try {
      const result = await draftLegalDocument({
        documentType: draftType as any,
        jurisdiction: draftJurisdiction,
        caseDetails: draftCaseDetails,
        relevantFacts: draftFacts,
        specificInstructions: draftInstructions,
      });
      setDraftResult(result);
    } catch (e) {
      console.error("Drafting failed", e);
      toast({ title: "Drafting Failed", description: "An error occurred while drafting.", variant: "destructive" });
    } finally {
      setDrafting(false);
    }
  };

  const handleMock = async () => {
    if (!mockStatement || isEditMode) return;
    setMocking(true);
    try {
      const result = await aiMockHearingSimulation({
        userRole: mockRole,
        caseType: mockCaseType,
        userStatement: mockStatement,
        conversationHistory: mockHistory,
      });
      setMockResponse(result);
      setMockHistory(prev => [
        ...prev, 
        { role: 'user', content: mockStatement },
        { role: 'model', content: result.aiResponse }
      ]);
      setMockStatement("");
    } catch (e) {
      console.error("Mock hearing failed", e);
      toast({ title: "Simulation Error", variant: "destructive" });
    } finally {
      setMocking(false);
    }
  };

  const handleExamine = async () => {
    if (!examCaseContext || !examWitnessDetails || isEditMode) return;
    setExamining(true);
    try {
      const result = await aiExaminationCoach({
        examinationType: examType as any,
        perspective: examPerspective as any,
        caseContext: examCaseContext,
        witnessDetails: examWitnessDetails,
      });
      setExamResult(result);
    } catch (e) {
      console.error("Examination prep failed", e);
      toast({ title: "Preparation Failed", variant: "destructive" });
    } finally {
      setExamining(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 px-6 pt-8">
      <header className="flex items-center gap-4">
        <div className="bg-primary text-white p-3 rounded-2xl shadow-lg">
          <Bot className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <EditableContent 
            tag="h1"
            contentKey="coach_header_title"
            content="AI Legal Coach"
            className="text-3xl font-bold tracking-tight text-primary uppercase"
          />
          <EditableContent 
            tag="p"
            contentKey="coach_header_desc"
            content="Strategic guidance and professional insight at your fingertips."
            className="text-muted-foreground font-medium italic"
          />
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-6 h-auto p-1 gap-1 bg-muted/50 rounded-2xl">
          <TabsTrigger value="analysis" className="py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest">
            <Search className="mr-2 h-4 w-4" /> 
            Analysis
          </TabsTrigger>
          <TabsTrigger value="simplify" className="py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest">
            <BookOpen className="mr-2 h-4 w-4" /> 
            Terms
          </TabsTrigger>
          <TabsTrigger value="draft" className="py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest">
            <FileText className="mr-2 h-4 w-4" /> 
            Draft
          </TabsTrigger>
          <TabsTrigger value="interact" className="py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest">
            <ShieldAlert className="mr-2 h-4 w-4" /> 
            Objections
          </TabsTrigger>
          <TabsTrigger value="examine" className="py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest">
            <Zap className="mr-2 h-4 w-4" /> 
            Examination
          </TabsTrigger>
          <TabsTrigger value="mock" className="py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest">
            <BrainCircuit className="mr-2 h-4 w-4" /> 
            Mock Hearing
          </TabsTrigger>
        </TabsList>

        {/* SITUATION ANALYSIS TAB */}
        <TabsContent value="analysis" className="mt-6 space-y-8 animate-in fade-in duration-500">
          {!analysisResult && (
            <Card className="border-2 shadow-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight">
                  <Scale className="h-5 w-5 text-accent" />
                  Strategic Situation Breakdown
                </CardTitle>
                <CardDescription className="text-xs italic">
                  Provide the details of your legal situation for an objective, layman-phrased strategic review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="relative">
                  <Textarea 
                    placeholder="Describe what happened, who is involved, and what your goals are..."
                    className="min-h-[180px] p-6 text-base rounded-2xl border-2"
                    value={userSituation}
                    onChange={(e) => setUserSituation(e.target.value)}
                    disabled={isEditMode}
                  />
                  <div className="flex justify-end p-2">
                    <Button 
                      className="rounded-full px-8 h-12 font-bold shadow-lg shadow-primary/20"
                      onClick={() => handleAnalyzeSituation()}
                      disabled={analyzing || !userSituation.trim() || isEditMode}
                    >
                      {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Analyze Situation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {analysisResult && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex gap-4 items-start">
                <Avatar className="h-12 w-12 border-2 border-accent shadow-lg">
                  <AvatarFallback className="bg-accent text-white"><Bot className="h-6 w-6" /></AvatarFallback>
                </Avatar>
                <Card className="flex-1 bg-accent/5 border-accent/20 rounded-[2.5rem] shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Our Perspective
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl leading-relaxed italic text-primary/90 font-medium">
                      {analysisResult.laymanSummary}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-8 pl-0 md:pl-16">
                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-primary flex items-center gap-2 px-2">
                    <Scale className="h-4 w-4 text-accent" /> 
                    Legal Landscape
                  </h3>
                  <div className="bg-muted/20 p-8 rounded-[2rem] border-2 border-muted leading-relaxed text-sm text-muted-foreground italic">
                    {analysisResult.legalLandscape}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-primary flex items-center gap-2 px-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" /> 
                    Risk Assessment
                  </h3>
                  <div className="bg-muted/20 p-8 rounded-[2rem] border-2 border-muted leading-relaxed text-sm text-muted-foreground italic">
                    {analysisResult.riskFactors}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pl-0 md:pl-16">
                <Card className="border-none bg-emerald-600 text-white rounded-[2.5rem] shadow-xl shadow-emerald-600/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4" /> 
                      Recommended (Do/Say)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-bold leading-relaxed whitespace-pre-wrap">{analysisResult.recommendedActions}</div>
                  </CardContent>
                </Card>
                <Card className="border-none bg-rose-600 text-white rounded-[2.5rem] shadow-xl shadow-rose-600/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <XCircle className="h-4 w-4" /> 
                      Avoid (Don't Do/Say)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-bold leading-relaxed whitespace-pre-wrap">{analysisResult.avoidActions}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="pl-0 md:pl-16">
                <div className="relative bg-[#020617] text-white rounded-[3rem] p-10 md:p-16 overflow-hidden shadow-2xl border-4 border-accent/20">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ShieldCheck className="h-40 w-40" />
                  </div>
                  <div className="relative z-10 space-y-6">
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-4 text-white uppercase">
                      <ShieldCheck className="h-8 w-8 text-accent" />
                      Strategic Guidance
                    </h2>
                    <div className="text-base font-medium leading-relaxed text-blue-100/80 whitespace-pre-wrap italic">
                      {analysisResult.strategicGuidance}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center pt-12 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-primary uppercase tracking-tight">Ready to Formalize Your Strategy?</h3>
                  <p className="text-muted-foreground text-sm max-w-xl mx-auto italic">Take these insights and build a professional case file. Organize facts, track parties, and set automated deadline reminders.</p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Button asChild size="lg" className="rounded-full px-12 h-16 text-lg font-bold shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90">
                      <Link href={isEditMode ? "#" : "/prepare/new"}>
                        Build Case File <Plus className="ml-2 h-6 w-6" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => setAnalysisResult(null)} className="rounded-full px-10 h-16 border-2 font-bold uppercase tracking-widest text-xs">
                      Analyze Another Situation
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* SIMPLIFY TERMS TAB */}
        <TabsContent value="simplify" className="mt-6 space-y-8 animate-in fade-in duration-500">
          <Card className="border-2 shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight">
                <BookOpen className="h-5 w-5 text-accent" />
                Legal Term Simplification
              </CardTitle>
              <CardDescription className="text-xs italic">
                Paste any complex legal term or Latin phrase to get an authoritative, plain-English explanation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex gap-3">
                <Input 
                  placeholder="e.g. Res Ipsa Loquitur, Estoppel, Summary Judgment..."
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="h-14 text-base rounded-xl border-2"
                  disabled={isEditMode}
                />
                <Button onClick={handleSimplify} disabled={simplifying || !term || isEditMode} className="h-14 px-10 font-bold rounded-xl shadow-lg">
                  {simplifying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Simplify"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {simplified && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-2 rounded-[2rem] overflow-hidden">
                  <CardHeader className="bg-muted/20 border-b">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                      <Scale className="h-4 w-4 text-accent" /> Official Definition
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-8">
                    <p className="text-sm leading-relaxed font-medium text-foreground/80">{simplified.officialDefinition}</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-accent/20 bg-accent/5 rounded-[2rem] overflow-hidden">
                  <CardHeader className="bg-accent/10 border-b border-accent/10">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Simplified Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-8">
                    <p className="text-base font-bold leading-relaxed italic text-primary">{simplified.simplifiedExplanation}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-4">
                  <History className="h-4 w-4" /> Historical Precedents & Context
                </h3>
                <div className="grid gap-4">
                  {simplified.famousCases.map((c, i) => (
                    <Card key={i} className="border-2 rounded-2xl hover:border-accent transition-colors">
                      <CardContent className="flex gap-6 p-6">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner">
                          <Gavel className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-base text-primary uppercase tracking-tight">{c.name}</p>
                          <p className="text-sm text-muted-foreground leading-relaxed italic">{c.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* DRAFT MOTION TAB */}
        <TabsContent value="draft" className="mt-6 space-y-8 animate-in fade-in duration-500">
          <div className="grid lg:grid-cols-[1fr_400px] gap-10">
            <Card className="border-2 shadow-sm rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight">
                  <FileText className="h-5 w-5 text-accent" />
                  Intelligent Document Drafting
                </CardTitle>
                <CardDescription className="text-xs italic">
                  Generate professional legal drafts based on your case details. Always review with counsel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Document Type</label>
                    <Select onValueChange={setDraftType} value={draftType}>
                      <SelectTrigger className="h-12 rounded-xl border-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Motion">Motion</SelectItem>
                        <SelectItem value="Argument">Argument</SelectItem>
                        <SelectItem value="Closing Statement">Closing Statement</SelectItem>
                        <SelectItem value="Legal Filing">Legal Filing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Jurisdiction</label>
                    <Input placeholder="e.g. California Superior Court" className="h-12 rounded-xl border-2" value={draftJurisdiction} onChange={e => setDraftJurisdiction(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Case Overview</label>
                  <Textarea placeholder="Who are the parties and what is the nature of the dispute?" className="rounded-xl border-2 min-h-[100px]" value={draftCaseDetails} onChange={e => setDraftCaseDetails(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Relevant Facts & Evidence</label>
                  <Textarea placeholder="List the core facts that support this filing..." className="rounded-xl border-2 min-h-[100px]" value={draftFacts} onChange={e => setDraftFacts(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Specific AI Instructions</label>
                  <Textarea placeholder="Any specific arguments or tone you want the AI to prioritize?" className="rounded-xl border-2 min-h-[100px]" value={draftInstructions} onChange={e => setDraftInstructions(e.target.value)} />
                </div>
                <Button className="w-full h-14 font-bold rounded-full shadow-lg shadow-primary/20 text-lg uppercase tracking-tight" onClick={handleDraft} disabled={drafting || isEditMode}>
                  {drafting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <FileText className="h-5 w-5 mr-2" />}
                  Generate Professional Draft
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {draftResult ? (
                <Card className="border-4 border-primary/20 bg-card rounded-[3rem] sticky top-24 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                  <CardHeader className="border-b-2 border-dashed bg-muted/10 pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-widest">Draft Preview</CardTitle>
                      <Button variant="ghost" size="sm" className="rounded-xl hover:bg-primary hover:text-white transition-colors" onClick={() => window.print()}>
                        <Download className="h-4 w-4 mr-2" /> Print PDF
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-8">
                    <ScrollArea className="h-[550px] w-full p-6 bg-white dark:bg-[#0a0a0a] border-2 border-dashed rounded-[2rem] font-serif text-sm leading-relaxed shadow-inner">
                      <div className="whitespace-pre-wrap italic text-foreground/90">{draftResult.draftedDocument}</div>
                    </ScrollArea>
                    <div className="mt-6 p-4 bg-rose-500/10 border-2 border-rose-500/20 rounded-2xl">
                      <p className="text-[10px] text-rose-600 font-bold uppercase leading-tight italic">{draftResult.disclaimer}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-4 border-dashed rounded-[3rem] bg-muted/5 opacity-40">
                  <div className="text-center space-y-4 p-10">
                    <FileText className="h-20 w-20 mx-auto text-muted-foreground/30" />
                    <div className="space-y-1">
                      <p className="text-lg font-bold uppercase tracking-tight text-primary">Draft Pending</p>
                      <p className="text-xs italic">Populate the professional form to witness your AI-generated legal document.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* OBJECTION COACH TAB */}
        <TabsContent value="interact" className="mt-6 space-y-8 animate-in fade-in duration-500">
          <div className="grid md:grid-cols-[450px_1fr] gap-10 items-start">
            <Card className="border-2 shadow-sm rounded-[2.5rem] overflow-hidden flex flex-col">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight">
                  <ShieldAlert className="h-5 w-5 text-accent" />
                  Objection & Interaction Coach
                </CardTitle>
                <CardDescription className="text-xs italic">
                  Describe a specific testimony or event from your trial to receive strategic responses.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Your Role</label>
                  <Select onValueChange={setInteractRole} value={interactRole}>
                    <SelectTrigger className="h-12 rounded-xl border-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Plaintiff">Plaintiff</SelectItem>
                      <SelectItem value="Defendant">Defendant</SelectItem>
                      <SelectItem value="Witness">Witness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">What Just Happened?</label>
                  <Textarea 
                    placeholder="Opposing counsel just asked a question about my past records..." 
                    className="min-h-[180px] rounded-xl border-2 p-6"
                    value={scenario}
                    onChange={e => setScenario(e.target.value)}
                  />
                </div>
                <Button className="w-full h-14 font-bold rounded-full shadow-lg shadow-primary/20 text-lg uppercase tracking-tight" onClick={handleSimulate} disabled={simulating || !scenario || isEditMode}>
                  {simulating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldAlert className="h-5 w-5 mr-2" />}
                  Get Strategic Guidance
                </Button>
              </CardContent>
            </Card>

            <div className="flex flex-col">
              {simulationResult ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <Card className="border-none bg-rose-600 text-white rounded-[2.5rem] shadow-xl shadow-rose-600/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" /> Potential Objections
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {simulationResult.suggestedObjections.map((obj, i) => (
                          <li key={i} className="text-sm font-bold flex items-start gap-3 bg-white/10 p-3 rounded-xl border border-white/10">
                            <ChevronRight className="h-4 w-4 text-white mt-0.5 shrink-0" /> {obj}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-none bg-emerald-600 text-white rounded-[2.5rem] shadow-xl shadow-emerald-600/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Strategic Questions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {simulationResult.crossExaminationQuestions.map((q, i) => (
                          <li key={i} className="text-sm font-bold flex items-start gap-3 bg-white/10 p-3 rounded-xl border border-white/10 italic">
                            <ChevronRight className="h-4 w-4 text-white mt-0.5 shrink-0" /> {q}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-4 border-accent/20 bg-accent/5 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-accent/10 border-b border-accent/10 pb-3">
                      <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">AI Strategic Reasoning</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <p className="text-sm leading-relaxed italic text-primary font-medium">{simulationResult.reasoning}</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-4 border-dashed rounded-[3rem] bg-muted/5 opacity-40 py-20">
                  <div className="text-center p-12 space-y-6">
                    <ShieldAlert className="h-20 w-20 mx-auto text-muted-foreground/30" />
                    <div className="space-y-2">
                      <p className="text-lg font-bold uppercase tracking-tight text-primary">Coach Ready</p>
                      <p className="text-xs italic max-w-[250px] mx-auto">Describe a courtroom scenario to get instant coaching on objections and questioning.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* EXAMINATION COACH TAB */}
        <TabsContent value="examine" className="mt-6 space-y-8 animate-in fade-in duration-500">
          <div className="grid md:grid-cols-[450px_1fr] gap-10 items-start">
            <Card className="border-2 shadow-sm rounded-[2.5rem] overflow-hidden flex flex-col">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight text-primary">
                  <Zap className="h-5 w-5 text-accent" />
                  Examination Coach
                </CardTitle>
                <CardDescription className="text-xs italic">
                  Prepare for Direct or Cross-examination from either perspective.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Exam Type</label>
                    <Select value={examType} onValueChange={setExamType}>
                      <SelectTrigger className="h-11 rounded-xl border-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Direct">Direct Exam</SelectItem>
                        <SelectItem value="Cross">Cross Exam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Your Perspective</label>
                    <Select value={examPerspective} onValueChange={setExamPerspective}>
                      <SelectTrigger className="h-11 rounded-xl border-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Attorney">Attorney</SelectItem>
                        <SelectItem value="Witness">Witness</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Case Context</label>
                  <Textarea 
                    placeholder="Briefly describe the nature of the dispute..." 
                    className="min-h-[100px] rounded-xl border-2 p-4"
                    value={examCaseContext}
                    onChange={e => setExamCaseContext(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Witness Details</label>
                  <Textarea 
                    placeholder="Who is the witness and what is their role/testimony?" 
                    className="min-h-[100px] rounded-xl border-2 p-4"
                    value={examWitnessDetails}
                    onChange={e => setExamWitnessDetails(e.target.value)}
                  />
                </div>
                <Button className="w-full h-14 font-bold rounded-full shadow-lg shadow-accent/20 text-lg uppercase tracking-tight bg-accent hover:bg-accent/90" onClick={handleExamine} disabled={examining || !examCaseContext || !examWitnessDetails || isEditMode}>
                  {examining ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Zap className="h-5 w-5 mr-2" />}
                  Generate Examination Strategy
                </Button>
              </CardContent>
            </Card>

            <div className="flex flex-col">
              {examResult ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <Card className="border-4 border-accent/20 bg-accent/5 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-accent/10 border-b border-accent/10">
                      <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-accent">
                        <Sparkles className="h-4 w-4" /> Strategic Advice
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                      <p className="text-base font-medium leading-relaxed italic text-primary">{examResult.strategicAdvice}</p>
                    </CardContent>
                  </Card>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="rounded-[2rem] border-2 shadow-sm">
                      <CardHeader className="bg-muted/30 pb-2">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                          <Gavel className="h-4 w-4 text-accent" /> Recommended Questions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <ul className="space-y-3">
                          {examResult.suggestedQuestions.map((q, i) => (
                            <li key={i} className="text-sm font-bold flex items-start gap-3 bg-muted/20 p-3 rounded-xl border border-muted-foreground/10 italic">
                              <ChevronRight className="h-4 w-4 text-accent mt-0.5 shrink-0" /> {q}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[2rem] border-2 shadow-sm border-rose-500/20">
                      <CardHeader className="bg-rose-500/10 pb-2">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4" /> Trap Identification
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <ul className="space-y-3">
                          {examResult.potentialTraps.map((trap, i) => (
                            <li key={i} className="text-sm font-bold flex items-start gap-3 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                              <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" /> {trap}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-[2.5rem] border-2 border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
                    <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/10">
                      <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Morning-of Checklist
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {examResult.preparationChecklist.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-emerald-200">
                            <div className="h-5 w-5 rounded-full border-2 border-emerald-500 shrink-0 flex items-center justify-center">
                              <div className="h-2 w-2 bg-emerald-500 rounded-full" />
                            </div>
                            <span className="text-xs font-bold text-emerald-900">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-4 border-dashed rounded-[3rem] bg-muted/5 opacity-40 py-20">
                  <div className="text-center space-y-6 max-w-sm px-10">
                    <Zap className="h-20 w-20 mx-auto text-muted-foreground/30" />
                    <div className="space-y-2">
                      <p className="text-lg font-bold uppercase tracking-tight text-primary">Intelligence Hub Ready</p>
                      <p className="text-xs italic">Define your role and the witness context to receive professional examination directives and traps to avoid.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* MOCK HEARING TAB */}
        <TabsContent value="mock" className="mt-6 space-y-8 animate-in fade-in duration-500">
          <div className="grid md:grid-cols-[450px_1fr] gap-10 items-start">
            <Card className="border-2 shadow-sm rounded-[2.5rem] overflow-hidden flex flex-col">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight text-primary">
                  <BrainCircuit className="h-5 w-5 text-accent" />
                  Hearing Config
                </CardTitle>
                <CardDescription className="text-xs italic">
                  Define your role and case type to start the simulation.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Your Role</label>
                    <Select value={mockRole} onValueChange={setMockRole}>
                      <SelectTrigger className="h-11 rounded-xl border-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Plaintiff">Plaintiff</SelectItem>
                        <SelectItem value="Defendant">Defendant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Case Type</label>
                    <Select value={mockCaseType} onValueChange={setMockCaseType}>
                      <SelectTrigger className="h-11 rounded-xl border-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Civil">Civil Dispute</SelectItem>
                        <SelectItem value="Criminal">Criminal</SelectItem>
                        <SelectItem value="Family">Family Law</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="w-full space-y-2 pt-4 border-t border-dashed">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Your Statement</label>
                  <Textarea 
                    placeholder="Enter your argument or response to the judge..."
                    value={mockStatement}
                    onChange={e => setMockStatement(e.target.value)}
                    className="min-h-[120px] rounded-2xl border-2 p-4 text-sm focus-visible:ring-accent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleMock();
                      }
                    }}
                  />
                </div>
                <Button 
                  className="w-full h-12 rounded-xl bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20 font-bold uppercase tracking-widest text-[10px]" 
                  onClick={handleMock} 
                  disabled={mocking || !mockStatement || isEditMode}
                >
                  {mocking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Send to Court
                </Button>
                <Button variant="outline" className="w-full text-[10px] font-bold uppercase tracking-widest border-2 rounded-xl h-11 hover:bg-muted" onClick={() => {
                  setMockHistory([]);
                  setMockResponse(null);
                }}>
                  <Eraser className="h-3.5 w-3.5 mr-2" /> Reset Simulation
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-8 flex flex-col">
              <Card className={cn(
                "border-2 rounded-[2.5rem] overflow-hidden shadow-sm transition-all flex flex-col",
                mockHistory.length === 0 ? "border-4 border-dashed bg-muted/5 opacity-40" : "bg-muted/5"
              )}>
                <CardHeader className="bg-muted/20 border-b">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                    <BrainCircuit className="h-5 w-5 text-accent" /> Courtroom Simulation
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1 p-8">
                    {mockHistory.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-20">
                        <div className="bg-muted p-6 rounded-full shadow-inner"><MessageCircle className="h-12 w-12" /></div>
                        <div className="space-y-2">
                          <p className="text-lg font-bold uppercase tracking-tight text-primary">Courtroom Empty</p>
                          <p className="text-xs italic max-w-sm mx-auto">Define your role and provide your opening statement in the Hearing Config to begin the simulation.</p>
                        </div>
                      </div>
                    )}
                    <div className="space-y-8">
                      {mockHistory.map((msg, i) => (
                        <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                          <Avatar className={`h-10 w-10 shadow-md ${msg.role === 'model' ? 'border-2 border-accent' : 'border-2 border-primary'}`}>
                            <AvatarFallback className={msg.role === 'model' ? 'bg-accent text-white' : 'bg-primary text-white'}>
                              {msg.role === 'model' ? <Gavel className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`flex-1 p-6 rounded-3xl text-sm leading-relaxed font-medium shadow-sm ${msg.role === 'user' ? 'bg-primary text-white ml-16' : 'bg-card border-2 mr-16 italic'}`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {mocking && (
                        <div className="flex gap-4 animate-pulse">
                          <Avatar className="h-10 w-10 border-2 border-accent">
                            <AvatarFallback className="bg-accent text-white"><Loader2 className="h-5 w-5 animate-spin" /></AvatarFallback>
                          </Avatar>
                          <div className="flex-1 h-16 bg-muted rounded-3xl" />
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {mockResponse?.feedback && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <Card className="border-4 border-accent/20 bg-accent/5 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-accent/10 border-b border-accent/10 pb-3">
                      <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-accent">
                        <Sparkles className="h-4 w-4" /> Coach Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                      <p className="text-base font-medium leading-relaxed italic text-primary font-medium">{mockResponse.feedback}</p>
                      <div className="mt-6 pt-6 border-t border-accent/20">
                        <p className="text-[9px] font-bold text-accent uppercase mb-2 tracking-widest">Judge's Expected Query</p>
                        <p className="text-sm font-bold text-primary italic">"{mockResponse.nextActionPrompt}"</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] text-muted-foreground italic animate-pulse">Initializing Research Intelligence...</div>}>
      <CoachContent />
    </Suspense>
  );
}
