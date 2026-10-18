
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { initiateEmailSignIn, initiateGoogleSignIn } from "@/firebase/non-blocking-login";
import { Scale, Mail, Lock, UserPlus, LogIn, Chrome, AlertCircle, Copy, HelpCircle, User as UserIcon, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsUsernameChecking] = useState(false);
  
  const [rememberMe, setRememberMe] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDomain, setCurrentDomain] = useState("");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setCurrentDomain(window.location.hostname);
    }
  }, []);

  useEffect(() => {
    if (user && !user.isAnonymous) {
      router.push("/profile");
    }
  }, [user, router]);

  // Real-time username availability check
  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username.length < 3) {
        setIsUsernameAvailable(null);
        return;
      }
      setIsUsernameChecking(true);
      try {
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase().trim()));
        const snap = await getDocs(q);
        setIsUsernameAvailable(snap.empty);
      } catch (err) {
        console.error("Error checking username", err);
      } finally {
        setIsUsernameChecking(false);
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [username, db]);

  if (!mounted) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4 bg-background/50">
        <div className="w-full max-w-md space-y-8 animate-pulse">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 bg-muted rounded-2xl mx-auto mb-4" />
            <div className="h-8 bg-muted w-32 mx-auto rounded-lg" />
            <div className="h-4 bg-muted w-48 mx-auto rounded-lg" />
          </div>
          <Card className="h-[500px] border shadow-2xl bg-card/80 backdrop-blur-md rounded-3xl overflow-hidden" />
        </div>
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setError(null);
    setIsLoading(true);
    try {
      initiateEmailSignIn(auth, email, password);
    } catch (err: any) {
      console.error("Sign in error", err);
      const message = err.code === 'auth/invalid-credential' 
        ? "Invalid email or password. Please check your credentials."
        : err.message || "An error occurred during sign in.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: message,
      });
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || isUsernameAvailable === false) return;
    
    setError(null);
    setIsLoading(true);
    
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // 2. Immediately create User Document with Username
      await setDoc(doc(db, 'users', newUser.uid), {
        id: newUser.uid,
        email: newUser.email,
        username: username.toLowerCase().trim(),
        role: 'free',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast({
        title: "Welcome to ProSeU!",
        description: `Your account @${username} has been created.`,
      });
      
      router.push("/profile");
    } catch (err: any) {
      console.error("Sign up error", err);
      const message = err.message || "An error occurred during sign up.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: message,
      });
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (auth) {
      try {
        setIsLoading(true);
        setError(null);
        initiateGoogleSignIn(auth);
      } catch (err: any) {
        console.error("Login page Google auth failed", err);
        const message = err.message || "Could not initiate Google sign in.";
        setError(message);
        toast({
          variant: "destructive",
          title: "Google Sign In Failed",
          description: message,
        });
        setIsLoading(false);
      }
    }
  };

  const copyDomain = () => {
    navigator.clipboard.writeText(currentDomain);
    toast({
      title: "Domain Copied",
      description: "You can now paste this into the Firebase Console.",
    });
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4 bg-background/50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary text-primary-foreground shadow-xl mb-4">
            <Scale className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">ProSe<span className="text-accent">U</span></h1>
          <p className="text-muted-foreground text-sm font-medium">Your gateway to legal mastery.</p>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-2xl border-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sign-in Issue</AlertTitle>
            <AlertDescription>
              <p>{error}</p>
            </AlertDescription>
          </Alert>
        )}

        <Card className="border shadow-2xl bg-card/80 backdrop-blur-md rounded-3xl overflow-hidden">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none h-14 bg-muted/30">
              <TabsTrigger value="login" className="data-[state=active]:bg-background data-[state=active]:text-primary font-bold uppercase tracking-widest text-[10px]">
                Log In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-background data-[state=active]:text-primary font-bold uppercase tracking-widest text-[10px]">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="p-8 space-y-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest opacity-70">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@example.com" 
                      className="pl-10 h-12 rounded-xl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest opacity-70">Password</Label>
                    <button type="button" className="text-[10px] font-bold text-accent hover:underline uppercase tracking-widest">Forgot?</button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
                    <Input 
                      id="password" 
                      type="password" 
                      className="pl-10 h-12 rounded-xl"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe} 
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="remember" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer">Remember me</Label>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl font-bold gap-2 bg-primary hover:bg-primary/90" disabled={isLoading}>
                  {isLoading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn className="h-4 w-4" />}
                  SIGN IN
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl font-bold gap-3 border-2 hover:bg-muted"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Chrome className="h-5 w-5 text-red-500" />
                Google Account
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="p-8 space-y-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-xs font-bold uppercase tracking-widest opacity-70">Choose Username</Label>
                  <div className="relative group">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
                    <Input 
                      id="signup-username" 
                      type="text" 
                      placeholder="legal_master" 
                      className="pl-10 h-12 rounded-xl"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      required
                      disabled={isLoading}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                      {isCheckingUsername ? (
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : isUsernameAvailable === true ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : isUsernameAvailable === false ? (
                        <X className="h-4 w-4 text-rose-500" />
                      ) : null}
                    </div>
                  </div>
                  {isUsernameAvailable === false && (
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest pl-1">This username is already taken.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-xs font-bold uppercase tracking-widest opacity-70">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="name@example.com" 
                      className="pl-10 h-12 rounded-xl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-xs font-bold uppercase tracking-widest opacity-70">Create Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
                    <Input 
                      id="signup-password" 
                      type="password" 
                      className="pl-10 h-12 rounded-xl"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl font-bold gap-2 bg-accent text-accent-foreground hover:bg-accent/90" 
                  disabled={isLoading || isUsernameAvailable !== true}
                >
                  {isLoading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  CREATE ACCOUNT
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="bg-card px-3 text-muted-foreground">Or join with</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl font-bold gap-3 border-2 hover:bg-muted"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Chrome className="h-5 w-5 text-red-500" />
                Google Account
              </Button>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
