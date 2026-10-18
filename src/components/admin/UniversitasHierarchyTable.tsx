
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, AlertCircle, Trash2, GripVertical, AlertTriangle, CheckCircle2, Database, AlertOctagon, Check } from 'lucide-react';
import { 
  setDoc,
  doc,
  deleteDoc,
  updateDoc,
  deleteField,
  Firestore
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Concept, MULTI_ROW_COLUMNS, contentEngine } from '@/lib/contentEngine';

interface Domain { id: string; name: string; code: string; order: number; }
interface Field { id: string; name: string; code: string; domainId: string; order: number; }
interface Course { id: string; title: string; code: string; fieldId: string; domainId: string; order: number; }

interface UniversitasHierarchyTableProps {
  db: Firestore;
  domains: Domain[];
  fields: Field[];
  courses: Course[];
  concepts: Concept[];
  title?: string;
  description?: string;
}

const MASTERY_MAP: Record<string, string[]> = {
  "Core Principles": ["Authority", "Rights", "Duties", "Harm", "Causation", "Remedy", "Legitimacy"],
  "Major Doctrines": ["Jurisdiction Doctrines", "Liability Doctrines", "Defense Doctrines", "Remedy Doctrines", "Procedural Doctrines", "Constitutional Doctrines", "Equity Doctrines"],
  "Procedural Framework": ["Jurisdiction Establishment", "Pleading", "Motion Practice", "Discovery", "Pre-trial Resolution", "Adjudication", "Appeal and Review"],
  "Decision Standards": ["Authority-Defining Cases", "Rights-Defining Cases", "Limits-of-Power Cases", "Procedure-Defining Cases", "Liability-Expansion Cases", "Liability-Restriction Cases", "Paradigm-Shifting Cases"],
  "Major Cases": ["Individual vs State Power", "Fairness vs Efficiency", "Predictability vs Flexibility", "Centralization vs Decentralization", "Formalism vs Pragmatism", "Stability vs Evolution", "Liberty vs Security"],
  "Policy Debates": ["Issue Spotting", "Rule Extraction", "Burden Manipulation", "Evidence Structuring", "Argument Construction", "Procedural Leverage", "Judicial Psychology Navigation"],
  "Practical Skills": ["Burden of Proof", "Standard of Proof", "Standard of Review", "Level of Scrutiny", "Evidentiary Weight", "Deference Doctrines", "Balancing Tests"]
};

export function UniversitasHierarchyTable({ 
  db, 
  domains, 
  fields, 
  courses, 
  concepts, 
  title, 
  description 
}: UniversitasHierarchyTableProps) {
  const [editingCell, setEditingCell] = useState<{ rowKey: string; key: string } | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [multiRows, setMultiRows] = useState<string[]>([]);
  const [draggedLineIndex, setDraggedLineIndex] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; key: string } | null>(null);
  const [rowDeleteConfirm, setRowDeleteConfirm] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<Concept>>>({});
  const [resolvingConflict, setResolvingConflict] = useState<{ concept: Concept; columnKey: string; tableData: string; dbData: string } | null>(null);

  // Synchronize drafts with incoming Firestore data
  useEffect(() => {
    if (!concepts) return;
    setDrafts(prev => {
      const next = { ...prev };
      let changed = false;
      Object.entries(next).forEach(([key, draft]) => {
        const match = concepts.find(c => 
          c.id === key || 
          c.ID === draft.ID || 
          (key.startsWith('new-') && c.CN === draft.CN && c.DM === draft.DM && c.FL === draft.FL && c.CR === draft.CR)
        );

        if (match) {
          const isSynced = ['CN', 'PM', 'MS', 'PN', 'RC', 'RI', 'DT', 'TR', 'VL', 'DM', 'FL', 'CR', 'principle_code'].every(f => 
            String((match as any)[f] || "") === String((draft as any)[f] || "")
          );
          if (isSynced) {
            delete next[key];
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [concepts]);

  const cleanStringForID = (str: string) => {
    let s = (str || "").replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (s.length === 4 && ['A', 'B', 'C'].includes(s[0])) return s.slice(1);
    return s.slice(0, 3);
  };

  const generateSearchString = (data: any) => {
    const parts = [
      data.DM, data.FL, data.CR, data.MS, data.PN, data.CN, data.PM, data.DT, data.principle_code
    ];
    return parts.filter(Boolean).join(' ').toLowerCase().replace(/[^\w\s]/g, '');
  };

  /**
   * Reconstructs lines from indexed database fields for comparison.
   */
  const getIndexedLines = (concept: Concept, fieldKey: string) => {
    const lineMap: Record<number, string> = {};
    const searchPattern = (fieldKey === 'PM') ? `(?:PM|PR)` : fieldKey;
    
    Object.keys(concept).forEach(k => {
      // Support KEY## format (e.g. PR01)
      const match = k.match(new RegExp(`^${searchPattern}(\\d{2})$`));
      
      // Fallback for legacy format (e.g. PR__01)
      const legacyMatch = !match ? k.match(new RegExp(`^${searchPattern}__(\\d{2})$`)) : null;
      
      if ((match || legacyMatch) && concept[k]) {
        const index = parseInt((match || legacyMatch)![1], 10);
        // Prioritize new format over legacy format if both exist
        if (!lineMap[index] || !k.includes('__')) {
          lineMap[index] = String(concept[k]);
        }
      }
    });
    return Object.keys(lineMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map(idx => lineMap[idx]);
  };

  /**
   * Checks for structural discrepancies or content mismatches.
   */
  const checkDiscrepancy = (concept: Concept) => {
    const issues: string[] = [];
    MULTI_ROW_COLUMNS.forEach(col => {
      const searchPattern = (col === 'PM') ? `(?:PM|PR)` : col;
      
      // Identify legacy formats: KEY__## or 3-digit KEY### or base keys like PR
      const legacyKeys = Object.keys(concept).filter(k => {
        const isLegacyIndexed = k.match(new RegExp(`^${searchPattern}__\\d{2}$`)) || k.match(new RegExp(`^${searchPattern}\\d{3}$`));
        const isLegacyBase = (col === 'PM' && k === 'PR');
        const isModernBase = k === col; // Base field should be deleted after decomposition
        return legacyKeys.includes(k);
      });

      const indexedLines = getIndexedLines(concept, col);
      const joinedIndexed = indexedLines.join('\n').trim();
      
      // Reconstruct what the table WOULD show
      const recon = contentEngine.reconstructConcept(concept);
      const tableValue = recon[col] ? String(recon[col]).trim() : "";

      // Flag if legacy keys exist (migration needed) or if content differs
      if (legacyKeys.length > 0 || tableValue !== joinedIndexed) {
        issues.push(col);
      }
    });
    return issues;
  };

  const { rows, domainSpans, fieldSpans, courseSpans, allDiscrepancies } = useMemo(() => {
    const sortedDomains = [...domains].sort((a, b) => (a.order || 0) - (b.order || 0)).map(d => ({
      ...d,
      code: cleanStringForID(d.code)
    }));
    
    const sortedFields = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0)).map(f => ({
      ...f,
      code: cleanStringForID(f.code)
    }));

    const sortedCourses = [...courses].sort((a, b) => (a.order || 0) - (b.order || 0)).map(c => ({
      ...c,
      code: cleanStringForID(c.code)
    }));

    const rows: any[] = [];
    const domainSpans: Record<string, number> = {};
    const fieldSpans: Record<string, number> = {};
    const courseSpans: Record<string, number> = {};
    const allDiscrepancies: { id: string; columns: string[] }[] = [];

    sortedDomains.forEach(dom => {
      let domRowCount = 0;
      const domFields = sortedFields.filter(f => f.domainId === dom.id);
      
      domFields.forEach(field => {
        let fieldRowCount = 0;
        const fieldCourses = sortedCourses.filter(c => c.fieldId === field.id);
        
        fieldCourses.forEach(course => {
          const courseConcepts = concepts.filter(cn => cleanStringForID(cn.CR) === course.code)
            .sort((a, b) => (a.CN || '').localeCompare(b.CN || ''));

          courseConcepts.forEach((cnObj, idx) => {
            const processed = contentEngine.reconstructConcept(cnObj);
            const discrepancies = checkDiscrepancy(cnObj);
            if (discrepancies.length > 0) {
              allDiscrepancies.push({ id: cnObj.id, columns: discrepancies });
            }

            rows.push({
              dom, field, course, 
              concept: drafts[cnObj.id] || processed,
              rawConcept: cnObj,
              rowKey: cnObj.id,
              isFirstInDom: domRowCount === 0 && idx === 0,
              isFirstInField: fieldRowCount === 0 && idx === 0,
              isFirstInCourse: idx === 0,
              discrepancies
            });
          });

          const newRowKey = `new-${course.id}`;
          const conceptCount = courseConcepts.length;
          rows.push({
            dom, field, course,
            concept: drafts[newRowKey] || null,
            rowKey: newRowKey,
            isFirstInDom: domRowCount === 0 && conceptCount === 0,
            isFirstInField: fieldRowCount === 0 && conceptCount === 0,
            isFirstInCourse: conceptCount === 0,
            isNewRow: true,
            discrepancies: []
          });
          
          const numRowsForCourse = conceptCount + 1;
          courseSpans[course.id] = numRowsForCourse;
          fieldRowCount += numRowsForCourse;
          domRowCount += numRowsForCourse;
        });
        fieldSpans[field.id] = fieldRowCount;
      });
      domainSpans[dom.id] = domRowCount;
    });

    return { rows, domainSpans, fieldSpans, courseSpans, allDiscrepancies };
  }, [domains, fields, courses, concepts, drafts]);

  const handleCellSave = async (row: any, key: string, value: string) => {
    if (!db) return;
    
    let finalValue: any = value;
    if (key === 'TR' || key === 'VL') {
      finalValue = Number(String(value).replace(/\D/g, '')) || 0;
    } else {
      finalValue = String(value).trim();
    }

    const updates: any = {
      ...(row.concept || {}),
      DM: cleanStringForID(row.dom.code),
      FL: cleanStringForID(row.field.code),
      CR: cleanStringForID(row.course.code),
      updatedAt: new Date().toISOString()
    };

    if (MULTI_ROW_COLUMNS.includes(key)) {
      // 1. Mark primary key and legacy PR key for deletion
      updates[key] = deleteField();
      if (key === 'PM') updates['PR'] = deleteField();
      
      // 2. Clean up ALL indexed variants (modern and legacy)
      Object.keys(row.rawConcept || row.concept || {}).forEach(k => {
        const searchPattern = (key === 'PM') ? `(?:PM|PR)` : key;
        const isMatch = k.match(new RegExp(`^${searchPattern}(\\d{2})$`)) || k.match(new RegExp(`^${searchPattern}__(\\d{2})$`));
        if (isMatch) {
          updates[k] = deleteField();
        }
      });

      // 3. Write new standardized format
      const lines = finalValue.split('\n').map((l: string) => l.trim()).filter(Boolean);
      lines.forEach((line: string, idx: number) => {
        const subKey = `${key}${String(idx + 1).padStart(2, '0')}`;
        updates[subKey] = line;
      });
    } else {
      updates[key] = finalValue;
    }

    const localForSearch = { ...updates };
    MULTI_ROW_COLUMNS.forEach(col => {
      if (col === key) {
        localForSearch[col] = finalValue;
      } else {
        const indexed = getIndexedLines(row.concept || {}, col);
        if (indexed.length > 0) localForSearch[col] = indexed.join('\n');
      }
    });
    updates.SEARCH = generateSearchString(localForSearch);

    setDrafts(prev => ({
      ...prev,
      [row.rowKey]: { ...updates, [key]: finalValue } 
    }));

    const courseConcepts = concepts
      .filter(cn => cleanStringForID(cn.DM) === updates.DM && cleanStringForID(cn.FL) === updates.FL && cleanStringForID(cn.CR) === updates.CR)
      .sort((a, b) => (a.CN || '').localeCompare(b.CN || ''));
    
    let index = courseConcepts.findIndex(c => c.id === row.rowKey);
    if (index === -1 && localForSearch.CN) {
       const tempObj = { ...localForSearch, id: row.rowKey };
       const hypotheticalList = [...courseConcepts, tempObj].sort((a, b) => (a.CN || '').localeCompare(b.CN || ''));
       index = hypotheticalList.findIndex(c => c.id === row.rowKey);
    }

    const isPersistable = localForSearch.CN && updates.DM && updates.FL && updates.CR;

    if (isPersistable) {
      const seq = String(index + 1).padStart(3, '0');
      const finalId = `${updates.DM}${updates.FL}${updates.CR}${seq}`;
      const oldId = (row.concept && row.concept.ID) ? row.concept.ID : null;
      
      updates.ID = finalId;
      
      const docRef = doc(db, 'atomic_concepts', finalId);
      setDoc(docRef, updates, { merge: true }).then(() => {
        if (oldId && oldId !== finalId) {
          deleteDoc(doc(db, 'atomic_concepts', oldId));
        }
        if (row.rowKey.startsWith('new-')) {
          setDrafts(prev => {
            const n = { ...prev };
            delete n[row.rowKey];
            return n;
          });
        }
      }).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: updates
        }));
      });
    }
    
    setEditingCell(null);
  };

  const resolveConflict = async (concept: Concept, mode: 'canonical' | 'indexed') => {
    if (!db || !resolvingConflict) return;
    
    const col = resolvingConflict.columnKey;
    const docRef = doc(db, 'atomic_concepts', concept.ID);
    const updates: any = { updatedAt: new Date().toISOString() };

    // 1. Clean up ALL variations of the current key (Base field and PR legacy)
    updates[col] = deleteField();
    if (col === 'PM') updates['PR'] = deleteField();

    // 2. Clean up ALL indexed variants (KEY01, KEY__01, etc)
    Object.keys(concept).forEach(k => {
      const searchPattern = (col === 'PM') ? `(?:PM|PR)` : col;
      const isFormatMatch = k.match(new RegExp(`^${searchPattern}(\\d{2,3})$`)) || k.match(new RegExp(`^${searchPattern}__(\\d{2})$`));
      if (isFormatMatch) {
        updates[k] = deleteField();
      }
    });

    // 3. Decompose standardized content into modern format (KEY01)
    const finalColContent = mode === 'canonical' ? resolvingConflict.tableData : resolvingConflict.dbData;
    const lines = finalColContent.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach((line, i) => {
      const subKey = `${col}${String(i + 1).padStart(2, '0')}`;
      updates[subKey] = line;
    });

    // 4. Update Search Index
    const localRecon = contentEngine.reconstructConcept(concept);
    localRecon[col] = finalColContent;
    updates.SEARCH = generateSearchString(localRecon);

    // 5. Persistence
    updateDoc(docRef, updates).then(() => {
      setResolvingConflict(null);
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: updates
      }));
    });
  };

  const handleClearCell = () => {
    if (!deleteConfirm || !db) return;
    const concept = concepts.find(c => c.id === deleteConfirm.id) || (drafts[deleteConfirm.id] as Concept);
    if (concept && concept.ID) {
      const docRef = doc(db, 'atomic_concepts', concept.ID);
      const updates: any = {
        [deleteConfirm.key]: deleteField(),
        updatedAt: new Date().toISOString()
      };
      if (deleteConfirm.key === 'PM') updates['PR'] = deleteField();
      
      Object.keys(concept).forEach(k => {
        const searchPattern = (deleteConfirm.key === 'PM') ? `(?:PM|PR)` : deleteConfirm.key;
        const isMatch = k.match(new RegExp(`^${searchPattern}(\\d{2})$`)) || k.match(new RegExp(`^${searchPattern}__(\\d{2})$`));
        if (isMatch) {
          updates[k] = deleteField();
        }
      });

      updateDoc(docRef, updates);
    }
    setDeleteConfirm(null);
  };

  const navigateCell = (direction: 'up' | 'down') => {
    if (!editingCell) return;
    const currentIndex = rows.findIndex(r => r.rowKey === editingCell.rowKey);
    let nextIndex = direction === 'down' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= 0 && nextIndex < rows.length) {
      const currentRow = rows[currentIndex];
      const nextRow = rows[nextIndex];
      const nextVal = nextRow.concept?.[editingCell.key] || '';
      
      handleCellSave(currentRow, editingCell.key, tempValue);
      
      setEditingCell({ rowKey: nextRow.rowKey, key: editingCell.key });
      setTempValue(String(nextVal));
      
      if (MULTI_ROW_COLUMNS.includes(editingCell.key)) {
        const lines = String(nextVal).split('\n');
        if (lines.length === 0 || lines[lines.length - 1] !== "") lines.push("");
        setMultiRows(lines);
      }
    } else {
      handleCellSave(rows[currentIndex], editingCell.key, tempValue);
    }
  };

  const handleDeleteRow = () => {
    if (!rowDeleteConfirm || !db) return;
    deleteDoc(doc(db, 'atomic_concepts', rowDeleteConfirm));
    setRowDeleteConfirm(null);
  };

  const handleMultiRowChange = (index: number, val: string) => {
    const updated = [...multiRows];
    updated[index] = val;
    if (index === updated.length - 1 && val.trim() !== "") {
      updated.push("");
    }
    setMultiRows(updated);
    setTempValue(updated.filter(r => r.trim() !== "").join('\n'));
  };

  const deleteMultiRow = (index: number) => {
    const updated = multiRows.filter((_, i) => i !== index);
    if (updated.length === 0 || (updated.length > 0 && updated[updated.length - 1] !== "")) {
      updated.push("");
    }
    setMultiRows(updated);
    setTempValue(updated.filter(r => r.trim() !== "").join('\n'));
  };

  const handleDragStart = (index: number) => {
    setDraggedLineIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggedLineIndex === null || draggedLineIndex === index) return;
    const newRows = [...multiRows];
    const itemToMove = newRows[draggedLineIndex];
    newRows.splice(draggedLineIndex, 1);
    newRows.splice(index, 0, itemToMove);
    setDraggedLineIndex(index);
    setMultiRows(newRows);
    setTempValue(newRows.filter(r => r.trim() !== "").join('\n'));
  };

  const handleDragEnd = () => {
    setDraggedLineIndex(null);
  };

  const COLUMNS = [
    { key: 'MS', label: 'Mastery', code: 'MS' },
    { key: 'PN', label: 'Principle', code: 'PN' },
    { key: 'TR', label: 'Tier', code: 'TR', narrow: true },
    { key: 'VL', label: 'Value', code: 'VL', narrow: true },
    { key: 'CN', label: 'Concept', code: 'CN' },
    { key: 'PM', label: 'Prompt', code: 'PM' },
    { key: 'RC', label: 'Response', spec: '(Correct)', code: 'RC' },
    { key: 'RI', label: 'Response', spec: '(Incorrect)', code: 'RI' },
    { key: 'DT', label: 'Detail', code: 'DT' },
    { key: 'ES', label: 'Example', spec: '(Synonymous)', code: 'ES' },
    { key: 'EA', label: 'Example', spec: '(Antonymy)', code: 'EA' },
    { key: 'HN', label: 'Hint', code: 'HN' },
    { key: 'MN', label: 'Mnemonic', code: 'MN' },
    { key: 'ID', label: 'Lesson ID', code: 'ID', isID: true }
  ];

  const handleMasteryToggle = (row: any, mastery: string, checked: boolean) => {
    const currentLines = (tempValue || "").split('\n').map(l => l.trim()).filter(Boolean);
    let nextLines: string[] = [];
    if (checked) {
      nextLines = [...currentLines, mastery];
    } else {
      nextLines = currentLines.filter(l => l !== mastery);
    }
    const finalVal = nextLines.join('\n');
    setTempValue(finalVal);
    
    // Automatically cleanse Section [PN] field if a Mastery is unchecked
    if (!checked) {
      const associatedSections = MASTERY_MAP[mastery] || [];
      const currentPN = String(row.concept?.PN || "").split('\n').map(l => l.trim()).filter(Boolean);
      const nextPN = currentPN.filter(s => !associatedSections.includes(s)).join('\n');
      if (nextPN !== String(row.concept?.PN || "")) {
        handleCellSave(row, 'PN', nextPN);
      }
    }
  };

  const handleSectionToggle = (section: string, checked: boolean) => {
    const currentLines = (tempValue || "").split('\n').map(l => l.trim()).filter(Boolean);
    let nextLines: string[] = [];
    if (checked) {
      nextLines = [...currentLines, section];
    } else {
      nextLines = currentLines.filter(l => l !== section);
    }
    setTempValue(nextLines.join('\n'));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {title && <h2 className="text-xl font-bold">{title}</h2>}
          {description && <p className="text-muted-foreground text-xs font-medium">{description}</p>}
        </div>
      </div>

      {allDiscrepancies.length > 0 && (
        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900 rounded-[2rem] shadow-sm animate-in fade-in slide-in-from-top-4">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-sm font-bold uppercase tracking-widest">Database Format Discrepancy</AlertTitle>
          <AlertDescription className="text-xs font-medium leading-relaxed opacity-80 pt-1">
            Some concepts contain merged fields or legacy keys that require decomposition. Click any cell flag to resolve.
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-card border rounded-xl overflow-x-auto shadow-sm font-mono text-xs">
        <Table className="w-full table-fixed border-collapse">
          <TableHeader className="bg-muted/50">
            <TableRow>
              {[
                { label: 'Domain', code: 'DM' },
                { label: 'Field', code: 'FL' },
                { label: 'Course', code: 'CR' }
              ].map(h => (
                <TableHead key={h.label} className="text-xs font-bold uppercase tracking-wider text-center border-r w-[4%] align-middle h-auto p-1 leading-none">
                  <div className="flex flex-col items-center justify-center">
                    <span>{h.label}</span>
                    <span className="min-h-[1em]"></span>
                    <span className="text-accent">[{h.code}]</span>
                  </div>
                </TableHead>
              ))}
              {COLUMNS.map(col => {
                let widthClass = "w-[6.3%]";
                if (col.narrow) widthClass = "w-[4%]";
                if (col.isID) widthClass = "w-[10.0%]";

                return (
                  <TableHead key={col.key} className={cn(
                    "text-xs font-bold uppercase tracking-wider text-center border-r align-middle h-auto p-1 leading-none",
                    widthClass
                  )}>
                    <div className="flex flex-col items-center justify-center">
                      <span>{col.label}</span>
                      <span className="min-h-[1em]">{col.spec}</span>
                      <span className="text-accent">[{col.code}]</span>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isDraft = drafts[row.rowKey];
              return (
                <TableRow key={row.rowKey} className={cn("group transition-colors", !row.concept && "bg-accent/5 hover:bg-accent/10", isDraft && "bg-amber-50/30")}>
                  {row.isFirstInDom && (
                    <TableCell rowSpan={domainSpans[row.dom.id]} className="border-r border-b font-bold bg-background/50 align-middle py-1 text-center text-xs">
                      {row.dom.code}
                    </TableCell>
                  )}
                  {row.isFirstInField && (
                    <TableCell rowSpan={fieldSpans[row.field.id]} className="border-r border-b font-bold bg-background/30 align-middle py-1 text-center text-xs">
                      {row.field.code}
                    </TableCell>
                  )}
                  {row.isFirstInCourse && (
                    <TableCell rowSpan={courseSpans[row.course.id]} className="border-r border-b font-bold align-middle py-1 text-center text-xs">
                      {row.course.code}
                    </TableCell>
                  )}

                  {COLUMNS.map((col) => {
                    const isNarrow = col.narrow || col.isID || ['DM', 'FL', 'CR'].includes(col.code);
                    const isID = col.isID;
                    const rawValue = isID ? (row.concept?.ID || '...') : (row.concept?.[col.key] || '');
                    const isEditing = editingCell?.rowKey === row.rowKey && editingCell?.key === col.key;
                    
                    const firstLine = String(rawValue).split('\n')[0];
                    const lineCount = String(rawValue).split('\n').filter(l => l.trim()).length;
                    const isConflictCell = row.discrepancies?.includes(col.key);
                    
                    const displayValue = isNarrow 
                      ? (isID ? rawValue : (String(rawValue).replace(/\D/g, '') ? new Intl.NumberFormat('en-US').format(Number(String(rawValue).replace(/\D/g, ''))) : String(rawValue))) 
                      : (String(rawValue).includes('\n') ? `[${lineCount}] ${firstLine.slice(0, 15)}...` : String(rawValue));

                    if (isID) {
                      return (
                        <TableCell key={col.key} className="border-r border-b py-0.5 px-1 text-center align-middle text-accent font-bold text-xs truncate relative group/id">
                          <div className="flex items-center justify-center gap-1">
                            {rawValue}
                          </div>
                          {row.concept && row.concept.ID && (
                            <button 
                              onClick={() => setRowDeleteConfirm(row.concept.ID)}
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/id:opacity-100 transition-opacity text-rose-500 hover:text-rose-700 bg-background rounded p-0.5 shadow-sm border"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell 
                        key={col.key} 
                        className={cn(
                          "border-r border-b py-0.5 px-1 relative group/cell align-middle min-h-[1.2rem] text-xs",
                          isNarrow ? "text-center" : "text-left",
                          isConflictCell && "bg-amber-50/50"
                        )}
                      >
                        {isConflictCell && !isEditing && (
                          <div className="absolute inset-x-0 -top-2 flex justify-center z-10">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const rawDbValue = getIndexedLines(row.rawConcept, col.key).join('\n');
                                setResolvingConflict({ 
                                  concept: row.rawConcept, 
                                  columnKey: col.key,
                                  tableData: String(row.concept[col.key] || ""),
                                  dbData: rawDbValue
                                });
                              }}
                              className="bg-amber-500 text-white rounded-full p-0.5 shadow-lg animate-pulse hover:scale-110 transition-transform"
                            >
                              <AlertOctagon className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {isEditing ? (
                          isNarrow ? (
                            <Input
                              autoFocus
                              value={tempValue}
                              onChange={(e) => {
                                if (col.key === 'TR' || col.key === 'VL') {
                                  setTempValue(e.target.value.replace(/\D/g, '').slice(0, 4));
                                } else {
                                  setTempValue(e.target.value.toUpperCase().slice(0, 10));
                                }
                              }}
                              onBlur={() => handleCellSave(row, col.key, tempValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }
                                if (e.key === 'Tab') {
                                  e.preventDefault();
                                  navigateCell(e.shiftKey ? 'up' : 'down');
                                }
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="h-6 text-xs text-center border-accent focus-visible:ring-accent/20 px-1 font-mono rounded-none bg-accent/5"
                            />
                          ) : col.key === 'MS' ? (
                            <Popover open={true} onOpenChange={(open) => !open && handleCellSave(row, col.key, tempValue)}>
                              <PopoverTrigger asChild>
                                <div className="truncate w-full min-h-[1rem] bg-accent/5 text-xs text-left">{displayValue || "..."}</div>
                              </PopoverTrigger>
                              <PopoverContent 
                                className="w-64 p-4 rounded-xl shadow-2xl border-2 border-accent bg-background z-50"
                                onInteractOutside={() => handleCellSave(row, col.key, tempValue)}
                              >
                                <div className="space-y-3">
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b pb-2">Select Masteries</h4>
                                  <div className="space-y-2">
                                    {Object.keys(MASTERY_MAP).map(m => {
                                      const isChecked = tempValue.split('\n').map(l => l.trim()).includes(m);
                                      return (
                                        <div key={m} className="flex items-center space-x-2">
                                          <Checkbox 
                                            id={`mastery-${m}`} 
                                            checked={isChecked} 
                                            onCheckedChange={(checked) => handleMasteryToggle(row, m, !!checked)} 
                                          />
                                          <Label htmlFor={`mastery-${m}`} className="text-xs font-bold leading-none cursor-pointer">{m}</Label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : col.key === 'PN' ? (
                            <Popover open={true} onOpenChange={(open) => !open && handleCellSave(row, col.key, tempValue)}>
                              <PopoverTrigger asChild>
                                <div className="truncate w-full min-h-[1rem] bg-accent/5 text-xs text-left">{displayValue || "..."}</div>
                              </PopoverTrigger>
                              <PopoverContent 
                                className="w-80 p-4 rounded-xl shadow-2xl border-2 border-accent bg-background z-50"
                                onInteractOutside={() => handleCellSave(row, col.key, tempValue)}
                              >
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b pb-2 sticky top-0 bg-background z-10">Select Principles</h4>
                                  {Object.entries(MASTERY_MAP).map(([m, sections]) => {
                                    const isMasterySelected = String(row.concept?.MS || "").split('\n').map(l => l.trim()).includes(m);
                                    if (!isMasterySelected) return null;
                                    
                                    return (
                                      <div key={m} className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent/60">{m}</p>
                                        <div className="space-y-1.5 pl-2 border-l-2 border-accent/10">
                                          {sections.map(s => {
                                            const isChecked = tempValue.split('\n').map(l => l.trim()).includes(s);
                                            return (
                                              <div key={s} className="flex items-center space-x-2">
                                                <Checkbox 
                                                  id={`section-${s}`} 
                                                  checked={isChecked} 
                                                  onCheckedChange={(checked) => handleSectionToggle(s, !!checked)} 
                                                />
                                                <Label htmlFor={`section-${s}`} className="text-xs font-medium leading-none cursor-pointer">{s}</Label>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {(!row.concept?.MS || String(row.concept.MS).trim() === "") && (
                                    <p className="text-[10px] text-muted-foreground italic text-center py-4">Please select at least one Mastery first.</p>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <Popover open={true} onOpenChange={(open) => !open && handleCellSave(row, col.key, multiRows.filter(r => r.trim()).join('\n'))}>
                              <PopoverTrigger asChild>
                                <div className="truncate w-full min-h-[1rem] bg-accent/5 text-xs text-left">{displayValue || "..."}</div>
                              </PopoverTrigger>
                              <PopoverContent 
                                className="w-[450px] p-2 rounded-xl shadow-2xl border-2 border-accent bg-background z-50"
                                onInteractOutside={() => handleCellSave(row, col.key, multiRows.filter(r => r.trim()).join('\n'))}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{col.label} {col.spec}</h4>
                                  </div>
                                  <div className="max-h-[350px] overflow-y-auto space-y-1 px-1">
                                    {multiRows.map((line, idx) => (
                                      <div 
                                        key={idx} 
                                        draggable 
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragEnter={() => handleDragEnter(idx)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => e.preventDefault()}
                                        className={cn(
                                          "flex items-center gap-2 group/row transition-all duration-200",
                                          draggedLineIndex === idx ? "opacity-40 scale-95" : "opacity-100"
                                        )}
                                      >
                                        <div className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-accent p-1 shrink-0">
                                          <GripVertical className="h-3.5 w-3.5" />
                                        </div>
                                        <Input 
                                          autoFocus={idx === 0}
                                          value={line}
                                          onChange={(e) => handleMultiRowChange(idx, e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              handleCellSave(row, col.key, multiRows.filter(r => r.trim()).join('\n'));
                                            }
                                            if (e.key === 'Tab') {
                                              e.preventDefault();
                                              const inputs = e.currentTarget.closest('.space-y-1')?.querySelectorAll('input');
                                              if (!inputs) return;
                                              if (e.shiftKey) {
                                                if (idx > 0) (inputs[idx - 1] as HTMLInputElement).focus();
                                              } else {
                                                if (idx < inputs.length - 1) (inputs[idx + 1] as HTMLInputElement).focus();
                                              }
                                            }
                                            if (e.key === 'Enter' && e.shiftKey) {
                                              e.preventDefault();
                                              const inputs = e.currentTarget.closest('.space-y-1')?.querySelectorAll('input');
                                              if (inputs && idx < inputs.length - 1) (inputs[idx + 1] as HTMLInputElement).focus();
                                            }
                                            if (e.key === 'Escape') {
                                              e.preventDefault();
                                              setEditingCell(null);
                                            }
                                          }}
                                          className="h-8 text-xs font-mono"
                                          placeholder={idx === multiRows.length - 1 ? "Add new..." : `Line ${idx + 1}...`}
                                        />
                                        <button 
                                          onClick={() => deleteMultiRow(idx)}
                                          className="text-rose-500 hover:text-rose-700 opacity-0 group-hover/row:opacity-100 transition-opacity"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )
                        ) : (
                          <div 
                            className={cn(
                              "cursor-text hover:bg-accent/5 transition-colors min-h-[1.2rem] flex items-center text-xs",
                              isNarrow ? "justify-center" : "justify-start truncate w-full"
                            )}
                            onClick={() => {
                              setEditingCell({ rowKey: row.rowKey, key: col.key });
                              const val = String(rawValue);
                              setTempValue(val);
                              
                              if (!['MS', 'PN'].includes(col.key)) {
                                const lines = val.split('\n');
                                if (lines.length === 0 || lines[lines.length - 1] !== "") lines.push("");
                                setMultiRows(lines);
                              }
                            }}
                            title={String(rawValue)}
                          >
                            {displayValue || ""}
                          </div>
                        )}

                        {!isEditing && row.concept && (String(rawValue).length > 0) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({ id: row.rowKey, key: col.key });
                            }}
                            className="absolute bottom-0 right-0 p-0.5 opacity-0 group-hover/cell:opacity-100 transition-opacity text-rose-500 hover:text-rose-700 bg-background/80 rounded-tl-md"
                          >
                            <X className="h-2 w-2" />
                          </button>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!resolvingConflict} onOpenChange={() => setResolvingConflict(null)}>
        <AlertDialogContent className="rounded-[2.5rem] max-w-2xl overflow-hidden border-2 border-accent">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 font-black px-6 pt-6">
              <Database className="h-6 w-6" /> Reconcile Atomic Data
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-6 pt-4 px-6 pb-6" asChild>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-foreground">
                    Discrepancy in <span className="text-accent">[{resolvingConflict?.columnKey}]</span> for Lesson <span className="font-mono">{resolvingConflict?.concept?.ID}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Choose which data source should be considered canonical. The database format will be automatically standardized to KEY##.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="rounded-2xl border bg-muted/30 p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Atomic Concepts (Table)</h4>
                    </div>
                    <div className="flex-1 bg-background border rounded-xl p-3 text-[11px] font-mono whitespace-pre-wrap max-h-[150px] overflow-y-auto mb-4">
                      {resolvingConflict?.tableData || <span className="italic opacity-30">[Empty]</span>}
                    </div>
                    <Button 
                      className="w-full rounded-xl bg-primary hover:bg-primary/90 font-bold h-11 shadow-lg"
                      onClick={() => resolvingConflict && resolveConflict(resolvingConflict.concept, 'canonical')}
                    >
                      Save to Atomic Concepts
                    </Button>
                  </Card>

                  <Card className="rounded-2xl border bg-accent/5 p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-accent">Database (Indexed Fields)</h4>
                    </div>
                    <div className="flex-1 bg-background border rounded-xl p-3 text-[11px] font-mono whitespace-pre-wrap max-h-[150px] overflow-y-auto mb-4">
                      {resolvingConflict?.dbData || <span className="italic opacity-30">[Empty]</span>}
                    </div>
                    <Button 
                      className="w-full rounded-xl bg-accent hover:bg-accent/90 text-white font-bold h-11 shadow-lg"
                      onClick={() => resolvingConflict && resolveConflict(resolvingConflict.concept, 'indexed')}
                    >
                      Save to Database
                    </Button>
                  </Card>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-muted/30 p-4 flex justify-end gap-3 border-t">
            <AlertDialogCancel className="rounded-full font-bold px-8">Cancel</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 font-bold">Clear Cell Content?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium">
              Are you sure you wish to delete the cell's content and all indexed sub-fields? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearCell}
              className="rounded-full bg-rose-600 hover:bg-rose-700 font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!rowDeleteConfirm} onOpenChange={() => setRowDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 font-bold">Delete Atomic Concept?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium">
              Are you sure you wish to permanently delete this atomic unit from the knowledge base?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRow}
              className="rounded-full bg-rose-600 hover:bg-rose-700 font-bold"
            >
              Delete Unit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
