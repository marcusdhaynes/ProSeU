'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FOUNDING_CURRICULUM } from '@/lib/founding-curriculum';
import { generateIntuitiveCode } from '@/lib/codes';
import { requireSupabaseDataAdmin, supabaseData } from '@/supabase/firebase-data-client';

type Status = 'draft' | 'published' | 'archived';
type Common = {
  id: string; code: string | null; description: string | null;
  position: number; status: Status; content: Record<string, unknown>;
};
type Domain = Common & { name: string; slug: string | null };
type Field = Common & { name: string; domain_id: string };
type Course = Common & {
  title: string; domain_id: string; field_id: string; slug: string | null;
};
type Kind = 'domains' | 'fields' | 'courses';
type Edit = { kind: Kind; id: string; name: string; description: string; code: string; status: Status };
const TABLE: Record<Kind, string> = {
  domains: 'proseu_domains', fields: 'proseu_fields', courses: 'proseu_courses'
};
const roman = ['I','II','III','IV','V','VI','VII','VIII','IX'];

function importPayload() {
  return FOUNDING_CURRICULUM.map(s => ({
    number: s.number, name: s.name, subtitle: s.subtitle,
    courses: s.courses.map(c => ({
      curriculumCode: c.curriculumCode, title: c.title, description: c.description
    }))
  }));
}

function rowFor(kind: Kind, id: string, domains: Domain[], fields: Field[], courses: Course[]) {
  return kind === 'domains'
    ? domains.find(r => r.id === id)
    : kind === 'fields'
      ? fields.find(r => r.id === id)
      : courses.find(r => r.id === id);
}

export function SupabaseCurriculumManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [moving, setMoving] = useState<{ kind: Kind; id: string } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await requireSupabaseDataAdmin();
      const queries = await Promise.all([
        supabaseData.from(TABLE.domains).select('*').order('position').limit(1000),
        supabaseData.from(TABLE.fields).select('*').order('position').limit(1000),
        supabaseData.from(TABLE.courses).select('*').order('position').limit(1000)
      ]);
      for (const result of queries) if (result.error) throw result.error;
      setDomains((queries[0].data || []) as Domain[]);
      setFields((queries[1].data || []) as Field[]);
      setCourses((queries[2].data || []) as Course[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const save = async (kind: Kind, id: string, values: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await requireSupabaseDataAdmin();
      const { error } = await supabaseData.from(TABLE[kind]).update(values).eq('id', id);
      if (error) throw error;
      setEdit(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (kind: Kind, id: string) => {
    const row = rowFor(kind, id, domains, fields, courses);
    if (!row) return;
    setEdit({
      kind, id, name: kind === 'courses' ? (row as Course).title : (row as Domain).name,
      description: row.description || '', code: row.code || '',
      status: row.status
    });
  };

  const finishEdit = async () => {
    if (!edit) return;
    const name = edit.name.trim();
    if (!name) { setError('A title or name is required.'); return; }
    await save(edit.kind, edit.id, {
      [edit.kind === 'courses' ? 'title' : 'name']: name,
      description: edit.description, code: edit.code.trim() || null, status: edit.status
    });
  };

  const create = async (kind: Kind, parent?: { domainId?: string; fieldId?: string }) => {
    const name = window.prompt(kind === 'courses' ? 'New course title' : kind === 'fields' ? 'New field name' : 'New domain name');
    if (!name?.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await requireSupabaseDataAdmin();
      const list = kind === 'domains' ? domains : kind === 'fields' ? fields : courses;
      const existing = list.map(r => r.code).filter((c): c is string => Boolean(c));
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '-' + Date.now();
      const value: Record<string, unknown> = {
        id: `admin-${kind.slice(0,-1)}-${crypto.randomUUID()}`,
        code: generateIntuitiveCode(name.trim(), kind === 'domains' ? 'A' : kind === 'fields' ? 'B' : 'C', existing),
        description: '', status: 'draft', content: {},
        position: list.length,
        ...(kind === 'courses' ? { title: name.trim(), slug, domain_id: parent?.domainId, field_id: parent?.fieldId } :
          kind === 'fields' ? { name: name.trim(), domain_id: parent?.domainId } :
          { name: name.trim(), slug })
      };
      const { error } = await supabaseData.from(TABLE[kind]).insert(value);
      if (error) throw error;
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (kind: Kind, id: string) => {
    const hasChildren = kind === 'domains'
      ? fields.some(f => f.domain_id === id)
      : kind === 'fields' ? courses.some(c => c.field_id === id) : false;
    if (hasChildren) { setError('Move or archive child records before deleting this item.'); return; }
    if (!window.confirm('Permanently delete this item? Student data and linked concepts may block deletion.')) return;
    setBusy(true);
    setError(null);
    try {
      await requireSupabaseDataAdmin();
      const { error } = await supabaseData.from(TABLE[kind]).delete().eq('id', id);
      if (error) throw error;
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const move = async (target: { kind: Kind; id: string }) => {
    const source = moving;
    setMoving(null);
    if (!source || source.id === target.id || busy) return;
    setBusy(true);
    setError(null);
    try {
      await requireSupabaseDataAdmin();
      if (source.kind === 'domains' && target.kind === 'domains') {
        const reordered = [...domains].filter(d => d.id !== source.id);
        const original = domains.find(d => d.id === source.id);
        const index = reordered.findIndex(d => d.id === target.id);
        if (!original || index < 0) return;
        reordered.splice(index, 0, original);
        for (const [index, item] of reordered.entries()) {
          if (item.position === index) continue;
          const { error } = await supabaseData.from(TABLE.domains).update({ position: index }).eq('id', item.id);
          if (error) throw error;
        }
      } else if (source.kind === 'fields' && (target.kind === 'fields' || target.kind === 'domains')) {
        const targetField = fields.find(f => f.id === target.id);
        const domainId = target.kind === 'domains' ? target.id : targetField?.domain_id;
        if (!domainId) return;
        const { error } = await supabaseData.from(TABLE.fields).update({ domain_id: domainId }).eq('id', source.id);
        if (error) throw error;
        // Keep the domainId invariant for all courses belonging to the moved field.
        const { error: childrenError } = await supabaseData.from(TABLE.courses).update({ domain_id: domainId }).eq('field_id', source.id);
        if (childrenError) throw childrenError;
      } else if (source.kind === 'courses' && (target.kind === 'courses' || target.kind === 'fields')) {
        const targetField = target.kind === 'fields'
          ? fields.find(f => f.id === target.id)
          : fields.find(f => f.id === courses.find(c => c.id === target.id)?.field_id);
        if (!targetField) return;
        const { error } = await supabaseData.from(TABLE.courses)
          .update({ domain_id: targetField.domain_id, field_id: targetField.id })
          .eq('id', source.id);
        if (error) throw error;
        if (target.kind === 'courses') {
          const siblings = courses.filter(c => c.field_id === targetField.id && c.id !== source.id);
          const insertion = siblings.findIndex(c => c.id === target.id);
          if (insertion >= 0) {
            const movingCourse = courses.find(c => c.id === source.id);
            if (movingCourse) siblings.splice(insertion, 0, movingCourse);
            for (const [index, item] of siblings.entries()) {
              if (item.position === index && item.id !== source.id) continue;
              const { error } = await supabaseData.from(TABLE.courses).update({ position: index }).eq('id', item.id);
              if (error) throw error;
            }
          }
        }
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const importFounding = async () => {
    if (busy || !window.confirm('Import nine founding stages and 72 required courses into Supabase? Existing records and edits will not be overwritten.')) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await requireSupabaseDataAdmin();
      const { data, error } = await supabaseData.rpc('proseu_import_founding_curriculum', {
        p_stages: importPayload()
      });
      if (error) throw error;
      const counts = data as { domainsCreated?: number; fieldsCreated?: number; coursesCreated?: number };
      setNotice(`Supabase import committed: ${counts?.domainsCreated ?? 0} Domains, ${counts?.fieldsCreated ?? 0} Fields, ${counts?.coursesCreated ?? 0} Courses. Existing edits were preserved.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const totalFounding = useMemo(() => courses.filter(c => c.content?.source === 'proseu-founding-2026').length, [courses]);
  const actionButton = (kind: Kind, id: string) => (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => startEdit(kind,id)}>Edit</Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void remove(kind,id)}>Delete</Button>
    </span>
  );

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h2 className="text-lg font-bold">Domains — Supabase</h2>
        <p className="text-xs text-muted-foreground">Domains → Fields → Courses are saved in PostgreSQL, using protected database permissions. Drag an item onto a compatible target to move or reorder it.</p>
      </header>
      <div className="flex flex-wrap gap-2 items-center">
        <Button onClick={() => void importFounding()} disabled={busy || loading}>Import 2026 Founding Curriculum (9 Stages / 72 Courses)</Button>
        <Button variant="outline" disabled={busy} onClick={() => void create('domains')}>Add Domain</Button>
        <Button variant="outline" disabled={busy} onClick={() => void refresh()}>Refresh</Button>
        <span className="text-xs text-muted-foreground">{totalFounding} of 72 founding courses in Supabase</span>
      </div>
      {loading && <p role="status" className="text-sm">Loading Supabase Domains, Fields and Courses…</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      {edit && (
        <div className="rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-sm">Edit {edit.kind.slice(0,-1)}</h3>
          <Input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} placeholder="Title / name" />
          <Textarea value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} placeholder="Description" />
          <div className="flex flex-wrap gap-2">
            <Input className="max-w-32" value={edit.code} onChange={e => setEdit({ ...edit, code: e.target.value })} placeholder="Code" />
            <select className="rounded border px-3 py-1 text-sm bg-background" value={edit.status} onChange={e => setEdit({ ...edit, status: e.target.value as Status })}>
              <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
            </select>
            <Button disabled={busy} onClick={() => void finishEdit()}>Save Changes</Button>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
          </div>
        </div>
      )}
      {!loading && domains.length === 0 && !error && <p className="text-sm text-muted-foreground">There are no Supabase Domains yet. Import the Founding Curriculum or add a Domain.</p>}
      <div className="space-y-3">
        {domains.map(domain => (
          <details key={domain.id} className="rounded-xl border bg-card/70 p-3" open={domains.length < 3 ? true : undefined}>
            <summary className="flex flex-wrap gap-2 items-center cursor-pointer" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void move({kind:'domains',id:domain.id}); }}>
              <span draggable onDragStart={() => setMoving({kind:'domains',id:domain.id})} onDragEnd={() => setMoving(null)} className="cursor-grab text-muted-foreground" title="Drag to reorder">⠿</span>
              <strong className="flex-1">{domain.name}</strong>
              <span className="text-xs text-muted-foreground">{fields.filter(f=>f.domain_id===domain.id).length} Fields</span>
              {actionButton('domains', domain.id)}
            </summary>
            {domain.description && <p className="text-xs mt-2 text-muted-foreground">{domain.description}</p>}
            <div className="pl-3 mt-3 space-y-3 border-l">
              {fields.filter(f=>f.domain_id===domain.id).map(field => (
                <details key={field.id} className="rounded-lg border p-3" open={true}>
                  <summary className="flex flex-wrap gap-2 items-center cursor-pointer" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();e.stopPropagation();void move({kind:'fields',id:field.id});}}>
                    <span draggable onDragStart={e=>{e.stopPropagation();setMoving({kind:'fields',id:field.id});}} onDragEnd={()=>setMoving(null)} className="cursor-grab" title="Drag into a different Domain or Field">⠿</span>
                    <strong className="flex-1 text-sm">{field.name}</strong>
                    <span className="text-xs text-muted-foreground">{courses.filter(c=>c.field_id===field.id).length} Courses</span>
                    {actionButton('fields',field.id)}
                  </summary>
                  <div className="mt-3 space-y-2 pl-4" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();e.stopPropagation();void move({kind:'fields',id:field.id});}}>
                    {courses.filter(c=>c.field_id===field.id).map(course => (
                      <div key={course.id} className="flex items-start gap-2 rounded-lg p-2 border bg-background" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();e.stopPropagation();void move({kind:'courses',id:course.id});}}>
                        <span draggable onDragStart={e=>{e.stopPropagation();setMoving({kind:'courses',id:course.id});}} onDragEnd={()=>setMoving(null)} className="cursor-grab mt-1" title="Drag to reorder or change Field">⠿</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="font-mono text-xs text-accent">{String(course.content?.curriculumCode || course.code || '')}</span>
                            <strong className="text-sm">{course.title}</strong>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{course.description}</p>
                        </div>
                        {actionButton('courses',course.id)}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" disabled={busy} onClick={()=>void create('courses',{domainId:domain.id,fieldId:field.id})}>Add Course</Button>
                  </div>
                </details>
              ))}
              <Button variant="outline" size="sm" disabled={busy} onClick={()=>void create('fields',{domainId:domain.id})}>Add Field</Button>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
