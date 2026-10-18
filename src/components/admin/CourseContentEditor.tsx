'use client';

import React, { useState } from 'react';
import { useSiteContent } from '@/components/site-content-context';
import { useDevMode } from '@/components/dev-mode-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Check, 
  X, 
  Briefcase, 
  FileText, 
  DollarSign, 
  Globe, 
  History,
  PlayCircle,
  AlignLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseContentEditorProps {
  course: {
    id: string;
    title: string;
    slug: string;
  };
  onClose: () => void;
}

export function CourseContentEditor({ course, onClose }: CourseContentEditorProps) {
  const { getContent, updatePendingContent, saveChanges } = useSiteContent();
  const { setHasUnsavedChanges } = useDevMode();
  const [editingCell, setEditingCell] = useState<{ key: string } | null>(null);
  const [tempValue, setTempValue] = useState("");

  const isNumericKey = (key: string) => {
    return key.endsWith('_market') || key.endsWith('_salary') || key.endsWith('_mo') || key.endsWith('_yr');
  };

  const formatNumber = (val: string) => {
    if (!val) return "";
    const clean = val.replace(/[^\d.]/g, "");
    const parts = clean.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];
  };

  const isFiller = (val: string) => {
    const v = val.trim();
    return (v.includes('[') && v.includes(']')) || 
           v.includes('Placeholder') || 
           (v.toLowerCase().includes('enter') && v.toLowerCase().includes('description'));
  };

  const handleStartEdit = (key: string, currentVal: string, label: string) => {
    setEditingCell({ key });
    // Clear if it's the placeholder label or filler patterns
    setTempValue((currentVal === label || isFiller(currentVal)) ? "" : currentVal);
  };

  const handleSaveCell = async (key: string) => {
    let finalValue = tempValue;
    if (isNumericKey(key)) {
      finalValue = formatNumber(tempValue);
    }
    updatePendingContent(key, finalValue);
    setEditingCell(null);
    
    // Auto-save to Firestore
    await saveChanges();
    setHasUnsavedChanges(false);
  };

  const renderInlineEdit = (key: string, defaultValue: string, label: string, isMultiline = false) => {
    const isEditing = editingCell?.key === key;
    const value = getContent(key, defaultValue);
    const isNumeric = isNumericKey(key);

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 w-full">
          {isMultiline ? (
            <Textarea 
              autoFocus
              className="text-xs min-h-[80px]"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => handleSaveCell(key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveCell(key);
                }
              }}
              placeholder={label}
            />
          ) : (
            <Input 
              autoFocus
              className={cn("h-8 text-xs", isNumeric && "text-right")}
              value={tempValue}
              onChange={(e) => {
                const val = e.target.value;
                setTempValue(isNumeric ? formatNumber(val) : val);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCell(key)}
              onBlur={() => handleSaveCell(key)}
              placeholder={label}
            />
          )}
          <div className="flex flex-col gap-1">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7 text-emerald-600" 
              onMouseDown={(e) => {
                e.preventDefault();
                handleSaveCell(key);
              }}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7 text-rose-600" 
              onMouseDown={(e) => {
                e.preventDefault();
                setEditingCell(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={cn(
          "group relative cursor-text hover:bg-muted/50 p-2 rounded-xl transition-all border border-transparent hover:border-border min-h-[32px] flex items-center",
          isNumeric && "justify-end"
        )}
        onClick={() => handleStartEdit(key, value, defaultValue)}
      >
        <span className={cn(
          "text-xs", 
          value === defaultValue && "text-muted-foreground italic",
          isNumeric && "text-right"
        )}>
          {isNumeric && value !== defaultValue ? formatNumber(value) : value}
        </span>
      </div>
    );
  };

  const SALARY_LEVELS = ['Entry', 'Median', 'Top'];

  return (
    <div className="flex flex-col h-[80vh] overflow-hidden">
      <header className="px-6 py-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl">
            <PlayCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">{course.title}</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Content Engine Editor</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <Card className="rounded-[2rem] border-2 border-primary/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <AlignLeft className="h-4 w-4 text-primary" /> Curriculum Overview
            </CardTitle>
            <CardDescription className="text-[10px]">Enter the long-form curriculum overview that appears on the course detail page.</CardDescription>
          </CardHeader>
          <CardContent>
            {renderInlineEdit(`course_overview_${course.id}`, "[Comprehensive curriculum overview...]", "Curriculum Overview", true)}
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-accent" /> Career Potential Tracks
            </h3>
          </div>

          <Tabs defaultValue="path-0" className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-2xl mb-4 w-full justify-start overflow-x-auto h-auto flex-wrap">
              {[0, 1, 2, 3, 4].map(idx => (
                <TabsTrigger 
                  key={idx} 
                  value={`path-${idx}`} 
                  className="rounded-xl data-[state=active]:bg-background px-4 py-2 text-[10px] font-bold uppercase tracking-widest"
                >
                  Path {idx + 1}
                </TabsTrigger>
              ))}
            </TabsList>

            {[0, 1, 2, 3, 4].map(idx => (
              <TabsContent key={idx} value={`path-${idx}`} className="space-y-6 animate-in fade-in-50 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <Card className="rounded-2xl border bg-card/50">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest">General Info</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Path Title</label>
                          {renderInlineEdit(`course_${course.id}_career_${idx}_title`, `Career Potential Path ${idx + 1}`, "Path Title")}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Market Demand (%)</label>
                            {renderInlineEdit(`course_${course.id}_career_${idx}_market`, "--", "Market Demand")}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Average Salary ($)</label>
                            {renderInlineEdit(`course_${course.id}_career_${idx}_salary`, "---,---", "Avg Salary")}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border bg-card/50 overflow-hidden">
                      <CardHeader className="py-3 px-4 bg-muted/30">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Salary Tiers
                        </CardTitle>
                      </CardHeader>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-[8px] font-bold uppercase tracking-widest h-8">Level</TableHead>
                            <TableHead className="text-[8px] font-bold uppercase tracking-widest h-8 text-right">Monthly ($)</TableHead>
                            <TableHead className="text-[8px] font-bold uppercase tracking-widest h-8 text-right">Annual ($)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {SALARY_LEVELS.map(level => (
                            <TableRow key={level} className="group">
                              <TableCell className="text-[10px] font-bold py-2">{level}</TableCell>
                              <TableCell className="p-0">
                                {renderInlineEdit(`course_${course.id}_career_${idx}_sal_${level}_mo`, "---,---", "Monthly")}
                              </TableCell>
                              <TableCell className="p-0">
                                {renderInlineEdit(`course_${course.id}_career_${idx}_sal_${level}_yr`, "---,---", "Annual")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Card className="rounded-2xl border bg-card/50">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-blue-500" /> Field Impact
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        {renderInlineEdit(`course_${course.id}_career_${idx}_impact`, "[Describe the societal and professional impact...]", "Field Impact", true)}
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border bg-card/50">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                          <History className="h-3.5 w-3.5 text-orange-500" /> Historical Legacy
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        {renderInlineEdit(`course_${course.id}_career_${idx}_legacy`, "[Describe the historical evolution of this path...]", "Historical Legacy", true)}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>
      </div>
    </div>
  );
}
