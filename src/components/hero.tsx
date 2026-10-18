"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";
import { useState } from "react";

export function Hero() {
  const [description, setDescription] = useState("");

  return (
    <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
      <div className="container relative z-10 mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm font-medium text-secondary shadow-sm mb-6">
          <Sparkles className="h-4 w-4" />
          <span>New: AI-Powered Legal Situation Analysis</span>
        </div>
        
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary sm:text-5xl lg:text-7xl mb-6">
          Master the Law. <br />
          <span className="text-secondary">Defend Your Rights.</span>
        </h1>
        
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10 lg:text-xl">
          ProSeU is the world's premier online university dedicated to teaching you how to represent yourself effectively in court. From micro-lessons to JD degree tracks.
        </p>

        <div className="mx-auto max-w-3xl">
          <Card className="border-2 border-primary/10 shadow-xl overflow-hidden">
            <CardContent className="p-1">
              <div className="flex flex-col md:flex-row bg-background">
                <Textarea 
                  placeholder="Describe your legal situation here... (e.g., 'I received a notice about a property dispute...')"
                  className="min-h-[120px] border-none focus-visible:ring-0 text-base py-6 px-6 resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="flex items-center justify-end p-4 md:p-6 bg-muted/30 md:border-l">
                  <Button size="lg" className="w-full md:w-auto bg-secondary hover:bg-secondary/90 gap-2 h-14 px-8 text-lg font-bold">
                    Analyze Situation
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-full border">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> Professional Paralegal Track
            </span>
            <span className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-full border">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> JD Degree Program
            </span>
            <span className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-full border">
              <div className="h-1.5 w-1.5 rounded-full bg-purple-500" /> ProSe Certification
            </span>
          </div>
        </div>
      </div>

      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -z-0 h-[600px] w-[800px] -translate-x-1/2 bg-secondary/5 blur-[120px] rounded-full" />
      <div className="absolute top-40 right-0 -z-0 h-[300px] w-[300px] bg-primary/5 blur-[80px] rounded-full" />
    </section>
  );
}