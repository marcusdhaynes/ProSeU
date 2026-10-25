'use client';

import React, { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


import { 
  Search, 
  ShieldCheck, 
  Check
} from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { PRIMARY_ADMIN_EMAIL } from '@/lib/admin-access';

const MARCUS_UID = 'M4aAAH071gevhmRgZ1diT857i5U2';
const MARCUS_EMAILS = [PRIMARY_ADMIN_EMAIL];



interface UserManagementProps {
  users: any[];
  groups: any[];
  currentUser: any;
  isAdmin: boolean;
}

export function UserManagement({ users, groups, currentUser, isAdmin }: UserManagementProps) {
  const db = useFirestore();
  const [search, setSearch] = useState('');
  const [editingCell, setEditingCell] = useState<{ userId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const filteredUsers = useMemo(() => {
    let list = [...users].sort((a, b) => {
      if (a.id === currentUser?.uid) return -1;
      if (b.id === currentUser?.uid) return 1;
      const aIsMarcus = a.id === MARCUS_UID || MARCUS_EMAILS.includes(a.email);
      const bIsMarcus = b.id === MARCUS_UID || MARCUS_EMAILS.includes(b.email);
      if (aIsMarcus) return -1;
      if (bIsMarcus) return 1;
      return 0;
    });

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(u => 
        u.email?.toLowerCase().includes(s) ||
        u.username?.toLowerCase().includes(s) ||
        u.firstName?.toLowerCase().includes(s) ||
        u.lastName?.toLowerCase().includes(s) ||
        u.phone?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [users, search, currentUser]);

  // The live application still authenticates with Firebase. Supabase admin
  // grants cannot be safely assigned to Firebase UIDs, so don't write legacy
  // adminGrants or allow role changes until verified Supabase Auth cutover.
  const handleUpdate = (userId: string, field: string, value: any) => {
    if (!db || !isAdmin || userId === currentUser?.uid) return;
    if (field === 'groupId' || field === 'role' || field === 'email' || field === 'id') return;
    updateDocumentNonBlocking(doc(db, 'users', userId), {
      [field]: value, updatedAt: new Date().toISOString()
    });
    setEditingCell(null);
  };

  const isFiller = (val: string) => {
    const v = String(val).trim();
    return (v.includes('[') && v.includes(']')) || v.includes('Placeholder');
  };

  const renderCell = (u: any, field: string, label: string) => {
    const isEditing = editingCell?.userId === u.id && editingCell?.field === field;
    const placeholder = `[Add ${label}]`;
    const value = editValue !== null && isEditing ? editValue : (u[field] || '');

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input 
            autoFocus
            className="h-6 text-[10px] min-w-[80px] px-1"
            value={value}
            placeholder={placeholder}
            onFocus={(e) => {
              if (isFiller(e.target.value) || e.target.value === placeholder) {
                setEditValue("");
              }
            }}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            onBlur={() => handleUpdate(u.id, field, value || null)}
          />
          <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" onClick={() => handleUpdate(u.id, field, value)}>
            <Check className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div 
        className={cn(
          "cursor-text hover:bg-muted/50 px-1 rounded transition-colors text-xs truncate max-w-[120px] min-h-[1.2rem] flex items-center",
          field === 'username' && "font-bold text-accent"
        )}
        onClick={() => {
          setEditingCell({ userId: u.id, field });
          const initialEditValue = (u[field] === placeholder || !u[field]) ? "" : u[field];
          setEditValue(initialEditValue);
        }}
      >
        {field === 'username' && u[field] ? `@${u[field]}` : (u[field] || placeholder)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Users</h2>
          <p className="text-muted-foreground text-xs font-medium">Review existing accounts while administrator roles move to Supabase.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search directory..." 
            className="pl-10 h-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </div>
      </div>

      <p role="status" className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">Legacy Firebase roles are read-only. Administrator appointments and account deletion will resume only after verified Supabase Google authentication and data migration.</p>
      <div className="rounded-xl border overflow-hidden bg-card font-mono">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-auto py-1 leading-none">User</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-auto py-1 leading-none">Username</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-auto py-1 leading-none">Forename</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-auto py-1 leading-none">Surname</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-auto py-1 leading-none">Email</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-auto py-1 leading-none">Phone</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-auto py-1 leading-none">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((u) => {
              const isMe = u.id === currentUser?.uid;
              const isTargetMarcus = u.id === MARCUS_UID || MARCUS_EMAILS.includes(u.email?.toLowerCase() || '');
              const selectedGroup = groups.find(g => g.id === u.groupId);
              const legacyRoleLabel = selectedGroup?.name || (u.role === 'admin'
                ? 'Legacy Admin (inactive)' : (u.role || 'Basic Free'));

              return (
                <TableRow key={u.id} className={cn("group transition-colors", isMe && "bg-accent/5")}>
                  <TableCell className="py-0.5 px-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                        {u.displayName?.[0] || u.email?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1">
                          {u.displayName || 'Anonymous'}
                          {isTargetMarcus && <ShieldCheck className="h-3 w-3 text-accent" />}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-0.5 px-2">{renderCell(u, 'username', 'Username')}</TableCell>
                  <TableCell className="py-0.5 px-2">{renderCell(u, 'firstName', 'Forename')}</TableCell>
                  <TableCell className="py-0.5 px-2">{renderCell(u, 'lastName', 'Surname')}</TableCell>
                  <TableCell className="py-0.5 px-2">
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest truncate max-w-[120px]">
                      {u.email}
                    </div>
                  </TableCell>
                  <TableCell className="py-0.5 px-2">{renderCell(u, 'phone', 'Phone')}</TableCell>
                  <TableCell className="py-0.5 px-2">
                    <div className="flex items-center justify-between gap-2">
                      {isTargetMarcus ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Administrator (Owner)
                        </span>
                      ) : (
                      <span className="rounded-lg bg-muted/40 px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground" title="Role changes will be available when Supabase Google sign-in is enabled">
                        {legacyRoleLabel}
                      </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>


    </div>
  );
}
