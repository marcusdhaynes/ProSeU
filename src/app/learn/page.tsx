
'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Flame, 
  Coins, 
  Zap, 
  ChevronRight, 
  BookOpen, 
  Scale, 
  Trophy, 
  Target, 
  ShoppingBag, 
  User, 
  MoreHorizontal,
  ChevronLeft,
  BookMarked,
  Layout,
  LayoutGrid,
  FileText,
  Globe,
  Video,
  Info,
  PlayCircle,
  ArrowLeft,
  ArrowRight,
  Library,
  Lightbulb,
  Briefcase,
  Table as TableIcon,
  Bookmark,
  AlignLeft,
  Play,
  Settings,
  Notebook as NotebookIcon,
  Book,
  AlertTriangle,
  Search,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabaseData } from '@/supabase/firebase-data-client';
import { NotebookWorkspace } from '@/components/learn/notebook/notebook-workspace';

// --- Types & Constants ---
type TierType = 'basic' | 'electrum' | 'orichalcum' | 'adamantine';

interface TierStyle {
  color: string;
  shadow: string;
  label: string;
}

const TIER_STYLES: Record<TierType, TierStyle> = {
  basic: { color: '', shadow: '', label: 'Basic' }, 
  electrum: { color: '#FFD54F', shadow: '#B29500', label: 'Electrum' }, 
  orichalcum: { color: '#FF4500', shadow: '#8B0000', label: 'Orichalcum' }, 
  adamantine: { color: '#1a1a1a', shadow: '#000000', label: 'Adamantine' },
};

const TIER_ORDER: TierType[] = ['basic', 'electrum', 'orichalcum', 'adamantine'];

const MASTERY_SECTIONS = [
  { 
    name: 'Core Principles', 
    desc: 'Foundational concepts and state-individual relationships.', 
    color: '#ff4b4b',
    principles: [
      { name: 'Authority', snippet: 'WHO HAS LEGAL POWER...' },
      { name: 'Rights', snippet: 'WHO IS PROTECTED...' },
      { name: 'Duties', snippet: 'WHO IS OBLIGATED...' },
      { name: 'Harm', snippet: 'WHAT COUNTS AS INJURY...' },
      { name: 'Causation', snippet: 'LEGAL RESPONSIBILITY LINK...' },
      { name: 'Remedy', snippet: 'LEGAL CONSEQUENCES...' },
      { name: 'Legitimacy', snippet: 'WHY AUTHORITY IS VALID...' }
    ]
  },
  { 
    name: 'Major Doctrines', 
    desc: 'Key rules, standards, and legal definitions.', 
    color: '#ff9600',
    principles: [
      { name: 'Jurisdiction Doctrines', snippet: 'AUTHORITY SCOPE DEFINED...' },
      { name: 'Liability Doctrines', snippet: 'CONDITIONS FOR RESPONSIBILITY...' },
      { name: 'Defense Doctrines', snippet: 'VALID EXCUSES...' },
      { name: 'Remedy Doctrines', snippet: 'AVAILABLE RELIEF...' },
      { name: 'Procedural Doctrines', snippet: 'CASE PROGRESSION RULES...' },
      { name: 'Constitutional Doctrines', snippet: 'RIGHTS AND STRUCTURE...' },
      { name: 'Equity Doctrines', snippet: 'FAIRNESS-BASED RULES...' }
    ]
  },
  { 
    name: 'Procedural Framework', 
    desc: 'Steps for application, enforcement, and adjudication.', 
    color: '#e6b400',
    principles: [
      { name: 'Jurisdiction Establishment', snippet: 'COURT AUTHORITY CONFIRMED...' },
      { name: 'Pleading', snippet: 'CLAIMS AND DEFENSES STATED...' },
      { name: 'Motion Practice', snippet: 'ISSUES RESOLVED EARLY...' },
      { name: 'Discovery', snippet: 'EVIDENCE OBTAINED...' },
      { name: 'Pre-trial Resolution', snippet: 'SETTLEMENT OR DISMISSAL...' },
      { name: 'Adjudication', snippet: 'CASE DECIDED...' },
      { name: 'Appeal and Review', snippet: 'DECISION REVIEWED...' }
    ]
  }, 
  { 
    name: 'Decision Standards', 
    desc: 'The lens through which the court decides outcomes.', 
    color: '#58cc02',
    principles: [
      { name: 'Authority-Defining Cases', snippet: 'WHO HOLDS AUTHORITY...' },
      { name: 'Rights-Defining Cases', snippet: 'SCOPE OF RIGHTS...' },
      { name: 'Limits-of-Power Cases', snippet: 'BOUNDARIES ENFORCED...' },
      { name: 'Procedure-Defining Cases', snippet: 'PROCESS REQUIREMENTS...' },
      { name: 'Liability-Expansion Cases', snippet: 'SCOPE BROADENED...' },
      { name: 'Liability-Restriction Cases', snippet: 'SCOPE NARROWED...' },
      { name: 'Paradigm-Shifting Cases', snippet: 'FRAMEWORK CHANGED...' }
    ]
  },
  { 
    name: 'Major Cases', 
    desc: 'Landmark judicial decisions and their impacts.', 
    color: '#1cb0f6',
    principles: [
      { name: 'Individual vs State Power', snippet: 'BALANCE OF POWER...' },
      { name: 'Fairness vs Efficiency', snippet: 'JUSTICE VS SYSTEM...' },
      { name: 'Predictability vs Flexibility', snippet: 'CONSISTENCY VS ADAPTATION...' },
      { name: 'Centralization vs Decentralization', snippet: 'POWER DISTRIBUTION...' },
      { name: 'Formalism vs Pragmatism', snippet: 'STRICT VS PRACTICAL...' },
      { name: 'Stability vs Evolution', snippet: 'CONTINUITY VS CHANGE...' },
      { name: 'Liberty vs Security', snippet: 'FREEDOM VS SAFETY...' }
    ]
  },
  { 
    name: 'Policy Debates', 
    desc: 'Controversies, reforms, and competing arguments.', 
    color: '#9333ea',
    principles: [
      { name: 'Issue Spotting', snippet: 'IDENTIFYING PROBLEMS...' },
      { name: 'Rule Extraction', snippet: 'DERIVING RULES...' },
      { name: 'Burden Manipulation', snippet: 'SHIFTING PROOF...' },
      { name: 'Evidence Structuring', snippet: 'ORGANIZING RECORDS...' },
      { name: 'Argument Construction', snippet: 'LOGICAL REASONING...' },
      { name: 'Procedural Leverage', snippet: 'USING PROCESS...' },
      { name: 'Judicial Psychology Navigation', snippet: 'UNDERSTANDING TENDENCIES...' }
    ]
  }, 
  { 
    name: 'Practical Skills', 
    desc: 'Real-world application, drafting, and advocacy.', 
    color: '#ff66aa',
    principles: [
      { name: 'Burden of Proof', snippet: 'WHO MUST PROVE...' },
      { name: 'Standard of Proof', snippet: 'HOW MUCH PROOF...' },
      { name: 'Standard of Review', snippet: 'APPELLATE REVIEW...' },
      { name: 'Level of Scrutiny', snippet: 'RIGHTS PROTECTION...' },
      { name: 'Evidentiary Weight', snippet: 'EVALUATING EVIDENCE...' },
      { name: 'Deference Doctrines', snippet: 'WHEN COURTS DEFER...' },
      { name: 'Balancing Tests', snippet: 'WEIGHING INTERESTS...' }
    ]
  },
];

const CAREER_PATHS = [
  { title: "[Career Potential Path 1]", market: "--", salary: "---,---" },
  { title: "[Career Potential Path 2]", market: "--", salary: "---,---" },
  { title: "[Career Potential Path 3]", market: "--", salary: "---,---" },
  { title: "[Career Potential Path 4]", market: "--", salary: "---,---" },
  { title: "[Career Potential Path 5]", market: "--", salary: "---,---" },
];

// --- Utilities ---
function darkenHex(hex: string, percent: number) {
  if (!hex || hex === 'currentColor') return "rgba(0,0,0,0.2)";
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// --- Path Components ---

function BeveledScaleIcon({ tierIdx, progress }: { tierIdx: number, progress: number }) {
  const isPrestige = tierIdx > 0;
  const isStarted = progress > 0;
  
  return (
    <Scale 
      className={cn(
        "h-7 w-7 rotate-[-20deg] transform transition-transform group-active:scale-95 z-40",
        isPrestige || isStarted ? "text-white" : "text-foreground/40"
      )} 
      style={{ 
        filter: "drop-shadow(0px 2px 0px rgba(0,0,0,0.9)) drop-shadow(0px -1px 0px rgba(255,255,255,0.2))" 
      }} 
    />
  );
}

function Segment({ index, color, tierIndex }: { index: number, color: string, tierIndex: number }) {
  const cx = 60;
  const cy = 60;
  const radius = 48;
  const strokeWidth = 10;
  
  const angleStep = 360 / 7;
  const gap = 18; 
  const startAngle = index * angleStep + gap / 2 - 90;
  const endAngle = (index + 1) * angleStep - gap / 2 - 90;
  
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  const describeArc = (x: number, y: number, radius: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, radius, endA);
    const end = polarToCartesian(x, y, radius, startA);
    const largeArcFlag = endA - startA <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y, 
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  const arcPath = describeArc(cx, cy, radius, startAngle, endAngle);
  
  let activeColor = "hsl(var(--muted))";
  let activeShadow = "hsl(var(--muted))";

  if (tierIndex === 0) {
    activeColor = color;
    activeShadow = darkenHex(color, 30);
  } else if (tierIndex > 0) {
    const style = TIER_STYLES[TIER_ORDER[tierIndex]];
    activeColor = style.color;
    activeShadow = style.shadow;
  }

  const isMuted = tierIndex === -1;
  const outlineColor = isMuted ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.9)";

  return (
    <g className="transition-all duration-500">
      <path d={arcPath} fill="none" stroke={outlineColor} strokeWidth={strokeWidth + 3.5} strokeLinecap="round" transform="translate(0, 5)" />
      <path d={arcPath} fill="none" stroke={outlineColor} strokeWidth={strokeWidth + 3.5} strokeLinecap="round" />
      <path d={arcPath} fill="none" stroke={activeShadow} strokeWidth={strokeWidth} strokeLinecap="round" transform="translate(0, 5)" />
      <path d={arcPath} fill="none" stroke={activeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      {!isMuted && (
        <path d={arcPath} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} strokeLinecap="round" transform="translate(0, -1)" />
      )}
    </g>
  );
}

function TieredProgressRing({ color, progress }: { color: string, progress: number }) {
  return (
    <svg 
      viewBox="0 0 120 120" 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 w-[6.5rem] h-[6.5rem]"
    >
      {[...Array(7)].map((_, i) => {
        let tierIdx = -1;
        if (progress >= 26 + i) tierIdx = 3;
        else if (progress >= 18 + i) tierIdx = 2;
        else if (progress >= 10 + i) tierIdx = 1;
        else if (progress >= 2 + i) tierIdx = 0;
        return <Segment key={i} index={i} color={color} tierIndex={tierIdx} />;
      })}
    </svg>
  );
}

function DuolingoNode({ color, progress, onNodeClick, id }: { 
  color: string, 
  progress: number, 
  onNodeClick: () => void,
  id: string 
}) {
  let currentTierIdx = -1;
  if (progress >= 25) currentTierIdx = 3;
  else if (progress >= 17) currentTierIdx = 2;
  else if (progress >= 9) currentTierIdx = 1;
  else if (progress >= 1) currentTierIdx = 0;

  let activeColor = "hsl(var(--muted))";
  let activeShadow = "hsl(var(--muted))";

  if (currentTierIdx === 0) {
    activeColor = color;
    activeShadow = darkenHex(color, 30);
  } else if (currentTierIdx > 0) {
    const style = TIER_STYLES[TIER_ORDER[currentTierIdx]];
    activeColor = style.color;
    activeShadow = style.shadow;
  }

  const isPrestige = currentTierIdx > 0;
  const outlineColor = "rgba(0,0,0,0.9)";

  return (
    <div className="relative group flex items-center justify-center w-20 h-20 shrink-0">
      {isPrestige && (
        <div className="absolute inset-[-0.75rem] pointer-events-none flex items-center justify-center z-0">
          <div className="w-14 h-14 rounded-full blur-2xl transition-opacity duration-1000" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)', animation: 'pulse-glow 2s infinite ease-in-out' }} />
        </div>
      )}
      <TieredProgressRing color={color} progress={progress} />
      <button 
        type="button"
        onClick={(e) => { e.stopPropagation(); onNodeClick(); }} 
        className="w-12 h-12 rounded-full relative transition-all active:translate-y-1 duration-100 flex items-center justify-center group z-10 overflow-hidden" 
        style={{ 
          backgroundColor: activeColor, 
          boxShadow: `0 5px 0 ${activeShadow}, 0 5px 0 2px ${outlineColor}, 0 0 0 2px ${outlineColor}` 
        }}
      >
        <div className="absolute inset-0 rounded-full border-[2px] border-black/30 pointer-events-none z-30" />
        <div className="absolute inset-[1px] rounded-full border-t-[2px] border-l-[2px] border-white/20 pointer-events-none z-30" />
        {isPrestige && <div className={cn("absolute inset-0 pointer-events-none opacity-80 z-20", TIER_ORDER[currentTierIdx] === 'orichalcum' ? "fiery-gloss" : "gloss-band")} />}
        <BeveledScaleIcon tierIdx={currentTierIdx} progress={progress} />
      </button>
    </div>
  );
}

function PathView({ course, nodeProgress, onNodeClick, isICM, setView, setIsICM }: { 
  course: any, 
  nodeProgress: Record<string, number>, 
  onNodeClick: (sIdx: number, bIdx: number) => void,
  isICM: boolean,
  setView: (v: 'academy' | 'domain' | 'course' | 'notebook') => void,
  setIsICM: (v: boolean) => void
}) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 scrollbar-hide">
      <header className="space-y-3">
        <button 
          type="button"
          onClick={() => setView('domain')} 
          className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-accent flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Curriculum
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-accent text-white p-3 rounded-2xl shadow-[0_6px_0_hsl(var(--accent)/0.7)]">
              <BookOpen className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-primary uppercase tracking-tight leading-none">{course.title}</h1>
              <p className="text-muted-foreground text-xs leading-relaxed mt-1.5 italic">
                {course.description || "Master the foundational principles and advanced procedures of this specialized legal certification track."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-xl border border-border shrink-0">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">ICM</Label>
            <Switch checked={isICM} onCheckedChange={setIsICM} className="scale-75 origin-right" />
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-black flex items-center gap-2 text-foreground uppercase tracking-widest">
          <AlignLeft className="h-4 w-4 text-accent" /> Overview
        </h2>
        <div className="bg-muted/20 border-2 border-muted rounded-[2rem] px-6 py-2 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-background/5" />
          <p className="text-xs leading-relaxed text-muted-foreground italic">
            [A structured, comprehensive curriculum overview specifically for {course.title}. This program utilizes the Universitas atomic knowledge base to ensure maximum pedagogical retention through 3D isometric progression.]
          </p>
        </div>
      </section>

      {isICM ? (
        <Accordion type="multiple" className="space-y-3">
          {MASTERY_SECTIONS.map((section, sIdx) => (
            <AccordionItem key={sIdx} value={`mastery-${sIdx}`} className="bg-muted/10 border-2 border-muted rounded-2xl overflow-hidden shadow-sm border-b-2 group/mastery">
              <AccordionTrigger className="px-6 py-3 hover:no-underline hover:bg-muted/5 transition-all text-foreground">
                <div className="flex items-center gap-3 text-left w-full">
                  <div className="bg-primary/10 p-2.5 rounded-lg text-primary flex items-center justify-center shadow-sm">
                    <Play className="h-4 w-4 fill-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-foreground text-base uppercase tracking-tight">{section.name}</h3>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">{section.desc}</p>
                  </div>
                  <div className="mr-4 w-32 space-y-1 shrink-0">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Mastery</span>
                      <span className="text-xs font-black text-foreground">0%</span>
                    </div>
                    <Progress value={0} className="h-1 bg-muted w-full" />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2 space-y-2 bg-background/40">
                 {section.principles.map((p, pIdx) => (
                   <div key={pIdx} className="flex items-start justify-between p-2.5 pr-6 bg-card rounded-xl border border-dashed border-border group/p hover:bg-accent/5 transition-all">
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary/10 p-2 rounded-lg text-primary flex items-center justify-center shadow-sm group-hover/p:bg-accent group-hover/p:text-white transition-colors shrink-0">
                            <Play className="h-3.5 w-3.5 fill-current" />
                          </div>
                          <div className="flex flex-col pt-0.5 items-start">
                            <span className="font-black text-foreground text-xs uppercase tracking-tight">{p.name}</span>
                            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">{p.snippet}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 px-1 w-[85%]">
                          <div className="flex-1 bg-muted/20 border border-border rounded-lg p-1.5 space-y-0.5">
                            <p className="text-[7px] font-black text-muted-foreground uppercase tracking-[0.2em]">Last Attempted</p>
                            <p className="text-[9px] font-bold text-foreground/80">
                              {(nodeProgress[`${sIdx}-${pIdx}`] || 0) > 0 ? "Today" : "Not yet attempted"}
                            </p>
                          </div>
                          <div className="flex-1 bg-muted/20 border border-border rounded-lg p-1.5 space-y-0.5">
                            <p className="text-[7px] font-black text-muted-foreground uppercase tracking-[0.2em]">Next Lesson</p>
                            <p className="text-[9px] font-bold text-accent">
                              {(nodeProgress[`${sIdx}-${pIdx}`] || 0) > 0 ? "Scheduled" : "Start track"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 self-center">
                        <DuolingoNode 
                          color={section.color} 
                          progress={nodeProgress[`${sIdx}-${pIdx}`] || 0} 
                          onNodeClick={() => onNodeClick(sIdx, pIdx)} 
                          id={`${sIdx}-${pIdx}`} 
                        />
                      </div>
                   </div>
                 ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <section className="space-y-12 flex flex-col items-center pt-6">
          {MASTERY_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className="space-y-8 flex flex-col items-center relative w-full">
              <div className="w-full flex items-center gap-3 px-8">
                <div className="flex-1 h-0.5 bg-muted" />
                <span className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">{section.name}</span>
                <div className="flex-1 h-0.5 bg-muted" />
              </div>

              <div className="relative w-56 flex flex-col items-center gap-6">
                {[...Array(7)].map((_, bIdx) => {
                  const offset = Math.sin(bIdx * 0.8) * 60;
                  const id = `${sIdx}-${bIdx}`;
                  const progress = nodeProgress[id] || 0;
                  
                  return (
                    <div key={bIdx} style={{ transform: `translateX(${offset}px)` }}>
                      <DuolingoNode 
                        color={section.color} 
                        progress={progress} 
                        onNodeClick={() => onNodeClick(sIdx, bIdx)} 
                        id={id} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function QuestItem({ label, current, total, color }: { label: string, current: number, total: number, color: string }) {
  const progress = (current / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center px-1">
        <span className="text-[8px] font-black text-foreground uppercase tracking-widest">{label}</span>
        <span className="text-[8px] font-black text-muted-foreground">{current}/{total}</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border shadow-inner">
        <div className={cn("h-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,0,0,0.1)]", color)} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

// --- Page Wrapper ---

export default function LearnPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [view, setView] = useState<'academy' | 'domain' | 'course' | 'notebook'>('academy');
  const [activeDomain, setActiveDomain] = useState<any>(null);
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [learnAccordionOpen, setLearnAccordionOpen] = useState(false);
  const [nodeProgress, setNodeProgress] = useState<Record<string, number>>({});
  const [isICM, setIsICM] = useState(false);

  const searchParams = useSearchParams();
  const domSlug = searchParams.get('dom');
  const courseSlug = searchParams.get('course');
  const viewParam = searchParams.get('view');
  const notebookTab = searchParams.get('tab') || 'toc';

  // Published curriculum comes exclusively from the normalized Supabase catalog.
  const [catalog, setCatalog] = useState<{ domains: any[]; fields: any[]; courses: any[] }>({
    domains: [], fields: [], courses: []
  });
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [doms, fields, courses] = await Promise.all([
          supabaseData.from('proseu_domains').select('*').eq('status', 'published').order('position').limit(1000),
          supabaseData.from('proseu_fields').select('*').eq('status', 'published').order('position').limit(1000),
          supabaseData.from('proseu_courses').select('*').eq('status', 'published').order('position').limit(1000)
        ]);
        for (const response of [doms, fields, courses]) if (response.error) throw response.error;
        if (!alive) return;
        setCatalog({
          domains: (doms.data || []).map(row => ({
            ...row.content, ...row, order: row.position, visible: true
          })),
          fields: (fields.data || []).map(row => ({
            ...row.content, ...row, domainId: row.domain_id, order: row.position, visible: true
          })),
          courses: (courses.data || []).map(row => ({
            ...row.content, ...row, domainId: row.domain_id, fieldId: row.field_id, order: row.position, visible: true
          }))
        });
      } catch (error) {
        if (alive) setCatalogError(error instanceof Error ? error.message : String(error));
      }
    };
    void load();
    return () => { alive = false; };
  }, []);

  const domains = catalog.domains;
  const fields = useMemo(() => catalog.fields.filter(f => f.domainId === activeDomain?.id), [catalog.fields, activeDomain?.id]);
  const coursesData = useMemo(() => catalog.courses.filter(c => c.domainId === activeDomain?.id), [catalog.courses, activeDomain?.id]);
  const courses = coursesData;

  // Sync state with URL
  useEffect(() => {
    if (viewParam === 'notebook') {
      setView('notebook');
      return;
    }

    if (domSlug && domains.length > 0) {
      const dom = domains.find(d => d.slug === domSlug);
      if (dom) {
        setActiveDomain(dom);
        setLearnAccordionOpen(true);
        if (courseSlug && coursesData) {
          const course = coursesData.find(c => c.slug === courseSlug);
          if (course) {
            setActiveCourse(course);
            setView('course');
          } else {
            setView('domain');
          }
        } else {
          setView('domain');
        }
      }
    } else {
      setView('academy');
    }
  }, [domSlug, courseSlug, domains, coursesData, viewParam]);

  const sortedDomains = useMemo(() => Array.isArray(domains) ? [...domains].sort((a, b) => (a.order || 0) - (b.order || 0)) : [], [domains]);
  const sortedFields = useMemo(() => Array.isArray(fields) ? [...fields].sort((a, b) => (a.order || 0) - (b.order || 0)) : [], [fields]);
  const sortedCourses = useMemo(() => Array.isArray(courses) ? [...courses].sort((a, b) => (a.order || 0) - (b.order || 0)) : [], [courses]);

  const router = useRouter();

  const handleDomainSelect = (dom: any) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('dom', dom.slug);
    params.delete('course');
    params.delete('view');
    router.push(`/learn?${params.toString()}`);
  };

  const handleCourseSelect = (course: any) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('dom', activeDomain.slug);
    params.set('course', course.slug);
    params.delete('view');
    router.push(`/learn?${params.toString()}`);
  };

  const handleNodeClick = (sIdx: number, bIdx: number) => {
    const id = `${sIdx}-${bIdx}`;
    setNodeProgress(prev => {
      const current = prev[id] || 0;
      if (current >= 32) return prev; 
      return { ...prev, [id]: current + 1 };
    });
  };

  return (
    <div className="flex h-[calc(100vh-56px)] w-full bg-background text-foreground font-body selection:bg-accent/30 relative overflow-hidden">
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .gloss-band {
          background: linear-gradient(135deg, transparent 0%, transparent 20%, rgba(255, 255, 255, 0.1) 25%, rgba(255, 255, 255, 0.7) 30%, rgba(255, 255, 255, 0.7) 40%, rgba(255, 255, 255, 0.1) 45%, transparent 50%, transparent 60%, rgba(255, 255, 255, 0.1) 65%, rgba(255, 255, 255, 0.7) 70%, rgba(255, 255, 255, 0.7) 80%, rgba(255, 255, 255, 0.1) 85%, transparent 90%);
        }
        .fiery-gloss {
          background: linear-gradient(135deg, transparent 0%, transparent 20%, rgba(255, 255, 255, 0.1) 25%, rgba(255, 215, 0, 0.6) 30%, rgba(255, 255, 255, 0.8) 35%, rgba(255, 215, 0, 0.6) 40%, rgba(255, 255, 255, 0.1) 45%, transparent 50%, transparent 55%, rgba(255, 255, 255, 0.1) 60%, rgba(255, 165, 0, 0.6) 65%, rgba(255, 255, 255, 0.8) 70%, rgba(255, 165, 0, 0.6) 75%, rgba(255, 255, 255, 0.1) 80%, transparent 85%);
        }
      `}</style>

      <aside className={cn("border-r border-border transition-all duration-300 flex flex-col py-4 relative z-50 bg-background scrollbar-hide overflow-y-auto", isSidebarOpen ? "w-56 px-3" : "w-16 px-2")}>
        <div className="mb-6 px-2 flex items-center justify-between">
          <div className={cn("flex items-center gap-1.5", !isSidebarOpen && "hidden")}>
            <Scale className="h-6 w-6 text-accent" />
            <span className="font-black text-xl tracking-tighter text-primary">ProSeU</span>
          </div>
          <button type="button" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Layout className="h-4 w-4" />}
          </button>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto pr-1 scrollbar-hide">
          <Accordion type="single" collapsible value={learnAccordionOpen ? "learn" : ""}>
            <AccordionItem value="learn" className="border-none">
              <AccordionTrigger asChild>
                <button 
                  type="button"
                  onClick={() => {
                    const nextState = !learnAccordionOpen;
                    setLearnAccordionOpen(nextState);
                    if (nextState) router.push('/learn');
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all font-black uppercase tracking-wider text-[11px] text-left",
                    (view === 'academy' || view === 'domain' || view === 'course') ? "bg-accent/10 border-2 border-accent text-accent" : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <BookOpen className="h-5 w-5 shrink-0" />
                  {isSidebarOpen && <span className="flex-1">Learn</span>}
                </button>
              </AccordionTrigger>
              <AccordionContent className="pt-1.5 pl-3 space-y-0.5">
                {isSidebarOpen && sortedDomains.map(dom => (
                  <button 
                    key={dom.id}
                    type="button"
                    onClick={() => handleDomainSelect(dom)}
                    className={cn(
                      "w-full text-left p-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                      activeDomain?.id === dom.id ? "text-accent bg-accent/5" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {dom.name}
                  </button>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <button 
            type="button" 
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('view', 'notebook');
              params.set('tab', 'toc');
              router.push(`/learn?${params.toString()}`);
            }}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all font-black uppercase tracking-wider text-[11px] text-left",
              view === 'notebook' ? "bg-accent/10 border-2 border-accent text-accent" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <NotebookIcon className="h-5 w-5 shrink-0 text-blue-500" />
            {isSidebarOpen && <span className="flex-1">Notebook</span>}
          </button>

          {[
            { label: 'Terms', icon: BookMarked, color: 'text-orange-500' },
            { label: 'Practice', icon: Zap, color: 'text-purple-500' },
            { label: 'Leaderboard', icon: Trophy, color: 'text-yellow-500' },
            { label: 'Quests', icon: Target, color: 'text-red-500' },
            { label: 'Shop', icon: ShoppingBag, color: 'text-accent' },
            { label: 'Profile', icon: User, color: 'text-emerald-500' },
            { label: 'More', icon: MoreHorizontal, color: 'text-muted-foreground' },
          ].map((item, i) => (
            <button key={i} type="button" className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-all font-black uppercase tracking-wider text-[11px] text-left hover:bg-muted text-muted-foreground">
              <item.icon className={cn("h-5 w-5 shrink-0", item.color)} />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {view === 'notebook' ? (
          <NotebookWorkspace activeTab={notebookTab} />
        ) : (
          <>
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-6 py-3 border-b border-border shadow-sm">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex flex-col">
                  <span className="text-muted-foreground font-black uppercase tracking-widest text-[9px]">
                    {view === 'course' ? activeCourse?.title : view === 'domain' ? activeDomain?.name : 'Academy Hub'}
                  </span>
                  <h1 className="text-lg font-black text-primary uppercase tracking-tight">ScholaIuris Curriculum</h1>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-full font-black text-[10px] border border-orange-500/20">
                    <Flame className="h-3.5 w-3.5 fill-orange-500" /> 48
                  </div>
                  <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-3 py-1.5 rounded-full font-black text-[10px] border border-yellow-500/20">
                    <Trophy className="h-3.5 w-3.5 fill-yellow-500" /> 1,240 XP
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto scroll-smooth relative px-6">
              <div className="py-8">
                {view === 'academy' && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="space-y-1.5">
                      <h2 className="text-2xl font-black text-primary tracking-tighter uppercase">Academic Domains</h2>
                      <p className="text-muted-foreground text-xs italic">Master the law through structured university-grade certification paths.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sortedDomains.map(dom => (
                        <Card key={dom.id} className="bg-card border-2 border-border hover:border-accent transition-all cursor-pointer group rounded-[2rem] overflow-hidden" onClick={() => handleDomainSelect(dom)}>
                          <CardContent className="px-6 py-5 space-y-2.5">
                            <div className="flex items-center gap-3">
                              <div className="bg-accent/10 p-3 rounded-xl text-accent group-hover:bg-accent group-hover:text-white transition-all shrink-0">
                                <LayoutGrid className="h-6 w-6" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-base font-black text-foreground uppercase tracking-tight truncate">{dom.name}</h3>
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mastery track certification</p>
                              </div>
                            </div>
                            <div className="relative">
                              <p className="text-[11px] text-muted-foreground leading-relaxed italic pr-8">
                                {dom.description || "Foundational and advanced legal modules."}
                              </p>
                              <div className="absolute bottom-0 right-0">
                                <PlayCircle className="h-6 w-6 text-muted-foreground group-hover:text-accent transition-colors" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {view === 'domain' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <header className="space-y-3">
                      <button type="button" onClick={() => setView('academy')} className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-accent flex items-center gap-1.5 transition-colors">
                        <ArrowLeft className="h-3 w-3" /> Back to Academy
                      </button>
                      <div className="flex items-center gap-4">
                        <div className="bg-accent p-3 rounded-2xl shadow-[0_6px_0_hsl(var(--accent)/0.7)] text-white">
                          <LayoutGrid className="h-8 w-8" />
                        </div>
                        <div>
                          <h1 className="text-3xl font-black text-primary uppercase tracking-tight">{activeDomain?.name}</h1>
                          <p className="text-muted-foreground text-xs leading-relaxed max-w-xl mt-0.5 italic">{activeDomain?.description}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <Button variant="ghost" className="w-full text-[9px] font-black uppercase tracking-widest text-accent hover:bg-accent/10 gap-1.5 h-10 px-3 rounded-xl border-2 border-accent/20 shadow-sm">
                          <FileText className="h-3.5 w-3.5" /> Books/Docs
                        </Button>
                        <Button variant="ghost" className="w-full text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 gap-1.5 h-10 px-3 rounded-xl border-2 border-emerald-100 shadow-sm">
                          <Globe className="h-3.5 w-3.5" /> Web/Articles
                        </Button>
                        <Button variant="ghost" className="w-full text-[9px] font-black uppercase tracking-widest text-orange-500 hover:bg-orange-100 shadow-sm gap-1.5 h-10 px-3 rounded-xl border-2 border-orange-100">
                          <Video className="h-3.5 w-3.5" /> Videos/Audio
                        </Button>
                      </div>
                    </header>

                    <div className="space-y-10">
                      {sortedFields.map(field => {
                        const fieldCourses = sortedCourses.filter(c => c.fieldId === field.id);
                        return (
                          <section key={field.id} className="space-y-4">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-1 rounded-full bg-yellow-500" />
                              <h2 className="text-lg font-black uppercase tracking-widest text-foreground">{field.name}</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {fieldCourses.map(course => (
                                <Card key={course.id} className="bg-card border-2 border-border hover:border-accent transition-all group rounded-[2rem] overflow-hidden flex flex-col relative">
                                  <CardContent className="px-6 py-5 flex flex-col h-full space-y-2.5">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-yellow-500/10 p-3 rounded-xl text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white transition-all shrink-0">
                                        <Bookmark className="h-5 w-5" />
                                      </div>
                                      <div className="min-w-0">
                                        <h3 className="text-xs font-black text-foreground uppercase tracking-tight truncate group-hover:text-accent transition-colors cursor-pointer" onClick={() => handleCourseSelect(course)}>{course.title}</h3>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Certified Course Unit</p>
                                      </div>
                                    </div>
                                    <div className="flex-1 relative">
                                      <p className="text-[10px] text-muted-foreground italic leading-relaxed line-clamp-3 pr-6 cursor-pointer" onClick={() => handleCourseSelect(course)}>
                                        {course.description || "Course modules pending..."}
                                      </p>
                                      <div className="absolute bottom-[-1rem] right-[-1rem]">
                                        <button type="button" onClick={() => handleCourseSelect(course)} className="text-muted-foreground hover:text-accent transition-colors p-2">
                                          <PlayCircle className="h-6 w-6" />
                                        </button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </div>
                )}

                {view === 'course' && activeCourse && (
                  <>
                    <PathView 
                      course={activeCourse} 
                      nodeProgress={nodeProgress} 
                      onNodeClick={handleNodeClick}
                      isICM={isICM}
                      setView={setView}
                      setIsICM={setIsICM}
                    />
                    <div className="h-24" />
                  </>
                )}
              </div>
            </div>

            {view === 'course' && activeCourse && (
              <section className="absolute bottom-0 left-0 right-0 z-[60] bg-background/95 backdrop-blur-md border-t-2 border-border shadow-lg group/drawer scrollbar-hide">
                <div className="w-full">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="career-drawer" className="border-none">
                      <AccordionTrigger className="px-8 py-1.5 hover:no-underline hover:bg-muted transition-all">
                        <div className="flex flex-col items-start gap-0">
                          <h2 className="text-lg font-black tracking-tight text-primary uppercase tracking-[0.2em]">Career Potential</h2>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Strategic opportunities within this specialization.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-8 pb-3 pt-2 max-h-[50vh] overflow-y-auto scrollbar-hide">
                        <div className="space-y-2">
                          {CAREER_PATHS.map((path, idx) => (
                            <Accordion key={idx} type="single" collapsible className="bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all hover:border-accent/30">
                              <AccordionItem value={`career-${idx}`} className="border-none">
                                <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted transition-all text-xs">
                                  <div className="flex items-center gap-3 text-left w-full">
                                    <div className="bg-accent/10 p-1.5 rounded-lg text-accent shrink-0"><Briefcase className="h-3.5 w-3.5" /></div>
                                    <div className="flex-1 min-w-0">
                                      <span className="font-black text-foreground text-[10px] uppercase tracking-tight truncate block">{path.title}</span>
                                    </div>
                                    <div className="flex items-center gap-4 mr-2 shrink-0">
                                      <div className="text-right">
                                        <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest leading-none">Market</p>
                                        <p className="text-[9px] font-black text-foreground">{path.market}%</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest leading-none">Avg Sal</p>
                                        <p className="text-[9px] font-black text-foreground">${path.salary}</p>
                                      </div>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4 pt-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                      <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5"><TableIcon className="h-3.5 w-3.5" /> Salary Tiers</h4>
                                      <TableUI className="border border-border rounded-xl overflow-hidden bg-card">
                                        <TableHeader className="bg-muted">
                                          <TableRow className="border-border">
                                            <TableHead className="text-[9px] font-black uppercase text-foreground h-8 px-2">Level</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase text-foreground h-8 px-2">Monthly</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase text-foreground h-8 px-2">Annual</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {['Entry', 'Median', 'Top'].map((level, i) => (
                                            <TableRow key={i} className="border-border hover:bg-muted/50">
                                              <TableCell className="text-[10px] font-black text-foreground px-2 py-1.5">{level}</TableCell>
                                              <TableCell className="text-[10px] text-muted-foreground px-2 py-1.5">$---,---</TableCell>
                                              <TableCell className="text-[10px] font-black text-accent px-2 py-1.5">$---,---</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </TableUI>
                                    </div>
                                    <div className="space-y-4">
                                      <div className="space-y-1">
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Field Impact</h4>
                                        <p className="text-[10px] leading-relaxed text-muted-foreground italic">[Describe societal and professional impact...]</p>
                                      </div>
                                      <div className="space-y-1">
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5" /> Historical Legacy</h4>
                                        <p className="text-[10px] leading-relaxed text-muted-foreground italic">[Describe historical evolution...]</p>
                                      </div>
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {view !== 'notebook' && (
        <aside className={cn("w-72 px-3 py-3 space-y-3 bg-background relative z-50 transition-all border-l border-border scrollbar-hide overflow-y-auto", !isSidebarOpen && "hidden")}>
          <div className="flex items-center justify-between mb-3 bg-muted/30 p-2 rounded-xl border border-border">
            <div className="flex items-center gap-1">
              <LayoutGrid className="h-4 w-4 text-emerald-500" />
              <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
              <Zap className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-red-500 fill-red-500" />
                <span className="font-black text-xs text-red-500">48</span>
              </div>
              <div className="flex items-center gap-1">
                <Coins className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-black text-xs text-yellow-500">2242</span>
              </div>
              <div className="bg-accent rounded-md px-1 py-0.5 font-black text-[9px] text-white">XP</div>
            </div>
          </div>

          <Card className="rounded-[1.5rem] border-2 border-red-500 shadow-sm overflow-hidden bg-red-500/5">
            <CardHeader className="p-2.5 bg-red-500 text-white">
              <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" /> Daily Quests
              </CardTitle>
            </CardHeader>
            <div className="h-[1px] bg-white/20 mx-2.5" />
            <CardContent className="p-2.5 space-y-3">
              <QuestItem label="Earn 30 XP" current={30} total={30} color="bg-yellow-500" />
              <QuestItem label="Spend 10 mins learning" current={8} total={10} color="bg-accent" />
              <QuestItem label="Complete 3 perfect lessons" current={0} total={3} color="bg-emerald-500" />
            </CardContent>
          </Card>

          {view === 'course' && activeCourse && (
            <div className="space-y-2.5 animate-in fade-in zoom-in duration-300">
              <Card className="rounded-[1.5rem] border-2 border-accent shadow-sm overflow-hidden bg-accent/5">
                <CardHeader className="p-2.5 bg-accent text-white">
                  <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-yellow-400" /> Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2.5 space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-foreground">
                      <span>Completion</span>
                      <span>0%</span>
                    </div>
                    <Progress value={0} className="h-1 bg-muted" />
                  </div>
                  <div className="p-2 bg-muted/20 rounded-xl space-y-0.5 border border-border">
                    <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Last Studied</p>
                    <p className="text-[10px] font-black text-foreground">N/A</p>
                  </div>
                  <div className="p-2 bg-red-500/10 rounded-xl space-y-0.5 border border-red-200/50">
                    <p className="text-[7px] font-black text-red-500 uppercase tracking-widest">Difficulty Area</p>
                    <p className="text-[10px] font-black text-foreground">Analysis Pending</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[1.5rem] border-2 border-muted bg-card shadow-sm overflow-hidden">
                <CardHeader className="p-2.5 bg-muted text-foreground">
                  <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Library className="h-3.5 w-3.5" /> Reference
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-1">
                  {[
                    { icon: Video, label: "Videos" },
                    { icon: BookOpen, label: "Books" },
                    { icon: FileText, label: "Articles" },
                    { icon: Globe, label: "Websites" },
                  ].map((item, i) => (
                    <Button key={i} variant="ghost" className="w-full justify-start gap-2 h-8 text-[8px] font-black uppercase tracking-[0.2em] bg-muted/20 hover:bg-muted/40 border border-border rounded-lg px-2 group shadow-sm transition-all">
                      <item.icon className="h-3 w-3 text-muted-foreground group-hover:text-accent" />
                      <span className="text-foreground">{item.label}</span>
                      <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-[1.5rem] border-2 border-yellow-500 shadow-sm overflow-hidden bg-yellow-500/5">
                <CardHeader className="p-2.5 bg-yellow-500 text-white">
                  <CardTitle className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5" /> Coach Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded-full border border-yellow-200/50 flex items-center justify-center">
                       <Info className="h-2.5 w-2.5 text-yellow-600" />
                    </div>
                    <span className="text-[8px] font-black text-foreground uppercase tracking-widest">Advice</span>
                  </div>
                  <p className="text-[9px] leading-relaxed text-muted-foreground italic border-l-2 border-yellow-500/30 pl-2 py-0.5">
                    "Strategic Performance Advice: Focus on major doctrine elements within this specialization."
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
