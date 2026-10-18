
"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Plus, 
  Globe, 
  Sparkles, 
  FileText, 
  Users, 
  Calendar, 
  ChevronLeft,
  Loader2,
  Trash2,
  Clock,
  ShieldAlert,
  Send,
  Activity,
  Info,
  GripVertical,
  Upload,
  Gavel,
  ShieldCheck,
  Ban
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { extractCaseDataFromUrl } from "@/ai/flows/ai-url-data-extraction-flow";
import { generateLegalDebrief } from "@/ai/flows/ai-legal-debrief-flow";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const formSchema = z.object({
  // Case Identity
  caseNumber: z.string().default(""),
  caseTitle: z.string().min(2, "Title is required").default(""),
  courtName: z.string().default(""),
  courtType: z.string().default(""),
  jurisdiction: z.string().default(""),
  courtAddress: z.string().default(""),
  filingDate: z.string().default(""),
  caseType: z.string().default("Civil"),
  caseStatus: z.string().default("Active"),
  judge: z.string().default(""),
  courtClerk: z.string().default(""),
  courtClerkPhone: z.string().default(""),
  courtClerkEmail: z.string().default(""),

  // Party Intake
  parties: z.array(z.object({
    role: z.string().default("Plaintiff"),
    firstName: z.string().default(""),
    lastName: z.string().default(""),
    type: z.string().default("Individual"),
    address: z.string().default(""),
    phone: z.string().default(""),
    email: z.string().default(""),
    employer: z.string().default(""),
    representationStatus: z.string().default("Pro Se"),
    attorneyName: z.string().default(""),
    attorneyFirm: z.string().default(""),
    attorneyContact: z.string().default(""),
  })).default([]),

  // Claim and Legal Basis
  causeOfAction: z.string().default(""),
  claimDescription: z.string().default(""),
  potentialVerdicts: z.string().default(""),
  oppositionInfo: z.string().default(""),

  // Procedural Timeline
  timeline: z.array(z.object({
    id: z.string(),
    date: z.string().default(""),
    type: z.string().default(""),
    description: z.string().default(""),
    filingParty: z.string().default(""),
    courtAction: z.string().default(""),
    judge: z.string().default(""),
    notes: z.string().default(""),
  })).default([]),

  // Service of Process
  serviceAttempted: z.string().default("No"),
  serviceDates: z.string().default(""),
  serviceMethod: z.string().default(""),
  serviceResult: z.string().default(""),
  serviceAddress: z.string().default(""),
  serviceValidity: z.string().default(""),
  proofOfServiceFiled: z.string().default("No"),
  serviceNotes: z.string().default(""),

  // Warrant Information
  warrantIssued: z.string().default("No"),
  warrantDate: z.string().default(""),
  warrantType: z.string().default(""),
  warrantStatus: z.string().default(""),
  warrantDescription: z.string().default(""),

  // Court Orders and Judgments
  orderDate: z.string().default(""),
  orderType: z.string().default(""),
  orderJudge: z.string().default(""),
  orderDescription: z.string().default(""),
  judgmentIssued: z.string().default("No"),
  judgmentDescription: z.string().default(""),
  judgmentStatus: z.string().default(""),
  enforcementAuthorized: z.string().default("No"),

  // Case Disposition
  dispositionDate: z.string().default(""),
  dispositionType: z.string().default(""),
  dispositionInitiatedBy: z.string().default(""),
  withPrejudice: z.string().default(""),
  caseClosed: z.string().default("No"),
  eligibleRefiling: z.string().default("Yes"),

  // Document Inventory
  documents: z.array(z.object({
    id: z.string(),
    name: z.string().default(""),
    date: z.string().default(""),
    filedBy: z.string().default(""),
    type: z.string().default(""),
    available: z.string().default("No"),
    notes: z.string().default(""),
  })).default([]),

  // Evidence
  evidence: z.array(z.object({
    id: z.string(),
    type: z.string().default("Physical"),
    name: z.string().default(""),
    description: z.string().default(""),
  })).default([]),

  // Deadlines and Hearing
  deadlineDate: z.string().default(""),
  deadlineType: z.string().default(""),
  deadlineDescription: z.string().default(""),
  hearingScheduled: z.string().default("No"),
  hearingDate: z.string().default(""),
  hearingType: z.string().default(""),
  hearingResult: z.string().default(""),

  // Risk Assessment
  risk_judgmentLevel: z.string().default(""),
  risk_serviceValidity: z.string().default(""),
  risk_strengthRating: z.string().default(""),

  // Case Monitoring
  monitoringEnabled: z.string().default("No"),
  lastCheckedDate: z.string().default(""),
  nextReviewDate: z.string().default(""),
  alertsEnabled: z.string().default("No"),
  monitoringNotes: z.string().default(""),

  summary: z.string().default(""),
});

type FormValues = z.infer<typeof formSchema>;

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-[40px]">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 cursor-grab" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      {children}
    </TableRow>
  );
}

export default function NewCasePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [url, setUrl] = useState("");
  const [narrative, setNarrative] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      caseNumber: "",
      caseTitle: "",
      courtName: "",
      courtType: "",
      jurisdiction: "",
      courtAddress: "",
      filingDate: "",
      caseType: "Civil",
      caseStatus: "Active",
      judge: "",
      courtClerk: "",
      courtClerkPhone: "",
      courtClerkEmail: "",
      parties: [{ role: "Plaintiff", firstName: "", lastName: "", type: "Individual", address: "", phone: "", email: "", employer: "", representationStatus: "Pro Se", attorneyName: "", attorneyFirm: "", attorneyContact: "" }],
      causeOfAction: "",
      claimDescription: "",
      potentialVerdicts: "",
      oppositionInfo: "",
      timeline: [{ id: '1', date: "", type: "", description: "", filingParty: "", courtAction: "", judge: "", notes: "" }],
      serviceAttempted: "No",
      serviceDates: "",
      serviceMethod: "",
      serviceResult: "",
      serviceAddress: "",
      serviceValidity: "",
      proofOfServiceFiled: "No",
      serviceNotes: "",
      warrantIssued: "No",
      warrantDate: "",
      warrantType: "",
      warrantStatus: "",
      warrantDescription: "",
      orderDate: "",
      orderType: "",
      orderJudge: "",
      orderDescription: "",
      judgmentIssued: "No",
      judgmentDescription: "",
      judgmentStatus: "",
      enforcementAuthorized: "No",
      dispositionDate: "",
      dispositionType: "",
      dispositionInitiatedBy: "",
      withPrejudice: "",
      caseClosed: "No",
      eligibleRefiling: "Yes",
      documents: [{ id: '1', name: "", date: "", filedBy: "", type: "", available: "No", notes: "" }],
      evidence: [{ id: '1', type: "Physical", name: "", description: "" }],
      deadlineDate: "",
      deadlineType: "",
      deadlineDescription: "",
      hearingScheduled: "No",
      hearingDate: "",
      hearingType: "",
      hearingResult: "",
      risk_judgmentLevel: "",
      risk_serviceValidity: "",
      risk_strengthRating: "",
      monitoringEnabled: "No",
      lastCheckedDate: "",
      nextReviewDate: "",
      alertsEnabled: "No",
      monitoringNotes: "",
      summary: "",
    },
  });

  const { fields: partyFields, append: appendParty, remove: removeParty, replace: replaceParties } = useFieldArray({
    control: form.control,
    name: "parties",
  });

  const { fields: timelineFields, append: appendTimeline, remove: removeTimeline, replace: replaceTimeline, move: moveTimeline } = useFieldArray({
    control: form.control,
    name: "timeline",
  });

  const { fields: docFields, append: appendDoc, remove: removeDoc, replace: replaceDocs, move: moveDoc } = useFieldArray({
    control: form.control,
    name: "documents",
  });

  const { fields: evidenceFields, append: appendEvidence, remove: removeEvidence, replace: replaceEvidence, move: moveEvidence } = useFieldArray({
    control: form.control,
    name: "evidence",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndTimeline = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = timelineFields.findIndex((f) => f.id === active.id);
      const newIndex = timelineFields.findIndex((f) => f.id === over?.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        moveTimeline(oldIndex, newIndex);
      }
    }
  };

  const handleDragEndDoc = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = docFields.findIndex((f) => f.id === active.id);
      const newIndex = docFields.findIndex((f) => f.id === over?.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        moveDoc(oldIndex, newIndex);
      }
    }
  };

  const handleDragEndEvidence = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = evidenceFields.findIndex((f) => f.id === active.id);
      const newIndex = evidenceFields.findIndex((f) => f.id === over?.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        moveEvidence(oldIndex, newIndex);
      }
    }
  };

  async function onSubmit(values: FormValues) {
    setIsInitializing(true);
    try {
      const enrichedReport = await generateLegalDebrief({ caseData: values });
      sessionStorage.setItem("current_legal_debrief", JSON.stringify(enrichedReport));
      sessionStorage.setItem("current_case_meta", JSON.stringify({ title: values.caseTitle }));
      toast({ title: "Strategy Synchronized", description: "Your professional legal debrief has been compiled." });
      router.push("/prepare/debrief");
    } catch (e) {
      toast({ title: "Initialization Error", description: "AI research encountered a hurdle.", variant: "destructive" });
    } finally {
      setIsInitializing(false);
    }
  }

  const populateFormWithExtractedData = (data: any) => {
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null) {
        // @ts-ignore
        form.setValue(key, data[key]);
      }
    });
    
    if (data.parties && data.parties.length > 0) {
      replaceParties(data.parties.map((p: any) => ({ 
        role: p.role || "Plaintiff",
        firstName: p.firstName || "",
        lastName: p.lastName || "",
        type: p.type || "Individual",
        address: p.address || "",
        phone: p.phone || "",
        email: p.email || "",
        employer: p.employer || "",
        representationStatus: p.representationStatus || "Pro Se",
        attorneyName: p.attorneyName || "",
        attorneyFirm: p.attorneyFirm || "",
        attorneyContact: p.attorneyContact || "",
      })));
    }

    if (data.timeline && data.timeline.length > 0) {
      replaceTimeline(data.timeline.map((t: any, i: number) => ({ 
        id: `extracted-t-${i}-${Date.now()}`,
        date: t.date || "",
        type: t.type || "",
        description: t.description || "",
        filingParty: t.filingParty || "",
        courtAction: t.courtAction || "",
        judge: t.judge || "",
        notes: t.notes || "",
      })));
    }

    if (data.documents && data.documents.length > 0) {
      replaceDocs(data.documents.map((d: any, i: number) => ({ 
        id: `extracted-d-${i}-${Date.now()}`,
        name: d.name || "",
        date: d.date || "",
        filedBy: d.filedBy || "",
        type: d.type || "",
        available: d.available || "No",
        notes: d.notes || "",
      })));
    }
  };

  const handleUrlImport = async () => {
    if (!url) return;
    setIsImporting(true);
    try {
      const data = await extractCaseDataFromUrl({ url });
      populateFormWithExtractedData(data);
      toast({ title: "Intelligence Extracted", description: "Case details populated." });
    } catch (e) {
      toast({ title: "Import Failed", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleNarrativeAnalysis = async () => {
    if (!narrative) return;
    setIsImporting(true);
    try {
      const data = await extractCaseDataFromUrl({ rawText: narrative });
      populateFormWithExtractedData(data);
      toast({ title: "Narrative Analyzed", description: "AI has extrapolated case information." });
    } catch (e) {
      toast({ title: "Analysis Error", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 px-6 pt-8">
      <header className="space-y-4">
        <Link href="/prepare" className="flex items-center text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Strategy Hub
        </Link>
        <div className="flex items-center gap-4">
          <div className="bg-primary text-white p-3 rounded-2xl shadow-lg">
            <Plus className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-primary uppercase">Initialize Case File</h1>
            <p className="text-muted-foreground font-medium italic">Build your strategy with URL intelligence, narratives, or structured forms.</p>
          </div>
        </div>
      </header>

      {/* TIER 1: URL IMPORT */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest px-1 text-xs">
          <Globe className="h-4 w-4" />
          <h2>Import Case Data via URL</h2>
        </div>
        <Card className="border-2 border-dashed bg-muted/20 rounded-[2rem]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Paste a public court record URL to automatically populate your professional file.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input 
              placeholder="https://public-records.court.gov/case/..." 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="rounded-xl"
            />
            <Button onClick={handleUrlImport} disabled={isImporting} className="rounded-xl font-bold">
              {isImporting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Import"}
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* TIER 2: AI NARRATIVE */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-accent font-black uppercase tracking-widest px-1 text-xs">
          <Sparkles className="h-4 w-4" />
          <h2>AI-Assisted Narrative Analysis</h2>
        </div>
        <Card className="bg-primary/[0.02] border-2 border-accent/20 shadow-lg rounded-[2.5rem]">
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase tracking-tight">Describe Your Case Situation</CardTitle>
            <CardDescription className="text-xs italic">Tell your story in plain English. AI will extract names, dates, and claims for the forms below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="Example: I am being sued by a debt collector for a credit card I don't recognize. The court date is next month in Los Angeles..." 
              className="min-h-[180px] text-base leading-relaxed rounded-2xl p-6"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
            />
            <Button className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12 rounded-xl" onClick={handleNarrativeAnalysis} disabled={isImporting}>
              {isImporting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analyze Narrative & Populate Forms
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* TIER 3: STRUCTURED FORMS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest px-1 text-xs">
          <FileText className="h-4 w-4" />
          <h2>Detailed Case Information</h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Accordion type="multiple" className="w-full space-y-4" defaultValue={["identity"]}>
              
              <AccordionItem value="identity" className="bg-card border-2 rounded-[2rem] px-6">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-3 text-left">
                    <Info className="h-5 w-5 text-primary" />
                    <h3 className="font-bold uppercase tracking-tight">Case Identity</h3>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-8 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="caseNumber" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] uppercase font-black opacity-60">Case Number</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="caseTitle" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] uppercase font-black opacity-60">Case Title (Plaintiff v Defendant)</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="courtName" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] uppercase font-black opacity-60">Court Name</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="courtType" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] uppercase font-black opacity-60">Court Type</FormLabel><FormControl><Input className="rounded-xl" placeholder="Justice, District, Federal" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="jurisdiction" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] uppercase font-black opacity-60">Jurisdiction</FormLabel><FormControl><Input className="rounded-xl" placeholder="City, County, State" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="courtAddress" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] uppercase font-black opacity-60">Court Address</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="filingDate" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] uppercase font-black opacity-60">Filing Date</FormLabel><FormControl><Input className="rounded-xl" type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="caseType" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase font-black opacity-60">Case Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Type" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Criminal">Criminal</SelectItem>
                            <SelectItem value="Civil">Civil</SelectItem>
                            <SelectItem value="Administrative">Administrative</SelectItem>
                            <SelectItem value="Appellate">Appellate</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="parties" className="bg-card border-2 rounded-[2rem] px-6">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-3 text-left">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-bold uppercase tracking-tight">Party Intake</h3>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-8 space-y-6">
                  {partyFields.map((field, index) => (
                    <Card key={field.id} className="p-6 bg-muted/20 relative rounded-2xl border-2">
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeParty(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name={`parties.${index}.role`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] uppercase font-black opacity-60">Role</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Plaintiff">Plaintiff</SelectItem>
                                <SelectItem value="Defendant">Defendant</SelectItem>
                                <SelectItem value="Petitioner">Petitioner</SelectItem>
                                <SelectItem value="Respondent">Respondent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`parties.${index}.firstName`} render={({ field }) => (
                          <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-60">First Name</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`parties.${index}.lastName`} render={({ field }) => (
                          <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-60">Last Name</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`parties.${index}.email`} render={({ field }) => (
                          <FormItem><FormLabel className="text-[9px] uppercase font-black opacity-60">Email</FormLabel><FormControl><Input className="rounded-xl" type="email" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </Card>
                  ))}
                  <Button type="button" variant="outline" className="w-full rounded-xl h-12 border-2 dashed" onClick={() => appendParty({ role: "Plaintiff", firstName: "", lastName: "", type: "Individual", address: "", phone: "", email: "", employer: "", representationStatus: "Pro Se", attorneyName: "", attorneyFirm: "", attorneyContact: "" })}>
                    <Plus className="h-4 w-4 mr-2" /> Add Party Member
                  </Button>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="claims" className="bg-card border-2 rounded-[2rem] px-6">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-3 text-left">
                    <ShieldAlert className="h-5 w-5 text-primary" />
                    <h3 className="font-bold uppercase tracking-tight">Legal Basis</h3>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-8 space-y-4">
                  <FormField control={form.control} name="causeOfAction" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] uppercase font-black opacity-60">Cause of Action</FormLabel><FormControl><Input className="rounded-xl" placeholder="e.g. Breach of Contract" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="claimDescription" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] uppercase font-black opacity-60">Claim Description</FormLabel><FormControl><Textarea className="rounded-2xl min-h-[120px]" placeholder="Detailed facts of the dispute..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            <Button type="submit" size="lg" className="w-full rounded-full h-16 text-lg font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 mt-8" disabled={isInitializing}>
              {isInitializing ? (
                <>
                  <Loader2 className="animate-spin h-6 w-6 mr-2" /> 
                  Generating Strategy Debrief...
                </>
              ) : (
                "Initialize Strategy File"
              )}
            </Button>
          </form>
        </Form>
      </section>
    </div>
  );
}
