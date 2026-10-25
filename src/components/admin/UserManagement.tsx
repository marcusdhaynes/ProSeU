'use client';

import React, { useMemo, useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { CheckCircle2, Loader2, Pencil, Search, ShieldCheck, XCircle } from 'lucide-react';
import {
  collection, doc, getDocFromServer, getDocs, limit, query, runTransaction, where
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';
import { PRIMARY_ADMIN_EMAIL } from '@/lib/admin-access';

interface UserRecord {
  id: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  role?: string | null;
  groupId?: string | null;
  updatedAt?: unknown;
}
interface GroupRecord {
  id: string;
  name: string;
  category: string;
}
interface UserManagementProps {
  users: UserRecord[];
  groups: GroupRecord[];
  currentUser: { uid: string; email: string | null; emailVerified?: boolean } | null;
  isAdmin: boolean;
}
type EditableField = 'username' | 'firstName' | 'lastName' | 'displayName' | 'phone' | 'contactEmail';
type Draft = Record<EditableField, string> & { role: string };
type Notice = { type: 'success' | 'error'; message: string } | null;

const OWNER_UID = 'M4aAAH071gevhmRgZ1diT857i5U2';
const PLAN_ROLES = [
  { value: 'free', label: 'Basic Free' },
  { value: 'trial_1day', label: '1-Day Trial' },
  { value: 'trial_7day', label: '7-Day Trial' },
  { value: 'paid_monthly', label: 'Monthly Member' },
  { value: 'paid_annual', label: 'Annual Member' },
  { value: 'organization', label: 'Organization' }
];

function isOwnerRow(user: UserRecord, currentUser: UserManagementProps['currentUser']) {
  // Display identity must not be established using an editable profile email.
  return user.id === OWNER_UID || (
    user.id === currentUser?.uid &&
    currentUser.emailVerified === true &&
    currentUser.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL
  );
}

function draftFrom(user: UserRecord): Draft {
  return {
    username: String(user.username || '').replace(/^@/, '').trim(),
    firstName: String(user.firstName || '').trim(),
    lastName: String(user.lastName || '').trim(),
    displayName: String(user.displayName || '').trim(),
    phone: String(user.phone || '').trim(),
    contactEmail: String(user.contactEmail || user.email || '').trim(),
    role: String(user.role || 'free'),
  };
}

function timestampValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toMillis' in value &&
      typeof value.toMillis === 'function') return String(value.toMillis());
  return value == null ? '' : String(value);
}

function phoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && !phone.startsWith('+')) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  return phone;
}

function validateDraft(draft: Draft): string | null {
  const username = draft.username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return 'Username must be 3–30 characters using lowercase letters, numbers, or underscores.';
  }
  for (const [value, label] of [
    [draft.displayName, 'Display name'], [draft.firstName, 'Forename'], [draft.lastName, 'Surname']
  ]) {
    if (value.trim().length > 80) return `${label} must be 80 characters or fewer.`;
  }
  if (draft.phone.trim()) {
    const digits = draft.phone.replace(/\D/g, '');
    if (!/^[+()\d\s.\-]+$/.test(draft.phone) || digits.length < 7 || digits.length > 15) {
      return 'Enter a valid telephone number containing 7–15 digits, or leave it empty.';
    }
  }
  if (draft.contactEmail && (draft.contactEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail))) {
    return 'Enter a valid contact email address, or leave it empty.';
  }
  return null;
}

export function UserManagement({ users, groups, currentUser, isAdmin }: UserManagementProps) {
  const db = useFirestore();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [original, setOriginal] = useState<UserRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...users]
      .filter(u => !term || [
        u.displayName, u.username, u.firstName, u.lastName, u.email,
        u.contactEmail, u.phone, u.role
      ].some(value => String(value || '').toLowerCase().includes(term)))
      .sort((a, b) => {
        if (a.id === currentUser?.uid) return -1;
        if (b.id === currentUser?.uid) return 1;
        return a.displayName?.localeCompare(b.displayName || '') || 0;
      });
  }, [users, search, currentUser?.uid]);

  const beginEdit = (user: UserRecord) => {
    if (!isAdmin || saving) return;
    setEditingId(user.id);
    setOriginal({ ...user });
    setDraft(draftFrom(user));
    setEditorError(null);
    setNotice(null);
  };

  const endEdit = () => {
    if (saving) return;
    setEditingId(null);
    setOriginal(null);
    setDraft(null);
    setEditorError(null);
  };

  const setField = (field: keyof Draft, value: string) => {
    setDraft(old => old ? { ...old, [field]: value } : old);
    setEditorError(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!db || !isAdmin || !currentUser || !original || !draft || saving) return;

    const normalized: Draft = {
      ...draft,
      username: draft.username.replace(/^@/, '').trim().toLowerCase(),
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      displayName: draft.displayName.trim() ||
        [draft.firstName.trim(), draft.lastName.trim()].filter(Boolean).join(' '),
      phone: draft.phone.trim(),
      contactEmail: draft.contactEmail.trim().toLowerCase(),
    };
    const validation = validateDraft(normalized);
    if (validation) { setEditorError(validation); return; }
    const owner = isOwnerRow(original, currentUser);
    const oldDraft = draftFrom(original);
    const patch: Record<string, unknown> = {};

    const fields: EditableField[] = ['username', 'firstName', 'lastName', 'displayName', 'phone', 'contactEmail'];
    for (const field of fields) {
      // Do not replace the authentication email. An editable contact email is
      // explicitly separate from the provider-verified login identity.
      if (normalized[field] !== (field === 'username' || field === 'contactEmail' ? oldDraft[field].toLowerCase() : oldDraft[field])) {
        patch[field] = normalized[field] || null;
      }
    }

    if (!owner && normalized.role !== oldDraft.role) {
      if (!PLAN_ROLES.some(option => option.value === normalized.role)) {
        setEditorError('Administrative privileges must be assigned via verified Supabase Auth after migration.');
        return;
      }
      patch.role = normalized.role;
      patch.groupId = null; // Avoid a stale group assigning a conflicting plan.
    }

    if (!Object.keys(patch).length) {
      endEdit();
      return;
    }

    setSaving(true);
    setEditorError(null);
    try {
      // Legacy usernames were not reserved in a separate unique index.
      // Check existing Firestore usernames before writing; Supabase's new
      // canonical profile table has a database-level unique constraint.
      if ('username' in patch) {
        const exact = await getDocs(query(collection(db, 'users'),
          where('username', '==', normalized.username), limit(5)));
        if (exact.docs.some(existing => existing.id !== original.id) ||
            users.some(existing => existing.id !== original.id &&
              existing.username?.toLowerCase() === normalized.username)) {
          throw new Error('This username is already in use.');
        }
      }

      const ref = doc(db, 'users', original.id);
      const changes = {
        ...patch,
        updatedAt: new Date().toISOString(),
        updatedByUid: currentUser.uid,
      };
      await runTransaction(db, async transaction => {
        const server = await transaction.get(ref);
        if (!server.exists()) throw new Error('This account no longer exists.');
        const actual = server.data();
        if (timestampValue(actual.updatedAt) !== timestampValue(original.updatedAt)) {
          throw new Error('This record changed while you were editing. Close and reopen it to avoid overwriting newer information.');
        }
        transaction.update(ref, changes);
      });

      // Read back from the server rather than announcing success on an
      // optimistic Firestore cache update or fire-and-forget promise.
      const persisted = await getDocFromServer(ref);
      if (!persisted.exists() || Object.entries(patch).some(([key, value]) =>
        (persisted.data()[key] ?? null) !== (value ?? null))) {
        throw new Error('The write completed, but its saved values could not be confirmed. Close and reopen the record before making another change.');
      }

      setEditingId(null);
      setOriginal(null);
      setDraft(null);
      setNotice({ type: 'success', message: `Changes to ${normalized.displayName || normalized.username} were saved and verified in the live database.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save this user.';
      setEditorError(message);
      setNotice({ type: 'error', message: `Save failed: ${message}` });
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = editingId && original?.id === editingId ? original : null;
  const selectedOwner = !!selectedUser && isOwnerRow(selectedUser, currentUser);
  const selectedRole = draft && PLAN_ROLES.some(option => option.value === draft.role)
    ? draft.role : '__legacy__';

  const field = (key: EditableField, label: string, placeholder: string, inputType: string = 'text') => (
    <div className="space-y-1.5">
      <Label htmlFor={`user-edit-${key}`} className="text-xs font-semibold">{label}</Label>
      <Input
        id={`user-edit-${key}`} type={inputType}
        autoComplete="off" value={draft?.[key] || ''}
        onChange={e => setField(key, e.target.value)}
        placeholder={placeholder} disabled={saving}
        className="h-10 rounded-lg"
        maxLength={key === 'contactEmail' ? 254 : key === 'username' ? 30 : 100}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">User Directory</h2>
          <p className="text-xs text-muted-foreground">
            Edit user profiles with validation, conflict protection, and a verified save.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search users"
            placeholder="Find a user..."
            className="h-10 rounded-xl pl-10"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {notice && (
        <div role="status" className={cn(
          'flex items-start gap-2 rounded-lg border p-3 text-xs',
          notice.type === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
            : 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300'
        )}>
          {notice.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> :
            <XCircle className="h-4 w-4 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              {['USER', 'USERNAME', 'FORENAME', 'SURNAME', 'EMAIL', 'PHONE', 'ROLE', ''].map(head => (
                <TableHead key={head || 'actions'} className="h-9 whitespace-nowrap px-3 text-[10px] font-bold tracking-wider">
                  {head || <span className="sr-only">Actions</span>}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map(user => {
              const owner = isOwnerRow(user, currentUser);
              const role = owner ? 'Administrator (Owner)' :
                (groups.find(g => g.id === user.groupId)?.name ||
                  PLAN_ROLES.find(item => item.value === user.role)?.label ||
                  (user.role === 'admin' ? 'Legacy Admin (inactive)' : user.role || 'Basic Free'));
              return (
                <TableRow key={user.id} className={cn('group text-xs', user.id === currentUser?.uid && 'bg-accent/5')}>
                  <TableCell className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-bold">
                        {(user.displayName || user.firstName || user.email || '?').slice(0,1).toUpperCase()}
                      </span>
                      <span className="flex max-w-[160px] items-center gap-1 truncate font-semibold" title={user.displayName || ''}>
                        {user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed user'}
                        {owner && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[165px] truncate px-3 py-2 font-semibold text-accent" title={user.username || ''}>
                    {user.username ? `@${user.username}` : '—'}
                  </TableCell>
                  <TableCell className="px-3 py-2">{user.firstName || '—'}</TableCell>
                  <TableCell className="px-3 py-2">{user.lastName || '—'}</TableCell>
                  <TableCell className="max-w-[190px] truncate px-3 py-2" title={user.contactEmail || user.email || ''}>
                    {user.contactEmail || user.email || '—'}
                    {user.contactEmail && user.contactEmail !== user.email &&
                      <span className="block text-[9px] text-muted-foreground">Contact email</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-2">{user.phone ? phoneDisplay(user.phone) : '—'}</TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-2">
                    {owner
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3" />{role}
                        </span>
                      : <span className="text-[11px] font-medium">{role}</span>}
                  </TableCell>
                  <TableCell className="py-2 pl-1 pr-3 text-right">
                    <Button
                      type="button" size="sm" variant="outline"
                      className="h-7 gap-1.5 rounded-lg px-2 text-[10px]"
                      onClick={() => beginEdit(user)}
                      disabled={!isAdmin}
                      aria-label={`Edit ${user.displayName || user.username || user.email || 'user'}`}
                    ><Pencil className="h-3 w-3" /> Edit</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={open => { if (!open) endEdit(); }}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Pencil className="h-4 w-4 text-accent" /> Edit User
            </DialogTitle>
            <DialogDescription>
              Changes are saved only after the database confirms the write.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && draft && (
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {field('displayName', 'Display name', 'Name shown on ProSeU')}
                {field('username', 'Username', 'username')}
                {field('firstName', 'Forename', 'First name')}
                {field('lastName', 'Surname', 'Last name')}
                {field('phone', 'Phone', '+1 555 123 4567', 'tel')}
                {field('contactEmail', 'Contact email', 'name@example.com', 'email')}
              </div>
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold">Sign-in email (identity provider)</p>
                <p className="break-all text-sm">{selectedUser.email || 'Unavailable'}</p>
                <p className="text-[11px] text-muted-foreground">
                  This is the account email recorded by Firebase. Editing the contact email above
                  does not change or compromise sign-in. Changing a login email requires provider verification.
                </p>
              </div>

              {selectedOwner ? (
                <div className="space-y-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="flex items-center gap-2 text-xs font-semibold">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Administrator (Owner)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    The primary administrator role is protected and cannot be accidentally removed.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Membership / account role</Label>
                  <Select value={selectedRole} disabled={saving}
                    onValueChange={value => setField('role', value)}>
                    <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {selectedRole === '__legacy__' && (
                        <SelectItem value="__legacy__" disabled>Legacy role (choose a new plan)</SelectItem>
                      )}
                      {PLAN_ROLES.map(item => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Changing a membership role unassigns its old group. Administrator access is not
                    assigned here; verified Supabase administrator grants are separate.
                  </p>
                </div>
              )}

              {editorError && (
                <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-600">
                  {editorError}
                </p>
              )}
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" disabled={saving} onClick={endEdit}>Cancel</Button>
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> :
                    <CheckCircle2 className="h-4 w-4" />}
                  {saving ? 'Saving & verifying...' : 'Save changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
