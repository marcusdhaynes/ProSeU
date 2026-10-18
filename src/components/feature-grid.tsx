import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BookOpen, FolderOpen, Scale, Search, Library, Users } from "lucide-react";

const features = [
  {
    title: "Learning Modules",
    description: "Access structured micro-lessons and interactive courses on legal topics.",
    icon: BookOpen,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Case File Builder",
    description: "Systematically organize facts, identify parties, and track deadlines.",
    icon: FolderOpen,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    title: "Reference Library",
    description: "Browse comprehensive catalog of laws, regulations, and study modules.",
    icon: Library,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "Public Case Search",
    description: "Search for public case information to find relevant precedents.",
    icon: Search,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    title: "Courtroom Procedures",
    description: "Step-by-step guides on how to conduct yourself in the courtroom.",
    icon: Scale,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    title: "Student Community",
    description: "Connect with fellow ProSe and Paralegal students for peer support.",
    icon: Users,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
];

export function FeatureGrid() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl mb-4">Educational Ecosystem</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
            Everything you need to successfully navigate the legal system, from initial understanding to final verdict.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <Card key={idx} className="group transition-all hover:shadow-lg hover:-translate-y-1 border-border/60">
              <CardHeader>
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg} ${feature.color} transition-transform group-hover:scale-110`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-bold group-hover:text-secondary transition-colors">{feature.title}</CardTitle>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <button className="text-sm font-semibold text-secondary flex items-center gap-1 group/btn">
                  Explore Tool 
                  <span className="transition-transform group-hover/btn:translate-x-1">→</span>
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}