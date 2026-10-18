
"use client"

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  FileText, 
  Clock, 
  ChevronRight, 
  Layers,
  AlertCircle,
  Briefcase,
  LayoutGrid,
  List,
  ArrowUpDown,
  GripVertical,
  GripHorizontal,
  Filter,
  Search,
  X,
  Calendar,
  EyeOff,
  CheckCircle2
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { EditableContent } from "@/components/editable-content";
import { useDevMode } from "@/components/dev-mode-context";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const INITIAL_CASES = [
  {
    id: "case-001",
    title: "Smith v. Realty Group LLC",
    type: "Civil - Property",
    lastUpdated: "2024-05-15",
    addedAt: "2024-01-10",
    completedAt: null,
    isHidden: false,
    progress: 65,
    status: "Active"
  },
  {
    id: "case-002",
    title: "Consumer Debt Defense - Chase",
    type: "Civil - Debt",
    lastUpdated: "2024-05-10",
    addedAt: "2024-02-15",
    completedAt: null,
    isHidden: false,
    progress: 30,
    status: "Draft"
  },
  {
    id: "case-003",
    title: "County Court - Traffic Violation",
    type: "Administrative",
    lastUpdated: "2024-05-08",
    addedAt: "2024-03-01",
    completedAt: "2024-05-08",
    isHidden: true,
    progress: 100,
    status: "Review"
  }
];

const COLUMNS = [
  { id: 'title', label: 'Case Title' },
  { id: 'type', label: 'Case Type' },
  { id: 'status', label: 'Status' },
  { id: 'progress', label: 'Progress' },
  { id: 'addedAt', label: 'Added' },
  { id: 'completedAt', label: 'Completed' },
  { id: 'lastUpdated', label: 'Last Action' },
  { id: 'isHidden', label: 'Hidden' },
];

function SortableHeader({ id, label, onSort }: { id: string; label: string; onSort: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <TableHead 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "bg-muted/50 border-r last:border-r-0 relative group p-0 whitespace-nowrap",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center h-full px-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-accent mr-1"
        >
          <GripHorizontal className="h-3 w-3" />
        </button>
        <button 
          onClick={() => onSort(id)}
          className="flex-1 h-full flex items-center justify-between py-2 text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-colors gap-4"
        >
          <span className="truncate">{label}</span>
          <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>
      </div>
    </TableHead>
  );
}

function SortableCaseRow({ caseFile, columnOrder, onOpen, mounted }: { caseFile: any; columnOrder: string[]; onOpen: (id: string) => void; mounted: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: caseFile.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr || !mounted) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "group hover:bg-muted/30 transition-colors whitespace-nowrap",
        isDragging && "opacity-50 bg-accent/5",
        caseFile.isHidden && "opacity-60"
      )}
    >
      <TableCell className="px-2 border-r">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-accent p-1"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      {columnOrder.map((colId) => {
        const val = caseFile[colId];
        return (
          <TableCell 
            key={colId} 
            className="px-4 py-2 border-r last:border-r-0 cursor-pointer"
            onClick={() => onOpen(caseFile.id)}
          >
            {colId === 'title' && (
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-1.5 rounded-lg text-primary shrink-0">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold text-xs">{val}</span>
              </div>
            )}
            {colId === 'type' && <span className="text-[10px] font-medium text-muted-foreground uppercase">{val}</span>}
            {colId === 'status' && (
              <Badge variant="outline" className="text-[8px] font-black uppercase h-5 bg-background px-1.5">
                {val}
              </Badge>
            )}
            {colId === 'progress' && (
              <div className="flex items-center gap-3 min-w-[100px]">
                <Progress value={val} className="h-1 flex-1" />
                <span className="text-[10px] font-bold w-8 text-right">{val}%</span>
              </div>
            )}
            {(colId === 'lastUpdated' || colId === 'addedAt' || colId === 'completedAt') && (
              <span className="text-[10px] text-muted-foreground font-medium px-2">
                {formatDate(val)}
              </span>
            )}
            {colId === 'isHidden' && (
              <div className="flex justify-center px-4">
                {val ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <div className="h-3 w-3" />}
              </div>
            )}
          </TableCell>
        );
      })}
      <TableCell className="text-right px-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-accent hover:text-white" onClick={() => onOpen(caseFile.id)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function CasePrepHub() {
  const router = useRouter();
  const { isEditMode } = useDevMode();
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'details'>('cards');
  const [cases, setCases] = useState(INITIAL_CASES);
  const [columnOrder, setColumnOrder] = useState(COLUMNS.map(c => c.id));
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Filter State
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
    minProgress: 0,
    maxProgress: 100,
    timeframe: 'all', // last action
    addedTimeframe: 'all',
    completedTimeframe: 'all',
    showHidden: false
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNewCase = () => {
    if (isEditMode) return;
    router.push("/prepare/new");
  };

  const handleOpenCase = (id: string) => {
    if (isEditMode) return;
    router.push(`/prepare/${id}`);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    
    const sorted = [...cases].sort((a: any, b: any) => {
      const valA = a[key] ?? '';
      const valB = b[key] ?? '';
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setCases(sorted);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const isColumnDrag = columnOrder.includes(activeId);

    if (isColumnDrag) {
      if (activeId !== overId) {
        setColumnOrder((items) => {
          const oldIndex = items.indexOf(activeId);
          const newIndex = items.indexOf(overId);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    } else {
      if (activeId !== overId) {
        setCases((items) => {
          const oldIndex = items.findIndex((i) => i.id === activeId);
          const newIndex = items.findIndex((i) => i.id === overId);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    }
  };

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // Show hidden items only if filter is checked
      if (!filters.showHidden && c.isHidden) return false;

      const matchesSearch = c.title.toLowerCase().includes(filters.search.toLowerCase());
      const matchesType = filters.type === 'all' || c.type.toLowerCase().includes(filters.type.toLowerCase());
      const matchesStatus = filters.status === 'all' || c.status === filters.status;
      const matchesProgress = c.progress >= filters.minProgress && c.progress <= filters.maxProgress;
      
      const checkTimeframe = (dateStr: string | null | undefined, timeframe: string) => {
        if (timeframe === 'all') return true;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (timeframe === '7d') return diffDays <= 7;
        if (timeframe === '30d') return diffDays <= 30;
        if (timeframe === '90d') return diffDays <= 90;
        return true;
      };

      return matchesSearch && 
             matchesType && 
             matchesStatus && 
             matchesProgress && 
             checkTimeframe(c.lastUpdated, filters.timeframe) &&
             checkTimeframe(c.addedAt, filters.addedTimeframe) &&
             checkTimeframe(c.completedAt, filters.completedTimeframe);
    });
  }, [cases, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.type !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.minProgress > 0 || filters.maxProgress < 100) count++;
    if (filters.timeframe !== 'all') count++;
    if (filters.addedTimeframe !== 'all') count++;
    if (filters.completedTimeframe !== 'all') count++;
    if (filters.showHidden) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      status: 'all',
      minProgress: 0,
      maxProgress: 100,
      timeframe: 'all',
      addedTimeframe: 'all',
      completedTimeframe: 'all',
      showHidden: false
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 px-6 pt-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <EditableContent 
            tag="h1"
            contentKey="caseprep_title"
            content="Strategy Hub"
            className="text-4xl font-black tracking-tight text-primary uppercase"
          />
          <EditableContent 
            tag="p"
            contentKey="caseprep_desc"
            content="Coordinate your legal preparation, evidence inventory, and AI strategy debriefs."
            className="text-muted-foreground font-medium max-w-xl italic"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 h-10">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-full gap-2 rounded-xl border-2 hover:bg-muted relative">
                  <Filter className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Filter</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center text-[10px] bg-accent text-white">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-6 space-y-6 rounded-[2.5rem] border-2 shadow-2xl z-50">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-accent" /> Active Filters
                    </h4>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                        Clear All
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Search Title</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        placeholder="Name or keyword..." 
                        value={filters.search}
                        onChange={e => setFilters({...filters, search: e.target.value})}
                        className="pl-9 h-10 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Case Type</Label>
                      <Select value={filters.type} onValueChange={val => setFilters({...filters, type: val})}>
                        <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="Civil">Civil</SelectItem>
                          <SelectItem value="Administrative">Administrative</SelectItem>
                          <SelectItem value="Criminal">Criminal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Status</Label>
                      <Select value={filters.status} onValueChange={val => setFilters({...filters, status: val})}>
                        <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Review">Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Progress Range</Label>
                      <span className="text-[10px] font-bold text-accent">{filters.minProgress}% - {filters.maxProgress}%</span>
                    </div>
                    <Slider 
                      defaultValue={[filters.minProgress, filters.maxProgress]} 
                      max={100} 
                      step={5} 
                      onValueChange={([min, max]) => setFilters({...filters, minProgress: min, maxProgress: max})}
                      className="px-1"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Added Date</Label>
                      <Select value={filters.addedTimeframe} onValueChange={val => setFilters({...filters, addedTimeframe: val})}>
                        <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Anytime</SelectItem>
                          <SelectItem value="7d">Last 7 Days</SelectItem>
                          <SelectItem value="30d">Last 30 Days</SelectItem>
                          <SelectItem value="90d">Last 90 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Completed Date</Label>
                      <Select value={filters.completedTimeframe} onValueChange={val => setFilters({...filters, completedTimeframe: val})}>
                        <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Anytime</SelectItem>
                          <SelectItem value="7d">Last 7 Days</SelectItem>
                          <SelectItem value="30d">Last 30 Days</SelectItem>
                          <SelectItem value="90d">Last 90 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Last Action</Label>
                      <Select value={filters.timeframe} onValueChange={val => setFilters({...filters, timeframe: val})}>
                        <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Anytime</SelectItem>
                          <SelectItem value="7d">Last 7 Days</SelectItem>
                          <SelectItem value="30d">Last 30 Days</SelectItem>
                          <SelectItem value="90d">Last 90 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <Label htmlFor="show-hidden" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">Show Hidden Matters</Label>
                    <Switch 
                      id="show-hidden" 
                      checked={filters.showHidden} 
                      onCheckedChange={(checked) => setFilters({...filters, showHidden: checked})}
                      className="scale-75"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex bg-muted p-1 rounded-xl border-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-9 w-9 p-0 rounded-lg transition-all", 
                viewMode === 'cards' 
                  ? "bg-accent text-white shadow-sm hover:bg-accent/90" 
                  : "text-muted-foreground hover:bg-muted"
              )} 
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-9 w-9 p-0 rounded-lg transition-all", 
                viewMode === 'details' 
                  ? "bg-accent text-white shadow-sm hover:bg-accent/90" 
                  : "text-muted-foreground hover:bg-muted"
              )} 
              onClick={() => setViewMode('details')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            onClick={handleNewCase}
            disabled={isEditMode}
            className="rounded-full px-8 h-12 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-5 w-5" />
            <EditableContent contentKey="caseprep_new_case_button" content="New Case File" />
          </Button>
        </div>
      </header>

      {filteredCases.length > 0 ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCases.map((caseFile) => (
              <Card 
                key={caseFile.id}
                className={cn(
                  "group hover:border-accent transition-all duration-300 bg-card/50 backdrop-blur-sm rounded-[2rem] overflow-hidden flex flex-col",
                  !isEditMode && "cursor-pointer",
                  caseFile.isHidden && "opacity-75 grayscale-[0.5]"
                )}
                onClick={() => handleOpenCase(caseFile.id)}
              >
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="bg-muted p-3 rounded-2xl text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <div className="flex gap-2">
                      {caseFile.isHidden && (
                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-2.5 h-6 bg-amber-50 text-amber-600 border-amber-200">
                          Hidden
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-2.5 h-6 bg-background">
                        {caseFile.status}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg font-bold leading-tight group-hover:text-accent transition-colors">
                    {caseFile.title}
                  </CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">
                    {caseFile.type}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="px-6 pb-6 space-y-6 flex-1 flex flex-col justify-end">
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Added</p>
                      <p className="text-[10px] font-bold">{mounted ? new Date(caseFile.addedAt).toLocaleDateString() : "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Completed</p>
                      <p className="text-[10px] font-bold">{caseFile.completedAt && mounted ? new Date(caseFile.completedAt).toLocaleDateString() : "—"}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-muted-foreground">
                        <EditableContent contentKey="caseprep_progress_label" content="Preparation Progress" />
                      </span>
                      <span className="text-foreground">{caseFile.progress}%</span>
                    </div>
                    <Progress value={caseFile.progress} className="h-1.5" />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-dashed">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase">
                      <Clock className="h-3 w-3" />
                      <EditableContent contentKey="caseprep_last_updated_label" content="Last Action" />
                      <span className="text-foreground ml-1">
                        {mounted ? new Date(caseFile.lastUpdated).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <div className="text-accent font-black text-[10px] uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <EditableContent contentKey="caseprep_resume_button" content="Resume" />
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-4 rounded-[2rem] overflow-hidden shadow-2xl bg-card/50 backdrop-blur-sm">
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
            >
              <div className="overflow-x-auto scrollbar-hide">
                <Table className="w-max table-auto">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[40px] bg-muted/50 border-r"></TableHead>
                      <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                        {columnOrder.map((colId) => {
                          const col = COLUMNS.find(c => c.id === colId);
                          return (
                            <SortableHeader 
                              key={colId} 
                              id={colId} 
                              label={col?.label || ''} 
                              onSort={handleSort} 
                            />
                          );
                        })}
                      </SortableContext>
                      <TableHead className="text-right bg-muted/50 w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext items={filteredCases.map(c => c.id)} strategy={verticalListSortingStrategy}>
                      {filteredCases.map((caseFile) => (
                        <SortableCaseRow 
                          key={caseFile.id} 
                          caseFile={caseFile} 
                          columnOrder={columnOrder} 
                          onOpen={handleOpenCase}
                          mounted={mounted}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </div>
            </DndContext>
          </Card>
        )
      ) : (
        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-6 border-4 border-dashed rounded-[3rem] bg-muted/5">
          <div className="bg-muted p-6 rounded-[2.5rem]">
            {activeFilterCount > 0 ? <Search className="h-16 w-16 text-muted-foreground/30" /> : <FileText className="h-16 w-16 text-muted-foreground/30" />}
          </div>
          <div className="space-y-2 max-w-sm">
            <EditableContent 
              tag="h3"
              contentKey="caseprep_empty_title"
              content={activeFilterCount > 0 ? "No Matching Cases" : "Ready to Build Your Case?"}
              className="text-xl font-bold uppercase tracking-tight"
            />
            <EditableContent 
              tag="p"
              contentKey="caseprep_empty_desc"
              content={activeFilterCount > 0 ? "Adjust your filters to discover other matters in your registry." : "You haven't initialized any strategy files yet. Start your professional case file to begin."}
              className="text-xs text-muted-foreground italic"
            />
          </div>
          {activeFilterCount > 0 ? (
            <Button onClick={clearFilters} variant="outline" className="rounded-full border-2 font-bold px-8">
              Reset Filters
            </Button>
          ) : (
            <Button 
              onClick={handleNewCase}
              disabled={isEditMode}
              variant="outline" 
              className="rounded-full border-2 font-bold px-8"
            >
              Initialize File
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
