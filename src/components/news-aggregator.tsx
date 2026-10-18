import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const newsItems = [
  {
    title: "Recent Changes in Small Claims Court Procedures",
    summary: "Learn about the new digital filing requirements implemented in multiple jurisdictions this quarter.",
    category: "Procedural",
    date: "May 15, 2024",
    image: PlaceHolderImages.find(img => img.id === 'news-article-1')?.imageUrl,
  },
  {
    title: "Key Supreme Court Precedent on Digital Privacy",
    summary: "A deep dive into the latest ruling affecting personal data protection and user privacy rights.",
    category: "Civil Rights",
    date: "May 12, 2024",
    image: PlaceHolderImages.find(img => img.id === 'news-article-2')?.imageUrl,
  },
  {
    title: "New ProSe Advocacy Program Launches Nationwide",
    summary: "ProSeU partners with local legal aid societies to expand student resources across the country.",
    category: "Community",
    date: "May 10, 2024",
    image: PlaceHolderImages.find(img => img.id === 'news-article-3')?.imageUrl,
  },
];

export function NewsAggregator() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-6 mb-12 md:flex-row md:items-end">
          <div className="text-center md:text-left">
            <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl mb-4">Legal News & Insights</h2>
            <p className="max-w-2xl text-muted-foreground text-lg">
              Stay informed with curated updates on recent legal precedents and courtroom changes.
            </p>
          </div>
          <button className="text-secondary font-bold flex items-center gap-2 hover:underline">
            View All News <ExternalLink className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {newsItems.map((item, idx) => (
            <Card key={idx} className="overflow-hidden border-none shadow-sm transition-shadow hover:shadow-md">
              <div className="relative h-48 w-full">
                <Image 
                  src={item.image || "https://picsum.photos/400/250"} 
                  alt={item.title}
                  fill
                  className="object-cover"
                  data-ai-hint="legal news"
                />
              </div>
              <CardHeader className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className="bg-secondary/10 text-secondary hover:bg-secondary/20 border-none px-3 py-1">
                    {item.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">{item.date}</span>
                </div>
                <h3 className="text-xl font-bold text-primary leading-tight hover:text-secondary transition-colors cursor-pointer">
                  {item.title}
                </h3>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}