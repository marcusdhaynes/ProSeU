"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shirt, 
  HandHelping, 
  Scale, 
  Download,
  Users,
  Building2,
  ChevronRight,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { EditableContent } from "@/components/editable-content";

const RESOURCE_CATEGORIES = [
  {
    id: "etiquette",
    title: "Courtroom Etiquette",
    description: "The unwritten rules of behavior, speech, and timing in court.",
    icon: Scale,
    links: ["Standing when the judge enters", "Addressing opposing counsel", "Procedures for submitting evidence"]
  },
  {
    id: "attire",
    title: "Attire & Presentation",
    description: "Dress for success. Attire guides and local assistance programs.",
    icon: Shirt,
    links: ["Professional dress standards", "Clothing grants & thrift stores", "Grooming & personal presentation"]
  },
  {
    id: "clinics",
    title: "Legal Aid & Clinics",
    description: "Find pro bono legal support and free clinics near you.",
    icon: HandHelping,
    links: ["Local Pro Bono clinics", "Legal Aid directory", "Student law clinics"]
  },
  {
    id: "funding",
    title: "Funding & Logistics",
    description: "Assistance with filing fees, transportation, and childcare.",
    icon: Building2,
    links: ["Fee waiver applications", "Transport vouchers", "Low-cost legal research"]
  }
];

export default function ResourcesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-6 pt-8">
      <header className="space-y-2">
        <EditableContent 
          tag="h1"
          contentKey="resources_title"
          content="Practical Resources"
          className="text-4xl font-bold tracking-tight text-primary uppercase"
        />
        <EditableContent 
          tag="p"
          contentKey="resources_desc"
          content="Actionable support for every aspect of the legal process, from professional attire to filing fee assistance."
          className="text-muted-foreground font-medium italic"
        />
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {RESOURCE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card key={cat.id} className="proseu-card border-2 bg-card/50 backdrop-blur-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="bg-accent/10 text-accent p-3 rounded-2xl shadow-sm">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <EditableContent 
                    tag="h3"
                    contentKey={`${cat.id}_title`}
                    content={cat.title}
                    className="text-xl font-bold uppercase tracking-tight"
                  />
                  <EditableContent 
                    tag="p"
                    contentKey={`${cat.id}_desc`}
                    content={cat.description}
                    className="text-muted-foreground text-xs italic"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-1 px-6 pb-6">
                {cat.links.map((link, idx) => (
                  <Button key={idx} variant="ghost" className="w-full justify-between text-xs h-auto py-3 font-bold uppercase tracking-widest hover:bg-accent/5 hover:text-accent group rounded-xl">
                    <EditableContent contentKey={`${cat.id}_link_${idx}`} content={link} />
                    <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-accent transition-transform group-hover:translate-x-1" />
                  </Button>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 rounded-full bg-accent" />
          <h2 className="text-2xl font-bold tracking-tight uppercase">
            <EditableContent contentKey="templates_section_title" content="Document Templates" />
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            "Motion to Compel",
            "Notice of Appearance",
            "Subpoena Duces Tecum",
            "Witness Testimony Script",
            "Closing Statement Draft",
            "Financial Affidavit",
            "Proof of Service",
            "Motion for Continuance"
          ].map((doc, idx) => (
            <div key={idx} className="bg-muted/30 p-5 rounded-2xl flex items-center justify-between border-2 border-transparent hover:border-accent hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group shadow-sm">
              <EditableContent 
                tag="span"
                contentKey={`template_${idx}`}
                content={doc}
                className="text-[10px] font-black uppercase tracking-wider"
              />
              <Download className="h-4 w-4 text-muted-foreground group-hover:text-accent" />
            </div>
          ))}
        </div>
      </section>

      <Card className="bg-[#020617] text-white rounded-[3rem] overflow-hidden border-none shadow-2xl relative">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Users className="h-40 w-40" />
        </div>
        <CardContent className="p-10 md:p-16 flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="space-y-6 flex-1 text-center md:text-left">
            <EditableContent 
              tag="h2"
              contentKey="human_expert_title"
              content="Need a human expert?"
              className="text-4xl font-bold tracking-tight uppercase"
            />
            <EditableContent 
              tag="p"
              multiline
              contentKey="human_expert_desc"
              content="While ProSeU provides powerful AI-driven tools, some complex cases require professional legal review. Browse our directory of unbundled legal services and local pro bono attorneys."
              className="text-blue-100/60 leading-relaxed italic text-sm"
            />
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-white rounded-full px-10 h-14 font-bold shadow-xl shadow-accent/20">
              <EditableContent contentKey="find_help_btn" content="Find Legal Help Near You" />
            </Button>
          </div>
          <div className="flex -space-x-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 w-20 rounded-[2rem] border-4 border-[#020617] bg-slate-800 flex items-center justify-center shadow-2xl">
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
