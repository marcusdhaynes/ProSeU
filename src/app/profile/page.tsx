
'use client';

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  UserCircle, 
  Settings, 
  LogOut, 
  Trophy, 
  Flame, 
  BookOpen, 
  FileText, 
  CreditCard,
  ChevronRight,
  Clock,
  Zap,
  Database,
  AtSign
} from "lucide-react";
import { 
  useAuth, 
  useUser, 
  useFirestore, 
  useDoc, 
  useCollection, 
  useMemoFirebase,
  setDocumentNonBlocking 
} from "@/firebase";
import { initiateSignOut } from "@/firebase/non-blocking-login";
import { doc, collection } from "firebase/firestore";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  // Fetch user profile
  const userRef = useMemoFirebase(() => 
    user && !user.isAnonymous ? doc(db, 'users', user.uid) : null, 
    [db, user]
  );
  const { data: userDoc, isLoading: isUserDocLoading } = useDoc(userRef);
  
  // Consistently grant admin access to authenticated users in prototype
  const isAdmin = user && !user.isAnonymous;

  // Ensure user document exists (Safe provision for legacy users or those missing fields)
  useEffect(() => {
    if (db && user && !userDoc && !isUserDocLoading && !user.isAnonymous) {
      setDocumentNonBlocking(doc(db, 'users', user.uid), {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: 'free',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  }, [user, userDoc, isUserDocLoading, db]);

  // Fetch user-owned data
  const enrollQ = useMemoFirebase(() => user ? collection(db, 'users', user.uid, 'enrollments') : null, [db, user]);
  const { data: enrollments } = useCollection(enrollQ);

  const casesQ = useMemoFirebase(() => user ? collection(db, 'users', user.uid, 'caseFiles') : null, [db, user]);
  const { data: cases } = useCollection(casesQ);

  const progressQ = useMemoFirebase(() => user ? collection(db, 'users', user.uid, 'progress') : null, [db, user]);
  const { data: progress } = useCollection(progressQ);

  if (isUserLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse">Synchronizing profile data...</p>
      </div>
    );
  }

  if (!user || user.isAnonymous) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-6 text-center">
        <div className="bg-muted p-6 rounded-full">
          <UserCircle className="h-16 w-16 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-primary tracking-tight">Access Restricted</h1>
          <p className="text-muted-foreground max-w-sm">Please log in to your ProSeU account to view your dashboard.</p>
        </div>
        <Button className="rounded-full px-8 font-bold shadow-lg bg-accent hover:bg-accent/90" asChild>
          <Link href="/login">Return to Login</Link>
        </Button>
      </div>
    );
  }

  const handleSignOut = () => {
    if (auth) {
      initiateSignOut(auth);
      router.push("/");
    }
  };

  const completedModules = progress?.filter(p => p.isCompleted).length || 0;
  const activeEnrollments = enrollments?.filter(e => e.status === 'Enrolled').length || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <header className="relative bg-[#2c426b] rounded-[2.5rem] p-8 md:p-12 text-white overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(77,157,224,0.15),transparent_50%)]" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="h-24 w-24 rounded-[2rem] bg-accent flex items-center justify-center border-4 border-[#2c426b] shadow-xl group-hover:scale-105 transition-transform">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="h-full w-full rounded-[2rem] object-cover" />
              ) : (
                <UserCircle className="h-12 w-12 text-[#2c426b]" />
              )}
            </div>
            {isAdmin && (
              <Badge className="absolute -bottom-2 -right-2 bg-emerald-500 text-white border-2 border-[#2c426b] text-[8px] font-bold px-2 py-0.5 rounded-full">
                {userDoc?.role === 'executive' ? 'EXEC' : 'ADMIN'}
              </Badge>
            )}
          </div>
          
          <div className="text-center md:text-left flex-1 space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{user.displayName || userDoc?.firstName ? `${userDoc?.firstName} ${userDoc?.lastName || ''}` : "Law Student"}</h1>
            <div className="flex flex-col gap-1">
              <p className="text-blue-100/70 font-medium text-sm">{user.email}</p>
              {userDoc?.username && (
                <div className="inline-flex items-center gap-1.5 text-accent font-bold text-sm">
                  <AtSign className="h-3 w-3" />
                  {userDoc.username}
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/20 text-xs font-bold">
                <Flame className="h-4 w-4 text-orange-400 fill-orange-400" />
                7 Day Streak
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/20 text-xs font-bold">
                <Trophy className="h-4 w-4 text-amber-400 fill-amber-400" />
                1,240 XP
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {isAdmin && (
              <Button onClick={() => router.push('/admin')} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 shadow-lg border-none">
                <Database className="h-4 w-4 mr-2" />
                Admin Console
              </Button>
            )}
            <Button variant="outline" className="rounded-xl border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold h-11 px-6 shadow-none">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button onClick={handleSignOut} className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold h-11 px-6 shadow-lg border-none">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
              <BookOpen className="h-5 w-5 text-accent" />
              Curriculum Progress
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-[2rem] border-2 border-primary/10 shadow-sm hover:shadow-md transition-all bg-card/50 backdrop-blur-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Modules Completed</p>
                    <Badge variant="outline" className="text-accent border-accent/20 bg-accent/5">{completedModules}</Badge>
                  </div>
                  <CardTitle className="text-xl font-bold">Academy Level 4</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={45} className="h-2" />
                  <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                    You've mastered <span className="font-bold text-foreground">45%</span> of your current certification track.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-2 border-primary/10 shadow-sm hover:shadow-md transition-all bg-card/50 backdrop-blur-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Active Courses</p>
                    <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">{activeEnrollments}</Badge>
                  </div>
                  <CardTitle className="text-xl font-bold">In-Training</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="ghost" size="sm" className="w-full text-[10px] font-bold uppercase tracking-widest text-accent hover:text-accent hover:bg-accent/5 p-0" asChild>
                    <Link href="/learn">Resume Studies <ChevronRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
              <FileText className="h-5 w-5 text-accent" />
              Active Case Drafts
            </h2>
            <div className="space-y-3">
              {cases && cases.length > 0 ? (
                cases.map(c => (
                  <Card key={c.id} className="rounded-2xl border bg-card/50 backdrop-blur-md hover:border-accent transition-all group overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-muted p-2.5 rounded-xl group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{c.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[8px] font-bold uppercase px-1.5 h-4 bg-muted/50">{c.status}</Badge>
                            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" /> Updated {new Date(c.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="rounded-lg h-9 w-9 p-0 hover:bg-accent hover:text-white">
                        <Link href="/prepare"><ChevronRight className="h-5 w-5" /></Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="p-12 text-center border-2 border-dashed rounded-[2rem] space-y-4">
                  <p className="text-muted-foreground text-sm">No active case files found. Start building your first legal file today.</p>
                  <Button variant="outline" className="rounded-full font-bold border-2" asChild>
                    <Link href="/prepare">Create Case File</Link>
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-2 border-accent shadow-xl overflow-hidden bg-[#cc9a43]/5">
            <CardHeader className="bg-[#cc9a43] text-white p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Subscription
                </CardTitle>
                <Badge className="bg-white/20 text-white border-none text-[9px]">ACTIVE</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-primary">ProSe Premier</h3>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Next Billing: July 1, 2024</p>
              </div>
              <div className="space-y-2">
                {[
                  "Unlimited AI Analysis",
                  "Digital Case Storage",
                  "Certification Path Access"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-foreground/70">
                    <AtSign className="h-3 w-3 text-[#cc9a43]" />
                    {feature}
                  </div>
                ))}
              </div>
              <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 font-bold text-[10px] h-10 uppercase tracking-widest mt-2">
                Manage Billing
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
