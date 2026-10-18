'use client';

import React, { useState } from 'react';
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
import { Plus, Save, Trash2, X, Check } from 'lucide-react';
import { 
  updateDocumentNonBlocking, 
  addDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from '@/firebase/non-blocking-updates';
import { collection, doc, Firestore } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'boolean';
}

interface EditableTableProps {
  db: Firestore;
  collectionName: string;
  columns: Column[];
  data: any[];
  title?: string;
  description?: string;
}

export function EditableTable({ db, collectionName, columns, data, title, description }: EditableTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newValues, setNewValues] = useState<any>({});

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditValues(item);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = (id: string) => {
    updateDocumentNonBlocking(doc(db, collectionName, id), editValues);
    setEditingId(null);
  };

  const startAdd = () => {
    setIsAdding(true);
    setNewValues({});
  };

  const saveNew = () => {
    addDocumentNonBlocking(collection(db, collectionName), {
      ...newValues,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setIsAdding(false);
    setNewValues({});
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteDocumentNonBlocking(doc(db, collectionName, id));
    }
  };

  const parseLabel = (label: string) => {
    const bracketMatch = label.match(/\[.*?\]/);
    const parenMatch = label.match(/\(.*?\)/);
    
    let mainText = label;
    if (bracketMatch) mainText = mainText.replace(bracketMatch[0], '');
    if (parenMatch) mainText = mainText.replace(parenMatch[0], '');
    
    return {
      main: mainText.trim(),
      paren: parenMatch ? parenMatch[0].trim() : '',
      bracket: bracketMatch ? bracketMatch[0].trim() : ''
    };
  };

  const items = data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {(title || description) && (
          <div>
            {title && <h2 className="text-xl font-bold">{title}</h2>}
            {description && <p className="text-muted-foreground text-xs font-medium">{description}</p>}
          </div>
        )}
        {!title && !description && <div />}
        {!isAdding && (
          <Button onClick={startAdd} variant="outline" size="sm" className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Add Row
          </Button>
        )}
      </div>

      <div className="bg-card border rounded-xl p-6 overflow-x-auto">
        <Table className="w-full table-fixed min-w-[1200px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              {columns.map((col) => {
                const { main, paren, bracket } = parseLabel(col.label);
                return (
                  <TableHead 
                    key={col.key} 
                    className="text-[10px] font-bold uppercase tracking-wider text-center h-auto py-4 align-top"
                  >
                    <div className="flex flex-col items-center justify-start h-full gap-0.5">
                      <span className="leading-tight block whitespace-nowrap min-h-[1.2em]">{main}</span>
                      <span className="leading-tight block whitespace-nowrap min-h-[1.2em]">{paren || "\u00A0"}</span>
                      <span className="leading-tight block whitespace-nowrap min-h-[1.2em] text-accent">{bracket || "\u00A0"}</span>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdding && (
              <TableRow className="bg-accent/5">
                {columns.map((col, idx) => (
                  <TableCell key={col.key} className="text-center relative">
                    <Input
                      size={1}
                      value={newValues[col.key] || ''}
                      onChange={(e) => setNewValues({ ...newValues, [col.key]: e.target.value })}
                      className="h-8 text-xs text-center"
                      placeholder={col.label}
                      onKeyDown={(e) => e.key === 'Enter' && saveNew()}
                    />
                    {idx === columns.length - 1 && (
                      <div className="absolute top-1/2 -right-2 -translate-y-1/2 flex gap-1 z-10">
                        <Button onClick={saveNew} size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 bg-background shadow-sm border">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => setIsAdding(false)} size="icon" variant="ghost" className="h-7 w-7 text-rose-600 bg-background shadow-sm border">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            )}

            {items.map((item) => (
              <TableRow key={item.id} className="group">
                {columns.map((col, idx) => (
                  <TableCell key={col.key} className="text-xs text-center relative group/cell">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <Input
                          size={1}
                          value={editValues[col.key] || ''}
                          onChange={(e) => setEditValues({ ...editValues, [col.key]: e.target.value })}
                          className="h-8 text-xs text-center"
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit(item.id)}
                        />
                        {idx === columns.length - 1 && (
                          <div className="absolute top-1/2 -right-2 -translate-y-1/2 flex gap-1 z-10">
                            <Button onClick={() => saveEdit(item.id)} size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 bg-background shadow-sm border">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button onClick={cancelEdit} size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground bg-background shadow-sm border">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center min-h-[32px]">
                        <span className="truncate block w-full px-2" title={String(item[col.key] || '')}>
                          {String(item[col.key] || '')}
                        </span>
                        {idx === columns.length - 1 && (
                          <div className="absolute top-1/2 -right-2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <Button onClick={() => startEdit(item)} size="icon" variant="ghost" className="h-7 w-7 bg-background shadow-sm border">
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => handleDelete(item.id)} size="icon" variant="ghost" className="h-7 w-7 text-rose-500 bg-background shadow-sm border">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
