"use client"

import { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Printer, Download, FileText, Bot, Sparkles, Scale, Mail, MapPin, User, Tag, Users } from "lucide-react";
import Link from "next/link";

export default function LetterDrafterPage() {
  const [details, setDetails] = useState({
    sender: "Your Full Name",
    recipient: "Recipient / Entity Name",
    address: "Recipient Full Mailing Address",
    subject: "Notice of Demand & Intent to Litigate",
    context: "I am writing regarding the outstanding matter of my security deposit for the property located at..."
  });

  const letterRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24 px-6 pt-12">
      <div className="flex items-center justify-between print:hidden bg-muted/30 p-4 rounded-2xl border-2">
        <Link href="/coach" className="flex items-center text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to AI Coach
        </Link>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-full font-bold uppercase text-[10px] tracking-widest px-6 border-2">
            <Printer className="h-4 w-4 mr-2" /> PDF / Print
          </Button>
          <Button size="sm" className="bg-accent hover:bg-accent/90 rounded-full font-bold uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-accent/20">
            <Download className="h-4 w-4 mr-2" /> Save Workspace
          </Button>
        </div>
      </div>

      <header className="space-y-4 print:hidden">
        <div className="flex items-center gap-6">
          <div className="bg-primary text-white p-4 rounded-[2rem] shadow-xl">
            <Mail className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-primary uppercase">ProSeU Letter Drafter</h1>
            <p className="text-muted-foreground font-medium italic">Generate authoritative, legally-formatted correspondence in seconds.</p>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[450px_1fr] gap-12">
        {/* INPUTS */}
        <div className="space-y-8 print:hidden">
          <Card className="border-4 shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-muted/30 border-b p-8">
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-3">
                <Bot className="h-6 w-6 text-accent" /> Intelligence Controls
              </CardTitle>
              <CardDescription className="text-xs italic">Populate the fields below to sync the professional draft.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                    <User className="h-3 w-3" /> From (Sender)
                  </label>
                  <Input 
                    value={details.sender} 
                    onChange={e => setDetails({...details, sender: e.target.value})} 
                    className="h-12 rounded-xl border-2 focus-visible:ring-accent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                    <Users className="h-3 w-3" /> To (Recipient)
                  </label>
                  <Input 
                    value={details.recipient} 
                    onChange={e => setDetails({...details, recipient: e.target.value})} 
                    className="h-12 rounded-xl border-2 focus-visible:ring-accent"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> Recipient Address
                </label>
                <Input 
                  value={details.address} 
                  onChange={e => setDetails({...details, address: e.target.value})} 
                  className="h-12 rounded-xl border-2 focus-visible:ring-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                  <Tag className="h-3 w-3" /> Subject Line
                </label>
                <Input 
                  value={details.subject} 
                  onChange={e => setDetails({...details, subject: e.target.value})} 
                  className="h-12 rounded-xl border-2 font-bold focus-visible:ring-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                  <FileText className="h-3 w-3" /> Core Narrative
                </label>
                <Textarea 
                  className="min-h-[200px] leading-relaxed rounded-2xl border-2 focus-visible:ring-accent text-sm italic" 
                  value={details.context} 
                  onChange={e => setDetails({...details, context: e.target.value})} 
                />
              </div>
            </CardContent>
            <CardFooter className="bg-accent/5 p-6 border-t">
              <p className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Live Sync Enabled • Professional Template v4.2
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* PREVIEW */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div ref={letterRef} className="bg-white text-black p-16 md:p-24 shadow-2xl rounded-sm border-2 min-h-[900px] font-serif prose prose-slate max-w-none relative">
            {/* Watermark for UI only */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none print:hidden">
              <Scale className="h-96 w-96 -rotate-12" />
            </div>

            <div className="mb-16 relative z-10">
              <div className="flex items-center gap-3 mb-12 opacity-30 grayscale select-none print:hidden border-b pb-4">
                <Scale className="h-8 w-8" />
                <span className="font-bold tracking-tighter text-xl uppercase">ProSeU Legal Registry</span>
              </div>
              <p className="font-bold text-lg mb-1">{details.sender}</p>
              <p className="text-gray-600">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div className="mb-12 relative z-10">
              <p className="font-bold tracking-widest text-xs mb-4 text-gray-500">SENT VIA CERTIFIED MAIL / RETURN RECEIPT REQUESTED</p>
              <p className="font-bold text-lg">TO: {details.recipient}</p>
              <p className="text-gray-700 mt-1 whitespace-pre-wrap">{details.address}</p>
            </div>

            <div className="mb-12 relative z-10 bg-gray-50 p-6 border-l-4 border-black">
              <p className="font-bold underline uppercase tracking-tight text-lg">RE: {details.subject}</p>
            </div>

            <p className="mb-8 font-medium text-lg relative z-10">To {details.recipient},</p>

            <div className="space-y-8 leading-relaxed text-justify text-lg relative z-10">
              <p className="italic text-gray-800">{details.context}</p>
              <p>Please be formally advised that this correspondence serves as a final notice regarding the aforementioned dispute. I am requesting a definitive response or full resolution within ten (10) business days from the documented date of receipt.</p>
              <p>Failure to provide a satisfactory response or initiate a good-faith resolution within the prescribed timeframe may result in further legal proceedings to protect my rights. This may include, but is not limited to, the filing of a formal complaint in the appropriate court of jurisdiction, seeking all available legal and equitable remedies.</p>
            </div>

            <div className="mt-20 relative z-10">
              <p className="text-lg">Respectfully submitted,</p>
              <div className="mt-12 h-px w-64 bg-black/30" />
              <p className="font-bold text-xl mt-4 uppercase tracking-tighter">{details.sender}</p>
              <p className="text-xs font-bold text-gray-400 mt-1">PRO SE LITIGANT</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
