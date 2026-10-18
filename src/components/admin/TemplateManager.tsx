'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScholaIuris } from './templates/ScholaIuris';
import { Inoblitus } from './templates/Inoblitus';
import { Veritas } from './templates/Veritas';
import { Multiplix } from './templates/Multiplix';
import { Congruens } from './templates/Congruens';
import { Scriptum } from './templates/Scriptum';
import { Peractio } from './templates/Peractio';
import { Displodo } from './templates/Displodo';
import { PecuAdvo } from './templates/PecuAdvo';
import { GriffonJuste } from './templates/GriffonJuste';
import { 
  LayoutTemplate, 
  BookOpen, 
  Brain, 
  CheckCircle2, 
  ListTodo, 
  Columns, 
  Edit3,
  Square,
  Rocket,
  Gamepad2,
  Scale
} from 'lucide-react';

export function TemplateManager() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5 text-accent" /> UI Templates
        </h2>
        <p className="text-muted-foreground text-xs font-medium">Preview and configure pedagogical interfaces and game maps.</p>
      </header>

      <Tabs defaultValue="scholoiuris" className="w-full">
        <TabsList className="bg-muted/30 p-1 rounded-xl mb-6 flex-wrap h-auto">
          <TabsTrigger value="scholoiuris" className="gap-2 text-xs font-bold uppercase tracking-widest py-2">
            <BookOpen className="h-3.5 w-3.5" /> ScholaIuris
          </TabsTrigger>
          <TabsTrigger value="inoblitus" className="gap-2 text-xs font-bold uppercase tracking-widest py-2">
            <Brain className="h-3.5 w-3.5" /> Inoblitus
          </TabsTrigger>
          <TabsTrigger value="veritas" className="gap-2 text-xs font-bold uppercase tracking-widest py-2">
            <CheckCircle2 className="h-3.5 w-3.5" /> Veritas
          </TabsTrigger>
          <TabsTrigger value="multiplix" className="gap-2 text-xs font-bold uppercase tracking-widest py-2">
            <ListTodo className="h-3.5 w-3.5" /> Multiplix
          </TabsTrigger>
          <TabsTrigger value="congruens" className="gap-2 text-xs font-bold uppercase tracking-widest py-2">
            <Columns className="h-3.5 w-3.5" /> Congruens
          </TabsTrigger>
          <TabsTrigger value="scriptum" className="gap-2 text-xs font-bold uppercase tracking-widest py-2">
            <Edit3 className="h-3.5 w-3.5" /> Scriptum
          </TabsTrigger>
          <TabsTrigger value="peractio" className="gap-2 text-xs font-bold uppercase tracking-widest py-2">
            <Square className="h-3.5 w-3.5" /> Peractio
          </TabsTrigger>
          <TabsTrigger value="displodo" className="gap-2 text-xs font-bold uppercase tracking-widest py-2">
            <Rocket className="h-3.5 w-3.5" /> Displodo
          </TabsTrigger>
          <TabsTrigger value="pecuadvo" className="gap-2 text-xs font-bold uppercase tracking-widest py-2">
            <Gamepad2 className="h-3.5 w-3.5" /> PecuAdvo
          </TabsTrigger>
          <TabsTrigger value="griffonjuste" className="gap-2 text-xs font-bold uppercase tracking-widest py-2">
            <Scale className="h-3.5 w-3.5" /> Griffon Juste
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scholoiuris" className="border rounded-[2.5rem] overflow-hidden bg-[#131f24] min-h-[1000px]">
          <ScholaIuris />
        </TabsContent>

        <TabsContent value="inoblitus" className="border rounded-[2.5rem] overflow-hidden bg-[#131f24] min-h-[1000px]">
          <Inoblitus />
        </TabsContent>

        <TabsContent value="veritas" className="border rounded-[2.5rem] overflow-hidden bg-[#131f24] min-h-[1000px]">
          <Veritas />
        </TabsContent>

        <TabsContent value="multiplix" className="border rounded-[2.5rem] overflow-hidden bg-[#131f24] min-h-[1000px]">
          <Multiplix />
        </TabsContent>

        <TabsContent value="congruens" className="border rounded-[2.5rem] overflow-hidden bg-[#131f24] min-h-[1000px]">
          <Congruens />
        </TabsContent>

        <TabsContent value="scriptum" className="border rounded-[2.5rem] overflow-hidden bg-[#131f24] min-h-[1000px]">
          <Scriptum />
        </TabsContent>

        <TabsContent value="peractio" className="border rounded-[2.5rem] overflow-hidden bg-[#131f24] min-h-[1000px]">
          <Peractio />
        </TabsContent>

        <TabsContent value="displodo" className="border rounded-[2.5rem] overflow-hidden bg-[#131f24] min-h-[1000px]">
          <Displodo />
        </TabsContent>

        <TabsContent value="pecuadvo" className="border rounded-[2.5rem] overflow-hidden bg-[#131f24] min-h-[1000px]">
          <PecuAdvo />
        </TabsContent>

        <TabsContent value="griffonjuste" className="border rounded-[2.5rem] overflow-hidden bg-[#131f24] min-h-[1000px]">
          <GriffonJuste />
        </TabsContent>
      </Tabs>
    </div>
  );
}
