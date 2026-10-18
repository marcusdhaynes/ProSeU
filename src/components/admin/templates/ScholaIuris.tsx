'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Play
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
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

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
  if (!hex) return "#252f36";
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
        "h-8 w-8 rotate-[-20deg] transform transition-transform group-active:scale-95 z-40",
        isPrestige || isStarted ? "text-white" : "text-white/40"
      )} 
      style={{ 
        filter: "drop-shadow(0px 2px 0px rgba(0,0,0,0.2)) drop-shadow(0px -1px 0px rgba(255,255,255,0.4))" 
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
  const gap = 14; 
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
  
  let activeColor = "#37464f";
  let activeShadow = "#252f36";

  if (tierIndex === 0) {
    activeColor = color;
    activeShadow = darkenHex(color, 30);
  } else if (tierIndex > 0) {
    const style = TIER_STYLES[TIER_ORDER[tierIndex]];
    activeColor = style.color;
    activeShadow = style.shadow;
  }

  return (
    <g className="transition-all duration-500">
      <path d={arcPath} fill="none" stroke={activeShadow} strokeWidth={strokeWidth} strokeLinecap="round" transform="translate(0, 4)" />
      <path d={arcPath} fill="none" stroke={activeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      {tierIndex >= 0 && (
        <path d={arcPath} fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="opacity-20" transform="translate(0, -1)" />
      )}
    </g>
  );
}

function TieredProgressRing({ color, progress }: { color: string, progress: number }) {
  return (
    <svg 
      viewBox="0 0 120 120" 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 w-[7.5rem] h-[7.5rem]"
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

  let activeColor = "#37464f";
  let activeShadow = "#252f36";

  if (currentTierIdx === 0) {
    activeColor = color;
    activeShadow = darkenHex(color, 30);
  } else if (currentTierIdx > 0) {
    const style = TIER_STYLES[TIER_ORDER[currentTierIdx]];
    activeColor = style.color;
    activeShadow = style.shadow;
  }

  const isPrestige = currentTierIdx > 0;

  return (
    <div className="relative group flex items-center justify-center w-24 h-24 shrink-0">
      {isPrestige && (
        <div className="absolute inset-[-1rem] pointer-events-none flex items-center justify-center z-0">
          <div className="w-16 h-16 rounded-full blur-2xl transition-opacity duration-1000" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)', animation: 'pulse-glow 2s infinite ease-in-out' }} />
        </div>
      )}
      <TieredProgressRing color={color} progress={progress} />
      <button 
        type="button"
        onClick={(e) => { e.stopPropagation(); onNodeClick(); }} 
        className="w-14 h-14 rounded-full relative transition-all active:translate-y-1.5 duration-100 flex items-center justify-center shadow-xl group z-10 overflow-hidden" 
        style={{ backgroundColor: activeColor, boxShadow: `0 6px 0 ${activeShadow}` }}
      >
        <div className="absolute inset-0 rounded-full border-[3px] border-black/20 pointer-events-none z-30" />
        <div className="absolute inset-[1px] rounded-full border-t border-l border-white/30 pointer-events-none z-30" />
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
  setView: (v: 'academy' | 'domain' | 'course') => void,
  setIsICM: (v: boolean) => void
}) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32 scrollbar-hide">
      <header className="space-y-4">
        <button 
          type="button"
          onClick={() => setView('domain')} 
          className="text-[10px] font-black uppercase tracking-[0.2em] text-[#afafaf] hover:text-[#1cb0f6] flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Curriculum
        </button>
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-6">
            <div className="bg-[#1cb0f6] text-white p-4 rounded-[2rem] shadow-[0_8px_0_#148cc4]">
              <BookOpen className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white uppercase tracking-tight">{course.title}</h1>
              <p className="text-[#afafaf] text-sm leading-relaxed max-w-3xl mt-2 italic">
                {course.description || "Master the foundational principles and advanced procedures of this specialized legal certification track."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#37464f]/30 px-4 py-2 rounded-2xl border border-[#37464f] shrink-0">
            <Label className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">ICM</Label>
            <Switch checked={isICM} onCheckedChange={setIsICM} className="data-[state=checked]:bg-[#1cb0f6]" />
          </div>
        </div>
      </header>

      <section className="space-y-6">
        <h2 className="text-xl font-black flex items-center gap-3 text-white uppercase tracking-widest">
          <AlignLeft className="h-5 w-5 text-[#1cb0f6]" /> Overview
        </h2>
        <div className="bg-[#37464f]/20 border-4 border-[#37464f] rounded-[2.5rem] px-8 py-2 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-white/5" />
          <p className="text-sm leading-relaxed text-[#afafaf] italic">
            [A structured, comprehensive curriculum overview specifically for {course.title}. This program utilizes the Universitas atomic knowledge base to ensure maximum pedagogical retention through 3D isometric progression.]
          </p>
        </div>
      </section>

      {isICM ? (
        <Accordion type="multiple" className="space-y-4">
          {MASTERY_SECTIONS.map((section, sIdx) => (
            <AccordionItem key={sIdx} value={`mastery-${sIdx}`} className="bg-[#37464f]/10 border-2 border-[#37464f] rounded-[2rem] overflow-hidden shadow-xl border-b-2 group/mastery">
              <AccordionTrigger className="px-10 py-4 hover:no-underline hover:bg-white/5 transition-all">
                <div className="flex items-center gap-4 text-left w-full">
                  <div className="bg-[#2c426b] p-3 rounded-xl text-white flex items-center justify-center shadow-lg">
                    <Play className="h-5 w-5 fill-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-white text-lg uppercase tracking-tight">{section.name}</h3>
                    <p className="text-[10px] text-[#afafaf] font-bold uppercase tracking-widest opacity-60">{section.desc}</p>
                  </div>
                  <div className="mr-4 w-40 space-y-1.5 shrink-0">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[9px] font-black text-[#afafaf] uppercase tracking-widest opacity-60">Mastery</span>
                      <span className="text-sm font-black text-white">0%</span>
                    </div>
                    <Progress value={0} className="h-1 bg-[#37464f] w-full" />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-4 space-y-3 bg-[#131f24]/40">
                 {section.principles.map((p, pIdx) => (
                   <div key={pIdx} className="flex items-start justify-between p-3 pr-8 bg-[#131f24]/60 rounded-[1.5rem] border border-dashed border-[#37464f] group/p hover:bg-[#1cb0f6]/5 transition-all">
                      <div className="flex flex-col gap-3 flex-1">
                        <div className="flex items-start gap-4">
                          <div className="bg-[#2c426b] p-2.5 rounded-xl text-white flex items-center justify-center shadow-lg group-hover/p:bg-[#1cb0f6] transition-colors shrink-0">
                            <Play className="h-4 w-4 fill-white" />
                          </div>
                          <div className="flex flex-col pt-0.5 items-start">
                            <span className="font-black text-white text-sm uppercase tracking-tight">{p.name}</span>
                            <span className="text-[9px] text-[#afafaf] font-bold uppercase tracking-widest opacity-60">{p.snippet}</span>
                          </div>
                        </div>
                        <div className="flex gap-3 px-1 w-[81%]">
                          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2 space-y-0.5">
                            <p className="text-[8px] font-black text-[#afafaf] uppercase tracking-[0.2em]">Last Attempted</p>
                            <p className="text-[10px] font-bold text-white/80">
                              {(nodeProgress[`${sIdx}-${pIdx}`] || 0) > 0 ? "Today at 2:45 PM" : "Not yet attempted"}
                            </p>
                          </div>
                          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2 space-y-0.5">
                            <p className="text-[8px] font-black text-[#afafaf] uppercase tracking-[0.2em]">Next Lesson</p>
                            <p className="text-[10px] font-bold text-[#1cb0f6]">
                              {(nodeProgress[`${sIdx}-${pIdx}`] || 0) > 0 ? "Scheduled for Tomorrow" : "Start track to schedule"}
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
        <section className="space-y-16 flex flex-col items-center pt-10">
          {MASTERY_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className="space-y-10 flex flex-col items-center relative w-full">
              <div className="w-full flex items-center gap-4 px-10">
                <div className="flex-1 h-0.5 bg-[#37464f]" />
                <span className="text-[#afafaf] font-black uppercase tracking-widest text-xs">{section.name}</span>
                <div className="flex-1 h-0.5 bg-[#37464f]" />
              </div>

              <div className="relative w-64 flex flex-col items-center gap-8">
                {[...Array(7)].map((_, bIdx) => {
                  const offset = Math.sin(bIdx * 0.8) * 80;
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
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <span className="text-[9px] font-black text-white uppercase tracking-widest">{label}</span>
        <span className="text-[9px] font-black text-[#afafaf]">{current}/{total}</span>
      </div>
      <div className="h-2 w-full bg-[#37464f] rounded-full overflow-hidden border border-white/5 shadow-inner">
        <div className={cn("h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.1)]", color)} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

// --- Main Template Component ---
export function ScholaIuris() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [view, setView] = useState<'academy' | 'domain' | 'course'>('academy');
  const [activeDomain, setActiveDomain] = useState<any>(null);
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [learnAccordionOpen, setLearnAccordionOpen] = useState(false);
  const [nodeProgress, setNodeProgress] = useState<Record<string, number>>({});
  const [isICM, setIsICM] = useState(false);

  const db = useFirestore();
  const domainsQ = useMemoFirebase(() => collection(db, 'domains'), [db]);
  const { data: domainsData } = useCollection(domainsQ);
  const domains = domainsData || [];

  const fieldsQ = useMemoFirebase(() => activeDomain ? query(collection(db, 'fields'), where('domainId', '==', activeDomain.id)) : null, [db, activeDomain]);
  const { data: fieldsData } = useCollection(fieldsQ);
  const fields = fieldsData || [];

  const coursesQ = useMemoFirebase(() => activeDomain ? query(collection(db, 'courses'), where('domainId', '==', activeDomain.id)) : null, [db, activeDomain]);
  const { data: coursesData } = useCollection(coursesQ);
  const courses = coursesData || [];

  const sortedDomains = useMemo(() => Array.isArray(domains) ? [...domains].sort((a, b) => (a.order || 0) - (b.order || 0)) : [], [domains]);
  const sortedFields = useMemo(() => Array.isArray(fields) ? [...fields].sort((a, b) => (a.order || 0) - (b.order || 0)) : [], [fields]);
  const sortedCourses = useMemo(() => Array.isArray(courses) ? [...courses].sort((a, b) => (a.order || 0) - (b.order || 0)) : [], [courses]);

  const handleDomainSelect = (dom: any) => {
    setActiveDomain(dom);
    setActiveCourse(null);
    setView('domain');
  };

  const handleCourseSelect = (course: any) => {
    setActiveCourse(course);
    setView('course');
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
    <div className="flex h-[1000px] w-full bg-[#131f24] text-white font-body selection:bg-accent/30 relative overflow-hidden">
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

      <aside className={cn("border-r border-[#37464f] transition-all duration-300 flex flex-col py-6 relative z-50 bg-[#131f24] scrollbar-hide overflow-y-auto", isSidebarOpen ? "w-64 px-4" : "w-20 px-2")}>
        <div className="mb-8 px-2 flex items-center justify-between">
          <div className={cn("flex items-center gap-2", !isSidebarOpen && "hidden")}>
            <Scale className="h-8 w-8 text-[#58cc02]" />
            <span className="font-black text-2xl tracking-tighter text-[#58cc02]">ProSeU</span>
          </div>
          <button type="button" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[#37464f] rounded-xl transition-colors">
            {isSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Layout className="h-5 w-5" />}
          </button>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-hide">
          <Accordion type="single" collapsible value={learnAccordionOpen ? "learn" : ""}>
            <AccordionItem value="learn" className="border-none">
              <AccordionTrigger asChild>
                <button 
                  type="button"
                  onClick={() => {
                    setLearnAccordionOpen(!learnAccordionOpen);
                    if (!learnAccordionOpen) setView('academy');
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-xl transition-all font-black uppercase tracking-wider text-sm text-left",
                    (view === 'academy' || view === 'domain' || view === 'course') ? "bg-[#1cb0f6]/10 border-2 border-[#1cb0f6] text-[#1cb0f6]" : "hover:bg-[#37464f] text-[#afafaf]"
                  )}
                >
                  <BookOpen className="h-6 w-6 shrink-0" />
                  {isSidebarOpen && <span className="flex-1">Learn</span>}
                </button>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pl-4 space-y-1">
                {isSidebarOpen && sortedDomains.map(dom => (
                  <button 
                    key={dom.id}
                    type="button"
                    onClick={() => handleDomainSelect(dom)}
                    className={cn(
                      "w-full text-left p-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      activeDomain?.id === dom.id ? "text-[#1cb0f6] bg-[#1cb0f6]/5" : "text-[#afafaf] hover:text-white hover:bg-[#37464f]"
                    )}
                  >
                    {dom.name}
                  </button>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {[
            { label: 'Terms', icon: BookMarked, color: 'text-[#ff9600]' },
            { label: 'Practice', icon: Zap, color: 'text-[#ce82ff]' },
            { label: 'Leaderboard', icon: Trophy, color: 'text-[#ffc800]' },
            { label: 'Quests', icon: Target, color: 'text-[#ff4b4b]' },
            { label: 'Shop', icon: ShoppingBag, color: 'text-[#1cb0f6]' },
            { label: 'Profile', icon: User, color: 'text-[#58cc02]' },
            { label: 'More', icon: MoreHorizontal, color: 'text-[#afafaf]' },
          ].map((item, i) => (
            <button key={i} type="button" className="w-full flex items-center gap-4 p-3 rounded-xl transition-all font-black uppercase tracking-wider text-sm text-left hover:bg-[#37464f] text-[#afafaf]">
              <item.icon className={cn("h-6 w-6 shrink-0", item.color)} />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="sticky top-0 z-40 bg-[#131f24] px-10 py-4 border-b border-[#37464f] shadow-lg">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-white/10" />
          <div className="max-w-4xl mx-auto flex items-center justify-between relative z-10">
            <div className="flex flex-col">
              <span className="text-[#afafaf] font-black uppercase tracking-widest text-[10px]">
                {view === 'course' ? activeCourse?.title : view === 'domain' ? activeDomain?.name : 'Academy Hub'}
              </span>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">ScholaIuris Curriculum</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-orange-500/10 text-orange-500 px-4 py-2 rounded-full font-black text-xs border border-orange-500/20">
                <Flame className="h-4 w-4 fill-orange-500" /> 48
              </div>
              <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-full font-black text-xs border border-yellow-500/20">
                <Trophy className="h-4 w-4 fill-yellow-500" /> 1,240 XP
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scroll-smooth py-10 px-10 scrollbar-hide relative">
          <div className="max-w-4xl mx-auto">
            {view === 'academy' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Academic Domains</h2>
                  <p className="text-[#afafaf] text-sm italic">Master the law through structured university-grade certification paths.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sortedDomains.map(dom => (
                    <Card key={dom.id} className="bg-[#37464f]/10 border-4 border-[#37464f] hover:border-[#1cb0f6] transition-all cursor-pointer group rounded-[2.5rem] overflow-hidden" onClick={() => handleDomainSelect(dom)}>
                      <CardContent className="p-8 space-y-4">
                        <div className="bg-[#1cb0f6]/10 p-4 rounded-[1.5rem] w-fit text-[#1cb0f6] group-hover:bg-[#1cb0f6] group-hover:text-white transition-all">
                          <LayoutGrid className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-black text-white uppercase tracking-tight">{dom.name}</h3>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Mastery track certification</p>
                        </div>
                        <p className="text-xs text-[#afafaf] leading-relaxed line-clamp-2 italic">{dom.description || "Foundational and advanced legal modules."}</p>
                        <div className="flex justify-end pt-2">
                          <span className="text-[10px] font-black uppercase text-[#1cb0f6] flex items-center gap-1 group-hover:translate-x-1 transition-transform">Enter Domain <ChevronRight className="h-3 w-3" /></span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {view === 'domain' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="space-y-4">
                  <button type="button" onClick={() => setView('academy')} className="text-[10px] font-black uppercase tracking-[0.2em] text-[#afafaf] hover:text-[#1cb0f6] flex items-center gap-2 transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Academy
                  </button>
                  <div className="flex items-center gap-6">
                    <div className="bg-[#1cb0f6] p-4 rounded-[2rem] shadow-[0_8px_0_#148cc4] text-white">
                      <LayoutGrid className="h-10 w-10" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-black text-white uppercase tracking-tight">{activeDomain?.name}</h1>
                      <p className="text-[#afafaf] text-sm leading-relaxed max-w-2xl mt-1 italic">{activeDomain?.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-[#1cb0f6] hover:bg-[#1cb0f6]/10 gap-2 h-12 px-4 rounded-2xl border-2 border-[#1cb0f6]/20 shadow-lg">
                      <FileText className="h-4 w-4" /> Books/Documents
                    </Button>
                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-[#58cc02] hover:bg-[#58cc02]/10 gap-2 h-12 px-4 rounded-2xl border-2 border-[#58cc02]/20 shadow-lg">
                      <Globe className="h-4 w-4" /> Websites/Articles
                    </Button>
                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-[#ff9600] hover:bg-[#ff9600]/10 gap-2 h-12 px-4 rounded-2xl border-2 border-[#ff9600]/20 shadow-lg">
                      <Video className="h-4 w-4" /> Videos/Audios
                    </Button>
                  </div>
                </header>

                <div className="space-y-12">
                  {sortedFields.map(field => {
                    const fieldCourses = sortedCourses.filter(c => c.fieldId === field.id);
                    return (
                      <section key={field.id} className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-1.5 rounded-full bg-[#e6b400]" />
                          <h2 className="text-xl font-black uppercase tracking-widest text-white">{field.name}</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {fieldCourses.map(course => (
                            <Card key={course.id} className="bg-[#37464f]/10 border-4 border-[#37464f] hover:border-[#e6b400] transition-all group rounded-[2.5rem] overflow-hidden flex flex-col">
                              <CardContent className="p-6 flex flex-col h-full space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="bg-[#e6b400]/10 p-2.5 rounded-xl text-[#e6b400] group-hover:bg-[#e6b400] group-hover:text-white transition-all">
                                    <Bookmark className="h-5 w-5" />
                                  </div>
                                  <button type="button" onClick={() => handleCourseSelect(course)} className="text-[#afafaf] hover:text-[#e6b400] transition-colors">
                                    <PlayCircle className="h-8 w-8" />
                                  </button>
                                </div>
                                <div className="flex-1 space-y-2">
                                  <h3 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-[#e6b400] transition-colors cursor-pointer" onClick={() => handleCourseSelect(course)}>{course.title}</h3>
                                  <p className="text-[10px] text-[#afafaf] italic leading-relaxed line-clamp-3 cursor-pointer" onClick={() => handleCourseSelect(course)}>{course.description || "Course modules pending..."}</p>
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
                <div className="h-32" />
              </>
            )}
          </div>
        </div>

        {view === 'course' && activeCourse && (
          <section className="absolute bottom-0 left-0 right-0 z-[60] bg-[#131f24]/95 backdrop-blur-md border-t-2 border-[#37464f] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] group/drawer scrollbar-hide">
            <div className="max-w-4xl mx-auto">
              <Accordion type="single" collapsible>
                <AccordionItem value="career-drawer" className="border-none">
                  <AccordionTrigger className="px-10 py-2 hover:no-underline hover:bg-white/5 transition-all">
                    <div className="flex flex-col items-start gap-0.5">
                      <h2 className="text-xl font-black tracking-tight text-white uppercase tracking-[0.2em]">Career Potential</h2>
                      <p className="text-[10px] text-[#afafaf] font-bold uppercase tracking-widest">Strategic opportunities within this specialization.</p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-10 pb-4 pt-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
                    <div className="space-y-3">
                      {CAREER_PATHS.map((path, idx) => (
                        <Accordion key={idx} type="single" collapsible className="bg-[#37464f]/10 border border-[#37464f] rounded-2xl overflow-hidden shadow-lg transition-all hover:border-[#e6b400]/30">
                          <AccordionItem value={`career-${idx}`} className="border-none">
                            <AccordionTrigger className="px-6 py-2.5 hover:no-underline hover:bg-[#37464f]/30 transition-all">
                              <div className="flex items-center gap-4 text-left w-full">
                                <div className="bg-[#e6b400]/10 p-2 rounded-xl text-[#e6b400] shrink-0"><Briefcase className="h-4 w-4" /></div>
                                <div className="flex-1 min-w-0">
                                  <span className="font-black text-white text-[11px] uppercase tracking-tight truncate block">{path.title}</span>
                                </div>
                                <div className="flex items-center gap-6 mr-4 shrink-0">
                                  <div className="text-right">
                                    <p className="text-[8px] font-black text-[#afafaf] uppercase tracking-widest leading-none">Market</p>
                                    <p className="text-[10px] font-black text-white">{path.market}%</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[8px] font-black text-[#afafaf] uppercase tracking-widest leading-none">Avg Sal</p>
                                    <p className="text-[10px] font-black text-white">${path.salary}</p>
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6 pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#afafaf] flex items-center gap-2"><TableIcon className="h-4 w-4" /> Salary Tiers</h4>
                                  <TableUI className="border-2 border-[#37464f] rounded-2xl overflow-hidden bg-[#131f24]">
                                    <TableHeader className="bg-[#37464f]/30">
                                      <TableRow className="border-[#37464f]">
                                        <TableHead className="text-[10px] font-black uppercase text-white h-10">Level</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-white h-10">Monthly</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-white h-10">Annual</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {['Entry', 'Median', 'Top'].map((level, i) => (
                                        <TableRow key={i} className="border-[#37464f] hover:bg-white/5">
                                          <TableCell className="text-[11px] font-black text-white">{level}</TableCell>
                                          <TableCell className="text-[11px] text-[#afafaf]">$---,---</TableCell>
                                          <TableCell className="text-[11px] font-black text-[#e6b400]">$---,---</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </TableUI>
                                </div>
                                <div className="space-y-6">
                                  <div className="space-y-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e6b400] flex items-center gap-2"><Globe className="h-4 w-4" /> Field Impact</h4>
                                    <p className="text-[11px] leading-relaxed text-[#afafaf] italic">[Describe societal and professional impact...]</p>
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1cb0f6] flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> Historical Legacy</h4>
                                    <p className="text-[11px] leading-relaxed text-[#afafaf] italic">[Describe historical evolution...]</p>
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
      </main>

      <aside className={cn("w-80 px-4 py-4 space-y-4 bg-[#131f24] relative z-50 transition-all scrollbar-hide overflow-y-auto", !isSidebarOpen && "hidden")}>
        <div className="flex items-center justify-between mb-4 bg-[#37464f]/30 p-2.5 rounded-2xl border border-[#37464f]/50">
          <div className="flex items-center gap-1.5">
            <LayoutGrid className="h-5 w-5 text-[#58cc02]" />
            <ChevronRight className="h-3 w-3 text-[#37464f]" />
            <Zap className="h-5 w-5 text-[#ce82ff]" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Flame className="h-5 w-5 text-[#ff4b4b] fill-[#ff4b4b]" />
              <span className="font-black text-sm text-[#ff4b4b]">48</span>
            </div>
            <div className="flex items-center gap-1">
              <Coins className="h-5 w-5 text-[#ffc800] fill-[#ffc800]" />
              <span className="font-black text-sm text-[#ffc800]">2242</span>
            </div>
            <div className="bg-[#1cb0f6] rounded-md px-1.5 py-0.5 font-black text-[10px] text-white">XP</div>
          </div>
        </div>

        <Card className="rounded-[2rem] border-2 border-[#ff4b4b] shadow-xl overflow-hidden bg-[#ff4b4b]/5">
          <CardHeader className="p-3 bg-[#ff4b4b] text-white">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <Target className="h-4 w-4" /> Daily Quests
            </CardTitle>
          </CardHeader>
          <div className="h-[1px] bg-white/20 mx-3" />
          <CardContent className="p-3 space-y-4">
            <QuestItem label="Earn 30 XP" current={30} total={30} color="bg-[#ffc800]" />
            <QuestItem label="Spend 10 mins learning" current={8} total={10} color="bg-[#1cb0f6]" />
            <QuestItem label="Complete 3 perfect lessons" current={0} total={3} color="bg-[#58cc02]" />
          </CardContent>
        </Card>

        {view === 'course' && activeCourse && (
          <div className="space-y-3 animate-in fade-in zoom-in duration-300">
            <Card className="rounded-3xl border-4 border-[#1cb0f6] shadow-xl overflow-hidden bg-[#1cb0f6]/5">
              <CardHeader className="p-3 bg-[#1cb0f6] text-white">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-400" /> Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white">
                    <span>Completion</span>
                    <span>0%</span>
                  </div>
                  <Progress value={0} className="h-1.5 bg-[#37464f]" />
                </div>
                <div className="p-3 bg-white/5 rounded-2xl space-y-1 border-2 border-white/10">
                  <p className="text-[8px] font-black text-[#afafaf] uppercase tracking-widest">Last Studied</p>
                  <p className="text-xs font-black text-white">N/A</p>
                </div>
                <div className="p-3 bg-[#ff4b4b]/10 rounded-2xl space-y-1 border-2 border-[#ff4b4b]/20">
                  <p className="text-[8px] font-black text-[#ff4b4b] uppercase tracking-widest">Difficulty Area</p>
                  <p className="text-xs font-black text-white">Analysis Pending</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-4 border-[#37464f] bg-[#131f24] shadow-xl overflow-hidden">
              <CardHeader className="p-3 bg-[#37464f] text-white">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <Library className="h-4 w-4" /> Reference
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-1.5">
                {[
                  { icon: Video, label: "Videos" },
                  { icon: BookOpen, label: "Books" },
                  { icon: FileText, label: "Articles" },
                  { icon: Globe, label: "Websites" },
                ].map((item, i) => (
                  <Button key={i} variant="ghost" className="w-full justify-start gap-3 h-9 text-[9px] font-black uppercase tracking-[0.2em] bg-[#37464f]/20 hover:bg-[#37464f]/40 border-2 border-[#37464f] rounded-xl px-3 group shadow-lg transition-all">
                    <item.icon className="h-3.5 w-3.5 text-[#afafaf] group-hover:text-[#1cb0f6]" />
                    <span className="text-white">{item.label}</span>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#37464f] group-hover:text-white" />
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-4 border-[#e6b400] shadow-xl overflow-hidden bg-[#e6b400]/5">
              <CardHeader className="p-3 bg-[#e6b400] text-white">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" /> Coach Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white/20 flex items-center justify-center">
                     <Info className="h-3 w-3 text-[#e6b400]" />
                  </div>
                  <span className="text-[9px] font-black text-white uppercase tracking-widest">Advice</span>
                </div>
                <p className="text-[10px] leading-relaxed text-[#afafaf] italic border-l-2 border-[#e6b400]/30 pl-3 py-0.5">
                  "Strategic Performance Advice: Focus on major doctrine elements within this specialization to strengthen foundational understanding."
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </aside>
    </div>
  );
}
