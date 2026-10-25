'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useDoc, useUser, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { GroupManager } from '@/components/admin/GroupManager';
import { UserManagement } from '@/components/admin/UserManagement';
import { CurriculumManager } from '@/components/admin/CurriculumManager';
import { UserConceptsTable } from '@/components/admin/UserConceptsTable';
import { UniversitasHierarchyTable } from '@/components/admin/UniversitasHierarchyTable';
import { TemplateManager } from '@/components/admin/TemplateManager';
import { 
  ShieldAlert, 
  Database, 
  Users as UsersIcon, 
  FolderTree, 
  LayoutGrid, 
  GraduationCap,
  LayoutTemplate,
  LineChart
} from 'lucide-react';
import { useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';
import { isProSeUAdmin, PRIMARY_ADMIN_EMAIL } from '@/lib/admin-access';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userRef = useMemoFirebase(() => 
    db && user ? doc(db, 'users', user.uid) : null, 
    [db, user]
  );
  
  const { data: userDoc, isLoading: isUserDocLoading } = useDoc(userRef);

  // Only the verified Firebase account for the authorized owner can use admin functions.
  // Profile roles are not proof of permission because users can edit profile data.
  const isVerifiedAdmin = isProSeUAdmin(user);

  const usersQ = useMemoFirebase(() => (db && isVerifiedAdmin) ? collection(db, 'users') : null, [db, isVerifiedAdmin]);
  const groupsQ = useMemoFirebase(() => (db && isVerifiedAdmin) ? collection(db, 'groups') : null, [db, isVerifiedAdmin]);
  const conceptsQ = useMemoFirebase(() => (db && isVerifiedAdmin) ? collection(db, 'atomic_concepts') : null, [db, isVerifiedAdmin]);
  
  const domainsQ = useMemoFirebase(() => (db && isVerifiedAdmin) ? collection(db, 'domains') : null, [db, isVerifiedAdmin]);
  const fieldsQ = useMemoFirebase(() => (db && isVerifiedAdmin) ? collection(db, 'fields') : null, [db, isVerifiedAdmin]);
  const coursesQ = useMemoFirebase(() => (db && isVerifiedAdmin) ? collection(db, 'courses') : null, [db, isVerifiedAdmin]);

  const { data: allUsersRaw } = useCollection(usersQ);
  const { data: groupsRaw } = useCollection(groupsQ);
  const { data: conceptsRaw, isLoading: isConceptsLoading } = useCollection(conceptsQ);
  const { data: domainsRaw } = useCollection(domainsQ);
  const { data: fieldsRaw } = useCollection(fieldsQ);
  const { data: coursesRaw } = useCollection(coursesQ);

  // Provision or repair the owner's profile after verified sign-in. Never elevate
  // an unverified email or another user's profile on an admin-page visit.
  useEffect(() => {
    if (!db || !user || !isVerifiedAdmin || isUserDocLoading) return;
    if (userDoc?.role === 'admin' && userDoc?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL) return;

    setDoc(doc(db, 'users', user.uid), {
      id: user.uid,
      email: PRIMARY_ADMIN_EMAIL,
      displayName: user.displayName || 'Marcus Haynes',
      role: 'admin',
      promotedAt: new Date().toISOString()
    }, { merge: true }).catch((error) => {
      console.error('Could not provision verified owner administrator profile:', error);
    });
  }, [db, user, isVerifiedAdmin, userDoc, isUserDocLoading]);

    const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !mounted || isUserLoading || isUserDocLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse font-bold uppercase tracking-widest text-[10px]">Verifying Administrative Credentials...</p>
      </div>
    );
  }

  if (!isVerifiedAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center px-4">
        <div className="bg-rose-500/10 p-6 rounded-full">
          <ShieldAlert className="h-16 w-16 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Access Restricted</h1>
          <p className="text-muted-foreground max-w-sm">Administrator access requires the verified marcusdhaynes@gmail.com account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6 text-accent" /> ProSeU Admin Console
          </h1>
          <p className="text-muted-foreground text-sm">Manage users, learning structures, and knowledge units.</p>
        </div>
      </header>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="users" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><UsersIcon className="h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="groups" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><FolderTree className="h-4 w-4" /> Roles</TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><LayoutGrid className="h-4 w-4" /> Domains</TabsTrigger>
          <TabsTrigger value="user_concepts" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><LineChart className="h-4 w-4" /> User Concepts</TabsTrigger>
          <TabsTrigger value="universitas" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><GraduationCap className="h-4 w-4" /> Atomic Concepts</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><LayoutTemplate className="h-4 w-4" /> Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement 
            users={allUsersRaw || []} 
            groups={groupsRaw || []} 
            currentUser={user}
            currentUserDoc={userDoc}
          />
        </TabsContent>

        <TabsContent value="groups">
          <GroupManager db={db!} />
        </TabsContent>

        <TabsContent value="knowledge">
          <CurriculumManager db={db!} />
        </TabsContent>

        <TabsContent value="user_concepts">
          <UserConceptsTable 
            db={db!} 
            users={allUsersRaw || []} 
            concepts={conceptsRaw || []} 
          />
        </TabsContent>

        <TabsContent value="universitas" className="space-y-10">
          {isConceptsLoading ? (
            <div className="p-20 text-center text-muted-foreground italic animate-pulse">
              Synchronizing Knowledge Base...
            </div>
          ) : (
            <UniversitasHierarchyTable 
              db={db!} 
              domains={domainsRaw || []}
              fields={fieldsRaw || []}
              courses={coursesRaw || []}
              concepts={conceptsRaw || []} 
              title="Atomic Concepts"
              description="Knowledge units used by the content engine for dynamic pedagogical generation."
            />
          )}
        </TabsContent>

        <TabsContent value="templates">
          <TemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
