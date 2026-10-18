"use client"

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  BookOpen, 
  Search, 
  Gavel, 
  Globe, 
  Newspaper, 
  FilePlus,
  ArrowRight,
  Sparkles,
  Bot,
  Send,
  GripVertical,
  Plus,
  Minus
} from "lucide-react";
import { EditableContent } from "@/components/editable-content";
import { useDevMode } from "@/components/dev-mode-context";
import { useSiteContent } from "@/components/site-content-context";
import { cn } from "@/lib/utils";

interface HubItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
}

const DEFAULT_HUB_ITEMS: HubItem[] = [
  { id: "hub_dom_law", title: "Catalogue of Law", description: "Browse legal domains and study modules.", icon: "BookOpen", href: "/learn", color: "bg-blue-500/10 text-blue-600" },
  { id: "hub_case_lookup", title: "Case Lookup", description: "Search for public case information.", icon: "Search", href: "/lookup", color: "bg-purple-500/10 text-purple-600" },
  { id: "hub_build_case", title: "Build A Case File", description: "Organize facts, parties, and deadlines.", icon: "FilePlus", href: "/prepare/new", color: "bg-emerald-500/10 text-emerald-600" },
  { id: "hub_edu", title: "ProSeU Education", description: "Micro-lessons for courtroom mastery.", icon: "Gavel", href: "/learn", color: "bg-accent/10 text-accent" },
  { id: "hub_local", title: "Local Laws", description: "Specific regulations for your jurisdiction.", icon: "Globe", href: "/resources/local", color: "bg-orange-500/10 text-orange-600" },
  { id: "hub_news", title: "Legal News", description: "Stay updated on recent legal precedents.", icon: "Newspaper", href: "/resources/news", color: "bg-slate-500/10 text-slate-600" },
];

interface FooterLinkItem {
  id: string;
  label: string;
  href: string;
}

const DEFAULT_FOOTER_LINKS: FooterLinkItem[] = [
  { id: "footer_terms", label: "Terms", href: "/terms" },
  { id: "footer_privacy", label: "Privacy", href: "/privacy" },
  { id: "footer_disclaimer", label: "Disclaimer", href: "/disclaimer" }
];

interface ActionButtonItem {
  id: string;
  label: string;
  href: string;
  variant?: "default" | "outline";
}

const DEFAULT_ACTION_BUTTONS: ActionButtonItem[] = [
  { id: "start_learning_btn", label: "Start Learning", href: "/learn", variant: "default" },
  { id: "build_case_btn", label: "Build Case File", href: "/prepare", variant: "outline" }
];

const ICON_MAP: Record<string, any> = {
  BookOpen, Search, Gavel, Globe, Newspaper, FilePlus
};

export default function Home() {
  const [situation, setSituation] = useState("");
  const router = useRouter();
  const { isEditMode, setHasUnsavedChanges } = useDevMode();
  const { getContent, updatePendingContent } = useSiteContent();
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Hub items configuration
  const hubConfigJson = getContent("hub_items_config", JSON.stringify(DEFAULT_HUB_ITEMS));
  const [hubItems, setHubItems] = useState<HubItem[]>(() => {
    try {
      return JSON.parse(hubConfigJson);
    } catch {
      return DEFAULT_HUB_ITEMS;
    }
  });

  // Footer links configuration
  const footerLinksJson = getContent("footer_links_config", JSON.stringify(DEFAULT_FOOTER_LINKS));
  const [footerLinks, setFooterLinks] = useState<FooterLinkItem[]>(() => {
    try {
      return JSON.parse(footerLinksJson);
    } catch {
      return DEFAULT_FOOTER_LINKS;
    }
  });

  // Action buttons configuration
  const actionButtonsJson = getContent("hero_buttons_config", JSON.stringify(DEFAULT_ACTION_BUTTONS));
  const [actionButtons, setActionButtons] = useState<ActionButtonItem[]>(() => {
    try {
      return JSON.parse(actionButtonsJson);
    } catch {
      return DEFAULT_ACTION_BUTTONS;
    }
  });

  // Keep local state in sync when remote data loads
  useEffect(() => {
    try {
      setHubItems(JSON.parse(hubConfigJson));
    } catch {
      setHubItems(DEFAULT_HUB_ITEMS);
    }
  }, [hubConfigJson]);

  useEffect(() => {
    try {
      setFooterLinks(JSON.parse(footerLinksJson));
    } catch {
      setFooterLinks(DEFAULT_FOOTER_LINKS);
    }
  }, [footerLinksJson]);

  useEffect(() => {
    try {
      setActionButtons(JSON.parse(actionButtonsJson));
    } catch {
      setActionButtons(DEFAULT_ACTION_BUTTONS);
    }
  }, [actionButtonsJson]);

  // Situation box state & placeholder
  const defaultPlaceholder = "e.g., 'My landlord is withholding my security deposit...'";
  const situationPlaceholder = getContent("situation_placeholder", defaultPlaceholder);
  const isSituationBoxDeleted = getContent("situation_box_deleted", "false") === "true";

  // Check deletion status for non-template hero elements so their wrappers adjust naturally
  const badgeContent = getContent("enrollment_badge", "NOW OPEN FOR ENROLLMENT");
  const isBadgeDeleted = badgeContent === "__DELETED__";

  const heroTitle = getContent("home_hero_title", "Represent Yourself with Confidence");
  const isHeroTitleDeleted = heroTitle === "__DELETED__";

  const heroDesc = getContent("home_hero_desc", "ProSeU is your university-grade toolkit for courtroom success. Simple enough for beginners, powerful enough for the bar.");
  const isHeroDescDeleted = heroDesc === "__DELETED__";

  const onDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDragEnter = (index: number) => {
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    const newItems = [...hubItems];
    const itemToMove = newItems[draggedItemIndex];
    newItems.splice(draggedItemIndex, 1);
    newItems.splice(index, 0, itemToMove);
    
    setHubItems(newItems);
    setDraggedItemIndex(index);
    updatePendingContent("hub_items_config", JSON.stringify(newItems));
    setHasUnsavedChanges(true);
  };

  const onDragEnd = () => {
    setDraggedItemIndex(null);
  };

  const handleStartAnalysis = () => {
    if (!situation.trim() || isEditMode) return;
    const encodedSituation = encodeURIComponent(situation);
    router.push(`/situation-analysis?situation=${encodedSituation}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  // Delete situation box entirely (allowing surrounding text/buttons to adjust intuitively)
  const handleDeleteSituationBox = () => {
    updatePendingContent("situation_box_deleted", "true");
    setHasUnsavedChanges(true);
  };

  const handleRestoreSituationBox = () => {
    updatePendingContent("situation_box_deleted", "false");
    if (!situationPlaceholder || situationPlaceholder.trim() === "") {
      updatePendingContent("situation_placeholder", defaultPlaceholder);
    }
    setHasUnsavedChanges(true);
  };

  // Footer link management
  const handleAddFooterLink = () => {
    const newId = `footer_link_${Date.now()}`;
    const newLinks = [...footerLinks, { id: newId, label: "New Link", href: "#" }];
    setFooterLinks(newLinks);
    updatePendingContent("footer_links_config", JSON.stringify(newLinks));
    updatePendingContent(newId, "New Link");
    setHasUnsavedChanges(true);
  };

  const handleDeleteFooterLink = (idToDelete: string) => {
    const newLinks = footerLinks.filter(l => l.id !== idToDelete);
    setFooterLinks(newLinks);
    updatePendingContent("footer_links_config", JSON.stringify(newLinks));
    updatePendingContent(idToDelete, "__DELETED__");
    setHasUnsavedChanges(true);
  };

  // Action button management
  const handleAddActionButton = () => {
    const newId = `btn_action_${Date.now()}`;
    const newButtons = [...actionButtons, { id: newId, label: "New Action", href: "#", variant: "outline" as const }];
    setActionButtons(newButtons);
    updatePendingContent("hero_buttons_config", JSON.stringify(newButtons));
    updatePendingContent(newId, "New Action");
    setHasUnsavedChanges(true);
  };

  const handleDeleteActionButton = (idToDelete: string) => {
    const newButtons = actionButtons.filter(b => b.id !== idToDelete);
    setActionButtons(newButtons);
    updatePendingContent("hero_buttons_config", JSON.stringify(newButtons));
    updatePendingContent(idToDelete, "__DELETED__");
    setHasUnsavedChanges(true);
  };

  // Hub item deletion for the center template
  const handleDeleteHubItem = (idToDelete: string) => {
    const newItems = hubItems.filter(item => item.id !== idToDelete);
    setHubItems(newItems);
    updatePendingContent("hub_items_config", JSON.stringify(newItems));
    setHasUnsavedChanges(true);
  };

  return (
    <div className="space-y-8 pb-10">
      <section className="text-center space-y-3 pt-4">
        {/* Enrollment Badge: disappears completely if deleted */}
        {!isBadgeDeleted && (isEditMode || (badgeContent && badgeContent.trim() !== "")) && (
          <div className="inline-flex items-center gap-1.5 bg-accent/10 text-accent px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight border border-accent/20">
            <Sparkles className="h-2.5 w-2.5 shrink-0" />
            <EditableContent contentKey="enrollment_badge" content="NOW OPEN FOR ENROLLMENT" />
          </div>
        )}
        
        {/* Hero Title: disappears completely if deleted */}
        {!isHeroTitleDeleted && (isEditMode || (heroTitle && heroTitle.trim() !== "")) && (
          <div className="max-w-2xl mx-auto">
            <EditableContent 
              tag="h1"
              contentKey="home_hero_title"
              content="Represent Yourself with Confidence"
              className="text-2xl md:text-3xl font-bold text-primary dark:text-white tracking-tighter"
            />
          </div>
        )}

        {/* Hero Description: disappears completely if deleted */}
        {!isHeroDescDeleted && (isEditMode || (heroDesc && heroDesc.trim() !== "")) && (
          <div className="max-w-xl mx-auto">
            <EditableContent 
              tag="p"
              contentKey="home_hero_desc"
              multiline
              content="ProSeU is your university-grade toolkit for courtroom success. Simple enough for beginners, powerful enough for the bar."
              className="text-xs text-muted-foreground leading-relaxed"
            />
          </div>
        )}

        {/* Situation Input Box (Not a template grid; deleting collapses and pulls subsequent text up) */}
        {!isSituationBoxDeleted ? (
          <div className="max-w-xl mx-auto space-y-2 pt-2">
            <div className="text-left">
              <h2 className="text-[10px] font-bold text-primary flex items-center gap-1.5 mb-1 px-2 uppercase tracking-widest">
                <Bot className="h-3.5 w-3.5 text-accent shrink-0" />
                <EditableContent contentKey="situation_prompt_label" content="Describe your situation." />
              </h2>
              <Card className="border shadow-md focus-within:border-accent transition-all overflow-visible rounded-xl relative group/sitbox">
                {/* Delete button when the textarea is left empty in edit mode */}
                {isEditMode && (!situationPlaceholder || situationPlaceholder.trim() === "") && (
                  <button
                    type="button"
                    onClick={handleDeleteSituationBox}
                    title="Delete this box entirely"
                    className="absolute -top-2.5 -right-2.5 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform z-30 cursor-pointer border-2 border-background"
                  >
                    <Minus className="h-3 w-3 stroke-[3]" />
                  </button>
                )}

                <CardContent className="p-0">
                  {isEditMode ? (
                    <div className="relative">
                      <Textarea 
                        value={situationPlaceholder}
                        onChange={(e) => {
                          updatePendingContent("situation_placeholder", e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Type placeholder text here..."
                        className="min-h-[70px] border-none focus-visible:ring-0 text-sm p-3 bg-transparent outline-dashed outline-2 outline-accent/60 rounded-xl"
                      />
                      <div className="p-1.5 border-t bg-muted/20 flex items-center justify-between">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-accent/80 px-2">
                          Editing Placeholder Text
                        </span>
                        <Button 
                          size="sm"
                          className="rounded-full px-3 h-8 text-[10px] font-bold shadow-sm pointer-events-none opacity-80" 
                          disabled
                        >
                          <EditableContent contentKey="analyze_btn_text" content="Analyze Situation" />
                          <Send className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Textarea 
                        placeholder={situationPlaceholder || "Describe your situation..."}
                        className="min-h-[70px] border-none focus-visible:ring-0 text-sm p-3 bg-transparent"
                        value={situation}
                        onChange={(e) => setSituation(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <div className="p-1.5 border-t bg-muted/30 flex justify-end">
                        <Button 
                          size="sm"
                          className="rounded-full px-3 h-8 text-[10px] font-bold shadow-sm" 
                          onClick={handleStartAnalysis}
                          disabled={!situation.trim()}
                        >
                          <EditableContent contentKey="analyze_btn_text" content="Analyze Situation" />
                          <Send className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : isEditMode ? (
          <div className="py-1">
            <button
              type="button"
              onClick={handleRestoreSituationBox}
              className="text-[10px] text-accent/80 hover:text-accent font-semibold underline cursor-pointer"
            >
              [+ Restore Situation Input Box]
            </button>
          </div>
        ) : null}

        {/* Horizontal Sequential Set of Action Buttons with '+' in edit mode and '-' when empty */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {actionButtons.map((btn) => {
            const labelValue = getContent(btn.id, btn.label);
            if (labelValue === "__DELETED__") return null;
            const isEmpty = !labelValue || labelValue.trim() === "";

            return (
              <div key={btn.id} className="relative inline-flex items-center">
                <Button 
                  size="sm" 
                  variant={btn.variant || "default"} 
                  className={cn(
                    "rounded-full px-5 h-9 text-[10px] font-bold shadow-md",
                    btn.variant === "outline" && "border-2"
                  )} 
                  asChild
                >
                  <Link href={isEditMode ? "#" : btn.href} className={cn(isEditMode && "cursor-default pointer-events-none")}>
                    <EditableContent 
                      contentKey={btn.id} 
                      content={btn.label}
                      onDelete={() => handleDeleteActionButton(btn.id)}
                    />
                  </Link>
                </Button>

                {isEditMode && isEmpty && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeleteActionButton(btn.id);
                    }}
                    title="Delete this button"
                    className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform z-30 cursor-pointer border border-background"
                  >
                    <Minus className="h-2.5 w-2.5 stroke-[3]" />
                  </button>
                )}
              </div>
            );
          })}

          {isEditMode && (
            <button
              type="button"
              onClick={handleAddActionButton}
              title="Add another action button"
              className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-dashed border-primary/40 text-primary hover:bg-primary/10 transition-all cursor-pointer shadow-sm hover:scale-105"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </section>

      {/* The 6 Hub Boxes in the Center (Template Grid Layout) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {hubItems.map((item: any, index: number) => {
          const Icon = ICON_MAP[item.icon] || Gavel;
          const itemTitle = getContent(`${item.id}_title`, item.title);
          const itemDesc = getContent(`${item.id}_desc`, item.description);
          const isItemEmpty = (!itemTitle || itemTitle.trim() === "") && (!itemDesc || itemDesc.trim() === "");

          return (
            <div 
              key={item.id} 
              className={cn(
                "relative h-full transition-all duration-300 ease-in-out",
                isEditMode && "cursor-grab active:cursor-grabbing",
                draggedItemIndex === index && "opacity-40 scale-95"
              )}
              draggable={isEditMode}
              onDragStart={() => onDragStart(index)}
              onDragOver={onDragOver}
              onDragEnter={() => onDragEnter(index)}
              onDragEnd={onDragEnd}
            >
              {/* Option to delete box via small '-' in a circle in the top right if empty */}
              {isEditMode && (isItemEmpty || !itemTitle || itemTitle.trim() === "") && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteHubItem(item.id);
                  }}
                  title="Delete this box from grid"
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform z-30 cursor-pointer border border-background"
                >
                  <Minus className="h-2.5 w-2.5 stroke-[3]" />
                </button>
              )}

              <Link href={isEditMode ? "#" : item.href} className={cn(isEditMode && "cursor-default block h-full pointer-events-none")}>
                <Card className="proseu-card border hover:border-accent group bg-card/50 backdrop-blur-sm h-full flex flex-col p-3 relative">
                  {isEditMode && (
                    <div className="absolute top-1.5 right-1.5 text-muted-foreground/30">
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="flex flex-row items-center space-x-2.5 mb-2">
                    <div className={`p-1.5 rounded-lg ${item.color} shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <EditableContent 
                        tag="h3"
                        contentKey={`${item.id}_title`}
                        content={item.title}
                        className="text-xs tracking-tight font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <EditableContent 
                      tag="p"
                      contentKey={`${item.id}_desc`}
                      multiline
                      content={item.description}
                      className="text-[10px] leading-relaxed text-muted-foreground"
                    />
                  </div>
                  <div className="mt-3 flex items-center text-[9px] font-bold text-primary dark:text-accent group uppercase tracking-widest">
                    <EditableContent contentKey={`hub_enter_${item.id}`} content="Enter Section" />
                    <ArrowRight className="ml-1 h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Card>
              </Link>
            </div>
          );
        })}
      </section>

      {/* Footer with Horizontal Sequential Set: '+' to add another, '-' when empty to delete */}
      <footer className="pt-8 border-t text-center text-muted-foreground pb-6">
        <div className="flex flex-wrap items-center justify-center gap-4 mb-3 text-[9px] font-bold uppercase tracking-widest">
          {footerLinks.map((link) => {
            const labelValue = getContent(link.id, link.label);
            if (labelValue === "__DELETED__") return null;
            const isEmpty = !labelValue || labelValue.trim() === "";

            return (
              <div key={link.id} className="relative inline-flex items-center">
                <Link href={isEditMode ? "#" : link.href} className={cn(isEditMode && "cursor-default pointer-events-none")}>
                  <EditableContent 
                    contentKey={link.id} 
                    content={link.label}
                    onDelete={() => handleDeleteFooterLink(link.id)}
                  />
                </Link>

                {/* Option to delete box via small '-' in a circle in top right when left empty */}
                {isEditMode && isEmpty && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeleteFooterLink(link.id);
                    }}
                    title="Delete this link"
                    className="absolute -top-1.5 -right-2.5 h-3.5 w-3.5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform z-30 cursor-pointer border border-background"
                  >
                    <Minus className="h-2 w-2 stroke-[3]" />
                  </button>
                )}
              </div>
            );
          })}

          {/* '+' button to add another link to the horizontal sequential set */}
          {isEditMode && (
            <button
              type="button"
              onClick={handleAddFooterLink}
              title="Add another link"
              className="inline-flex items-center justify-center h-4 w-4 rounded-full border border-dashed border-primary/50 text-primary hover:bg-primary/10 transition-all cursor-pointer shadow-sm hover:scale-110"
            >
              <Plus className="h-2.5 w-2.5 stroke-[3]" />
            </button>
          )}
        </div>

        <div className="text-[7px] uppercase tracking-[0.3em] font-bold opacity-50">
          <EditableContent contentKey="footer_copyright" content="ProSeU University © 2024" />
        </div>
      </footer>
    </div>
  );
}
