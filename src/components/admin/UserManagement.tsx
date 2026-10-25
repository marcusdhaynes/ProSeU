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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@/components/ui/select';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  ShieldCheck, 
  Check, 
  Trash2, 
  AlertCircle,
  ChevronRight,
  User as UserIcon
} from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { PRIMARY_ADMIN_EMAIL } from '@/lib/admin-access';

const MARCUS_UID = 'M4aAAH071gevhmRgZ1diT857i5U2';
const MARCUS_EMAILS = [PRIMARY_ADMIN_EMAIL];

const GROUP_TYPE_MAP = {
  'free': 'Free',
  'trial': 'Trial',
  'membership': 'Memberships',
  'organization': 'Organizations',
  'admin': 'Administrators'
} as const;

interface UserManagementProps {
  users: any[];
  groups: any[];
  currentUser: any;
  currentUserDoc: any;
  isAdmin: boolean;
  adminGrants: any[];
}

export function UserManagement({ users, groups, currentUser, isAdmin, adminGrants }: UserManagementProps) {
  const db = useFirestore();
  const [search, setSearch] = useState('');
  const [editingCell, setEditingCell] = useState<{ userId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const [roleError, setRoleError] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const groupTree = useMemo(() => {
    const roleGroups: Record<string, any[]> = {
      'free': [],
      'trial': [],
      'membership': [],
      'organization': [],
      'admin': []
    };

    const buildTree = (parentId: string | null, type: string, depth = 0): any[] => {
      return groups
        .filter(g => g.category === type && g.parentId === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .flatMap(g => [
          { ...g, depth },
          ...buildTree(g.id, type, depth + 1)
        ]);
    };

    Object.keys(roleGroups).forEach(type => {
      roleGroups[type] = buildTree(null, type);
    });

    return roleGroups;
  }, [groups]);

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

  const handleUpdate = async (userId: string, field: string, value: any) => {
    if (!db || !isAdmin) return;
    const target = users.find(u => u.id === userId);
    if (!target) return;
    // Owner cannot be demoted. Delegated admins cannot remove their own access.
    if (field === 'groupId' && (userId === currentUser?.uid ||
      userId === MARCUS_UID ||
      target.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL)) return;

    if (field !== 'groupId') {
      updateDocumentNonBlocking(doc(db, 'users', userId), {
        [field]: value, updatedAt: new Date().toISOString()
      });
      setEditingCell(null);
      return;
    }

    const selectedGroup = groups.find(g => g.id === value);
    const shouldGrantAdmin = value === '__admin__' ||
      selectedGroup?.category === 'admin';
    if (value !== 'none' && value !== '__admin__' && !selectedGroup) return;
    if (shouldGrantAdmin && !target.email) {
      setRoleError('Cannot appoint an administrator without an email address.');
      return;
    }

    const role = shouldGrantAdmin ? 'admin' :
      value === 'none' || selectedGroup?.category === 'free' ? 'free' :
      selectedGroup?.category === 'trial' ?
        (selectedGroup.name.includes('7') ? 'trial_7day' : 'trial_1day') :
      selectedGroup?.category === 'membership' ?
        (selectedGroup.name.toLowerCase().includes('annual') ? 'paid_annual' : 'paid_monthly') :
      selectedGroup?.category === 'organization' ? 'organization' : 'free';

    setRoleError(null);
    setUpdatingRoleId(userId);
    try {
      // These two documents must change together. An ordinary user can never
      // create or modify adminGrants or assign their own role.
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', userId), {
        groupId: value === 'none' || value === '__admin__' ? null : value,
        role,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      if (shouldGrantAdmin) {
        batch.set(doc(db, 'adminGrants', userId), {
          email: target.email,
          role: 'admin',
          grantedBy: currentUser.uid,
          grantedAt: new Date().toISOString()
        });
      } else {
        batch.delete(doc(db, 'adminGrants', userId));
      }
      await batch.commit();
      setEditingCell(null);
    } catch (error) {
      console.error('Could not change this user role:', error);
      setRoleError('Unable to change the role. Check that Firestore security rules have been deployed.');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleDelete = async () => {
    if (!db || !isAdmin || !deleteId || deleteConfirm !== 'delete') return;
    const target = users.find(u => u.id === deleteId);
    if (deleteId === currentUser?.uid || deleteId === MARCUS_UID ||
      target?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'adminGrants', deleteId));
      batch.delete(doc(db, 'users', deleteId));
      await batch.commit();
      setDeleteId(null);
      setDeleteConfirm('');
    } catch (error) {
      console.error('Could not delete this user profile:', error);
      setRoleError('Could not delete the user profile.');
    }
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
          <p className="text-muted-foreground text-xs font-medium">Coordinate accounts, roles, and administrative access levels.</p>
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

      {roleError && <p role="alert" className="text-xs font-semibold text-rose-600">{roleError}</p>}
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
              const grant = adminGrants.find(g => g.id === u.id && g.role === 'admin' &&
                g.email?.toLowerCase() === u.email?.toLowerCase());
              const selectedGroup = groups.find(g => g.id === u.groupId);
              const roleValue = grant
                ? (selectedGroup?.category === 'admin' ? u.groupId : '__admin__')
                : (selectedGroup?.category === 'admin' ? 'none' : u.groupId || 'none');

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
                          {(isTargetMarcus || !!grant) && <ShieldCheck className="h-3 w-3 text-accent" />}
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
                      <Select
                        disabled={!isAdmin || !!updatingRoleId || isMe}
                        value={roleValue}
                        onValueChange={(val) => void handleUpdate(u.id, 'groupId', val)}
                      >
                        <SelectTrigger className="h-6 w-44 text-[10px] rounded-lg border-none hover:bg-muted/50 font-bold uppercase py-0 px-2">
                          <SelectValue placeholder="No Role Assigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-[10px]">None / Basic Free</SelectItem>
                          {Object.entries(GROUP_TYPE_MAP).map(([typeKey, typeLabel]) => (
                            <SelectGroup key={typeKey}>
                              <SelectLabel className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground bg-muted/30 px-2 py-1 my-1">
                                {typeLabel}
                              </SelectLabel>
                              {typeKey === 'admin' && (
                                <SelectItem value="__admin__" className="text-[10px] font-bold">
                                  Administrator
                                </SelectItem>
                              )}
                              {groupTree[typeKey].map(g => (
                                <SelectItem 
                                  key={g.id} 
                                  value={g.id} 
                                  className="text-[10px] pl-4"
                                >
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: g.depth }).map((_, i) => (
                                      <span key={i} className="w-2" />
                                    ))}
                                    {g.depth > 0 && <ChevronRight className="h-2 w-2 text-muted-foreground" />}
                                    {g.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                      )}
                      {!isMe && !isTargetMarcus && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-50"
                          onClick={() => setDeleteId(u.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => { setDeleteId(null); setDeleteConfirm(''); }}>
        <AlertDialogContent className="rounded-[2.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" /> Confirm User Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2">
              <p>This action will permanently delete this user account. All associated progress, enrollments, and case files will be lost.</p>
              <div className="space-y-2">
                <p className="text-xs font-bold text-foreground uppercase tracking-widest">Type <span className="text-rose-600">delete</span> to proceed:</p>
                <Input 
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="Type delete..."
                  className="rounded-xl border-rose-200"
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleteConfirm !== 'delete'}
              className="rounded-full bg-rose-600 hover:bg-rose-700 font-bold"
            >
              Permanently Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
