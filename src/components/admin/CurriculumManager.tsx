'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  useCollection, 
  useMemoFirebase, 
  updateDocumentNonBlocking, 
  addDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from '@/firebase';
import { collection, doc, Firestore } from 'firebase/firestore';
import { 
  Plus, 
  PlusCircle, 
  GripVertical, 
  Trash2, 
  LayoutGrid, 
  Layers, 
  Eye,
  EyeOff,
  Edit3,
  PlayCircle,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CourseContentEditor } from './CourseContentEditor';
import { useSiteContent } from '@/components/site-content-context';
import { cn } from '@/lib/utils';
import { generateIntuitiveCode } from '@/lib/codes';

interface Domain { id: string; name: string; description: string; order: number; visible: boolean; slug: string; code?: string; }
interface Field { id: string; name: string; description: string; domainId: string; order: number; visible: boolean; code?: string; }
interface Course { id: string; title: string; domainId: string; fieldId: string; order: number; visible: boolean; description: string; slug: string; code?: string; }

// --- Sub-Components moved outside to prevent re-mounting and hook errors ---

interface DescriptionEditorProps {
  id: string;
  collection: string;
  initialValue: string;
  label: string;
  onUpdate: (data: any) => void;
}

function DescriptionEditor({ initialValue, label, onUpdate }: DescriptionEditorProps) {
  const [tempValue, setTempValue] = useState(initialValue);
  
  const handleClearFiller = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.trim();
    if (val === label || val.startsWith('New ') || (val.includes('[') && val.includes(']'))) {
      setTempValue('');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-1 cursor-pointer group/desc max-w-sm" onClick={(e) => e.stopPropagation()}>
          <p className="text-[10px] text-muted-foreground italic truncate hover:text-foreground transition-colors">
            {initialValue || label}
          </p>
          <Edit3 className="h-2.5 w-2.5 opacity-0 group-hover/desc:opacity-100 transition-opacity" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-widest">Edit Description</h4>
          <Textarea 
            value={tempValue}
            onFocus={handleClearFiller}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={(e) => { 
              if (e.target.value.trim() === '') setTempValue(initialValue); 
              onUpdate({ description: tempValue });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            placeholder={label}
            className="min-h-[100px] text-xs"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); setTempValue(initialValue); }}>Reset</Button>
            <Button type="button" size="sm" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); onUpdate({ description: tempValue }); }}>Save</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface CodeBadgeProps {
  id: string;
  collection: string;
  code?: string;
  prefix: 'A' | 'B' | 'C';
  existingCodes: string[];
  parentCode?: string;
  onUpdate: (data: any) => void;
}

function CodeBadge({ code, prefix, existingCodes, parentCode, onUpdate }: CodeBadgeProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const normalizedInitial = useMemo(() => {
    if (!code) return 'XXX';
    // Domain (A), Field (B), and Course (C) are now strictly 3 chars (Legacy was 4 chars with prefix)
    if ((prefix === 'A' || prefix === 'B' || prefix === 'C') && code.length === 4 && code.startsWith(prefix)) return code.slice(1);
    return code;
  }, [code, prefix]);

  const [tempValue, setTempValue] = useState(normalizedInitial);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const displayValue = useMemo(() => {
    if (!code) return 'XXX';
    if ((prefix === 'A' || prefix === 'B' || prefix === 'C') && code.length === 4 && code.startsWith(prefix)) return code.slice(1);
    return code;
  }, [code, prefix]);

  const validate = (val: string) => {
    const candidate = val.toUpperCase().padEnd(3, 'X').slice(0, 3);
    return existingCodes.includes(candidate) && candidate !== displayValue;
  };

  const handleSave = () => {
    const val = tempValue.toUpperCase().padEnd(3, 'X').slice(0, 3);
    if (validate(val)) {
      setTempValue(normalizedInitial);
      setIsDuplicate(false);
      setIsEditing(false);
      return;
    }
    onUpdate({ code: val });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        {parentCode && <span className="text-[10px] font-bold text-muted-foreground opacity-50">{parentCode}</span>}
        <Input 
          className={cn(
            "h-6 w-12 text-[10px] p-1 font-bold uppercase",
            isDuplicate ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50" : "border-accent"
          )}
          value={tempValue}
          autoFocus
          maxLength={3}
          onChange={e => { 
            const val = e.target.value.toUpperCase();
            setTempValue(val); 
            setIsDuplicate(validate(val)); 
          }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          onBlur={handleSave}
        />
      </div>
    );
  }

  const displayCode = parentCode ? `${parentCode}${displayValue}` : displayValue;
  return (
    <div 
      className="bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono text-[9px] font-bold border border-border cursor-pointer hover:bg-accent/10 hover:text-accent transition-colors shrink-0"
      onClick={e => { e.stopPropagation(); setIsEditing(true); }}
    >
      {displayCode}
    </div>
  );
}

// --- Main Component ---

export function CurriculumManager({ db }: { db: Firestore }) {
  const { getContent, updatePendingContent } = useSiteContent();
  const domsQ = useMemoFirebase(() => collection(db, 'domains'), [db]);
  const fieldsQ = useMemoFirebase(() => collection(db, 'fields'), [db]);
  const coursesQ = useMemoFirebase(() => collection(db, 'courses'), [db]);

  const { data: domsRaw } = useCollection<Domain>(domsQ);
  const { data: fieldsRaw } = useCollection<Field>(fieldsQ);
  const { data: coursesRaw } = useCollection<Course>(coursesQ);

  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'domain' | 'field' | 'course' } | null>(null);
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [managingCourse, setManagingCourse] = useState<Course | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ collection: string; id: string } | null>(null);
  const [expandedFieldIds, setExpandedFieldIds] = useState<Set<string>>(new Set());

  const toggleField = (id: string) => {
    setExpandedFieldIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const domains = useMemo(() => {
    return (domsRaw || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(dom => {
      const normalizedCode = (dom.code?.startsWith('A') && dom.code.length === 4) 
        ? dom.code.slice(1) 
        : dom.code;
      
      return {
        ...dom,
        code: normalizedCode,
        name: getContent(`dom_name_${dom.id}`, dom.name),
        description: getContent(`dom_desc_${dom.id}`, dom.description)
      };
    });
  }, [domsRaw, getContent]);

  const fields = useMemo(() => {
    return (fieldsRaw || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(field => {
      const normalizedCode = (field.code?.startsWith('B') && field.code.length === 4)
        ? field.code.slice(1)
        : field.code;
      return {
        ...field,
        code: normalizedCode,
        name: getContent(`field_name_${field.id}`, field.name),
        description: getContent(`field_desc_${field.id}`, field.description)
      };
    });
  }, [fieldsRaw, getContent]);

  const courses = useMemo(() => {
    return (coursesRaw || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(course => {
      const normalizedCode = (course.code?.startsWith('C') && course.code.length === 4)
        ? course.code.slice(1)
        : course.code;
      return {
        ...course,
        code: normalizedCode,
        title: getContent(`course_title_${course.id}`, course.title),
        description: getContent(`course_desc_${course.id}`, course.description)
      };
    });
  }, [coursesRaw, getContent]);

  const allDomainCodes = useMemo(() => domains.map(d => d.code).filter(Boolean) as string[], [domains]);
  const allFieldCodes = useMemo(() => fields.map(a => a.code).filter(Boolean) as string[], [fields]);
  const allCourseCodes = useMemo(() => courses.map(c => c.code).filter(Boolean) as string[], [courses]);

  const handleAddDomain = () => {
    const name = 'New Domain';
    const code = generateIntuitiveCode(name, 'A', allDomainCodes);
    addDocumentNonBlocking(collection(db, 'domains'), {
      name,
      description: '',
      slug: `new-domain-${Date.now()}`,
      code,
      order: domains.length,
      visible: true
    });
  };

  const handleAddField = (domainId: string) => {
    const name = 'New Field';
    const code = generateIntuitiveCode(name, 'B', allFieldCodes);
    addDocumentNonBlocking(collection(db, 'fields'), {
      name,
      description: '',
      domainId,
      code,
      order: fields.filter(a => a.domainId === domainId).length,
      visible: true
    });
  };

  const handleAddCourse = (domainId: string, fieldId: string) => {
    const title = 'New Course';
    const code = generateIntuitiveCode(title, 'C', allCourseCodes);
    addDocumentNonBlocking(collection(db, 'courses'), {
      title,
      description: '',
      domainId,
      fieldId,
      code,
      order: courses.filter(c => c.fieldId === fieldId).length,
      visible: true,
      slug: `new-course-${Date.now()}`
    });
  };

  const updateItem = (collectionName: string, id: string, data: any) => {
    const finalData = { ...data };

    if (collectionName === 'domains' && data.name) {
      const currentItem = domains.find(c => c.id === id);
      if (currentItem && currentItem.name !== data.name) {
        const others = allDomainCodes.filter(c => c !== currentItem.code);
        finalData.code = generateIntuitiveCode(data.name, 'A', others);
      }
    } else if (collectionName === 'fields' && data.name) {
      const currentItem = fields.find(a => a.id === id);
      if (currentItem && currentItem.name !== data.name) {
        const others = allFieldCodes.filter(c => c !== currentItem.code);
        finalData.code = generateIntuitiveCode(data.name, 'B', others);
      }
    } else if (collectionName === 'courses' && data.title) {
      const currentItem = courses.find(c => c.id === id);
      if (currentItem && currentItem.title !== data.title) {
        const others = allCourseCodes.filter(c => c !== currentItem.code);
        finalData.code = generateIntuitiveCode(data.title, 'C', others);
      }
    }

    updateDocumentNonBlocking(doc(db, collectionName, id), finalData);
    
    Object.entries(finalData).forEach(([key, val]) => {
      let contentKey = '';
      if (collectionName === 'domains') {
        if (key === 'name') contentKey = `dom_name_${id}`;
        if (key === 'description') contentKey = `dom_desc_${id}`;
      } else if (collectionName === 'fields') {
        if (key === 'name') contentKey = `field_name_${id}`;
        if (key === 'description') contentKey = `field_desc_${id}`;
      } else if (collectionName === 'courses') {
        if (key === 'title') contentKey = `course_title_${id}`;
        if (key === 'description') contentKey = `course_desc_${id}`;
      }
      if (contentKey) updatePendingContent(contentKey, String(val));
    });

    setEditingField(null);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteDocumentNonBlocking(doc(db, itemToDelete.collection, itemToDelete.id));
      setItemToDelete(null);
    }
  };

  const handleDrop = (targetParentId: string, targetType: 'domain' | 'field' | 'course') => {
    if (!draggedItem) return;

    if (draggedItem.type === 'domain' && targetType === 'domain') {
      const targetDom = domains.find(c => c.id === targetParentId);
      const draggedDom = domains.find(c => c.id === draggedItem.id);
      if (targetDom && draggedDom) {
        const targetOrder = targetDom.order;
        const draggedOrder = draggedDom.order;
        updateItem('domains', draggedDom.id, { order: targetOrder });
        updateItem('domains', targetDom.id, { order: draggedOrder });
      }
    } else if (draggedItem.type === 'field' && targetType === 'field') {
      updateItem('fields', draggedItem.id, { domainId: targetParentId });
    } else if (draggedItem.type === 'course' && targetType === 'course') {
      updateItem('courses', draggedItem.id, { fieldId: targetParentId });
    }
    setDraggedItem(null);
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">Domains</h2>
        <p className="text-muted-foreground text-xs font-medium">Manage hierarchical domains, fields, and specialized courses.</p>
      </header>

      <div className="flex justify-end">
        <Button onClick={handleAddDomain} className="gap-2 rounded-xl bg-accent hover:bg-accent/90 font-bold">
          <Plus className="h-4 w-4" /> Add Top-Level Domain
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-4">
        {domains.map((dom) => (
          <AccordionItem 
            key={dom.id} 
            value={dom.id}
            className="border-none bg-card/40 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm relative group/dom"
          >
            <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
              <CodeBadge 
                id={dom.id} 
                collection="domains" 
                code={dom.code} 
                prefix="A" 
                existingCodes={allDomainCodes} 
                onUpdate={(data) => updateItem('domains', dom.id, data)}
              />
              <div className="flex items-center gap-1 opacity-0 group-hover/dom:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateItem('domains', dom.id, { visible: !dom.visible })}>
                  {dom.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 opacity-40" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50" onClick={() => setItemToDelete({ collection: 'domains', id: dom.id })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            
            <AccordionTrigger asChild>
              <div 
                className="w-full flex items-center px-4 py-4 hover:no-underline hover:bg-muted/30 transition-colors text-left pr-16"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.stopPropagation(); handleDrop(dom.id, 'domain'); }}
              >
                <div draggable onDragStart={(e) => { e.stopPropagation(); setDraggedItem({ id: dom.id, type: 'domain' }); }} className="cursor-grab active:cursor-grabbing text-muted-foreground/30 px-2 shrink-0 hover:text-accent">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <LayoutGrid className="h-5 w-5 text-accent shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col items-start gap-1">
                    {editingField?.id === dom.id && editingField?.field === 'name' ? (
                      <Input 
                        autoFocus 
                        defaultValue={dom.name} 
                        onFocus={e => { if (e.target.value.startsWith('New ')) e.target.value = ''; }} 
                        onBlur={e => updateItem('domains', dom.id, { name: e.target.value.trim() || 'New Domain' })} 
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="h-8 text-sm font-bold w-full max-w-[240px]" 
                      />
                    ) : (
                      <h3 className="text-base font-bold cursor-text hover:underline truncate max-w-[240px]" onClick={e => { e.stopPropagation(); setEditingField({ id: dom.id, field: 'name' }); }}>{dom.name}</h3>
                    )}
                    <DescriptionEditor 
                      id={dom.id} 
                      collection="domains" 
                      initialValue={dom.description} 
                      label="Domain description..." 
                      onUpdate={(data) => updateItem('domains', dom.id, data)}
                    />
                  </div>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="p-4 pt-0 space-y-4">
              <div className="grid gap-4 mt-2" onDragOver={e => e.preventDefault()} onDrop={e => { e.stopPropagation(); handleDrop(dom.id, 'domain'); }}>
                {fields.filter(a => a.domainId === dom.id).map(field => {
                  const isFieldExpanded = expandedFieldIds.has(field.id);
                  return (
                    <div key={field.id} className="bg-background/80 rounded-xl border p-2 space-y-2 relative group/field">
                      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-rose-500 hover:bg-rose-50 opacity-0 group-hover/field:opacity-100 transition-opacity" 
                          onClick={(e) => { e.stopPropagation(); setItemToDelete({ collection: 'fields', id: field.id }); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <CodeBadge 
                          id={field.id} 
                          collection="fields" 
                          code={field.code} 
                          prefix="B" 
                          existingCodes={allFieldCodes} 
                          parentCode={dom.code} 
                          onUpdate={(data) => updateItem('fields', field.id, data)}
                        />
                      </div>
                      <div 
                        className="flex items-center gap-3 pr-24 cursor-pointer hover:bg-muted/30 rounded-lg p-1 transition-colors"
                        onClick={() => toggleField(field.id)}
                      >
                        <div 
                          draggable 
                          onDragStart={e => { e.stopPropagation(); setDraggedItem({ id: field.id, type: 'field' }); }} 
                          className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-accent shrink-0 p-1"
                          onClick={e => e.stopPropagation()}
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="text-muted-foreground/60 shrink-0">
                          {isFieldExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        <Layers className="h-4 w-4 text-primary/60 shrink-0" />
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          {editingField?.id === field.id && editingField?.field === 'name' ? (
                            <div onClick={e => e.stopPropagation()}>
                              <Input 
                                autoFocus 
                                defaultValue={field.name} 
                                onFocus={e => { if (e.target.value.startsWith('New ')) e.target.value = ''; }} 
                                onBlur={e => updateItem('fields', field.id, { name: e.target.value.trim() || 'New Field' })} 
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                className="h-7 text-sm w-full max-w-[200px]" 
                              />
                            </div>
                          ) : (
                            <h3 className="text-sm font-bold cursor-text hover:underline truncate max-w-[200px]" onClick={(e) => { e.stopPropagation(); setEditingField({ id: field.id, field: 'name' }); }}>{field.name}</h3>
                          )}
                          <div onClick={e => e.stopPropagation()}>
                            <DescriptionEditor 
                              id={field.id} 
                              collection="fields" 
                              initialValue={field.description} 
                              label="Field description..." 
                              onUpdate={(data) => updateItem('fields', field.id, data)}
                            />
                          </div>
                        </div>
                      </div>
                      {isFieldExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 min-h-[60px] p-2 border-2 border-dashed rounded-xl border-muted/30" onDragOver={e => e.preventDefault()} onDrop={e => { e.stopPropagation(); handleDrop(field.id, 'course'); }}>
                          {courses.filter(c => c.fieldId === field.id).map(course => (
                            <Card key={course.id} className="p-3 border hover:border-accent transition-colors relative group/course bg-card shadow-none flex flex-col">
                              <div className="flex items-start gap-2 h-full">
                                <div draggable onDragStart={e => { e.stopPropagation(); setDraggedItem({ id: course.id, type: 'course' }); }} className="cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-accent mt-1 shrink-0"><GripVertical className="h-3 w-3" /></div>
                                <div className="flex-1 min-w-0 flex flex-col gap-1">
                                  {editingField?.id === course.id && editingField?.field === 'name' ? (
                                    <Input 
                                      autoFocus 
                                      defaultValue={course.title} 
                                      onFocus={e => { if (e.target.value.startsWith('New ')) e.target.value = ''; }} 
                                      onBlur={e => updateItem('courses', course.id, { title: e.target.value.trim() || 'New Course' })} 
                                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                      className="h-7 text-[10px] p-1 w-full" 
                                    />
                                  ) : (
                                    <h4 className="text-[11px] font-bold truncate cursor-text hover:underline" onClick={() => setEditingField({ id: course.id, field: 'name' })}>{course.title}</h4>
                                  )}
                                  <DescriptionEditor 
                                    id={course.id} 
                                    collection="courses" 
                                    initialValue={course.description} 
                                    label="Course description..." 
                                    onUpdate={(data) => updateItem('courses', course.id, data)}
                                  />
                                </div>
                                <div className="flex flex-col justify-between items-end h-full min-h-[50px] shrink-0">
                                  <div className="flex items-center gap-1">
                                    <CodeBadge 
                                      id={course.id} 
                                      collection="courses" 
                                      code={course.code} 
                                      prefix="C" 
                                      existingCodes={allCourseCodes} 
                                      parentCode={`${dom.code || 'XXX'}${field.code || 'XXX'}`}
                                      onUpdate={(data) => updateItem('courses', course.id, data)}
                                    />
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:bg-rose-50 opacity-0 group-hover/course:opacity-100" onClick={() => setItemToDelete({ collection: 'courses', id: course.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 opacity-0 group-hover/course:opacity-100 mt-auto hover:bg-emerald-50" onClick={() => setManagingCourse(course)}><PlayCircle className="h-4 w-4" /></Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                          <Button variant="ghost" onClick={() => handleAddCourse(dom.id, field.id)} className="h-full min-h-[50px] border-2 border-dashed border-muted/50 text-muted-foreground hover:text-accent rounded-xl gap-2 text-[10px] font-bold uppercase tracking-widest"><PlusCircle className="h-4 w-4" /> Add Course</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button variant="outline" onClick={() => handleAddField(dom.id)} className="w-full border-2 border-dashed border-muted/50 py-6 rounded-2xl text-muted-foreground hover:text-primary font-bold uppercase tracking-[0.2em] gap-2"><Plus className="h-4 w-4" /> Add New Field</Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Dialog open={!!managingCourse} onOpenChange={() => setManagingCourse(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-[2.5rem]">
          <DialogTitle className="sr-only">Course Content Editor</DialogTitle>
          {managingCourse && <CourseContentEditor course={managingCourse} onClose={() => setManagingCourse(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={open => !open && setItemToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600 font-bold"><AlertCircle className="h-5 w-5" /> Confirm Permanent Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium pt-2">Are you sure you want to delete this {itemToDelete?.collection.slice(0, -1)}? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-full bg-rose-600 hover:bg-rose-700 font-bold">Confirm Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
