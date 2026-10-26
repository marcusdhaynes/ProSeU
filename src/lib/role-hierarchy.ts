/** Pure, deterministic roles tree operations. No UI or database dependencies. */
export const ROLE_CATEGORIES = ['free','trial','membership','organization','admin'] as const;
export type RoleCategory = typeof ROLE_CATEGORIES[number];
export type RoleNode = {
  id: string;
  name: string;
  category: string;
  parentId?: string | null;
  order: number;
};
export type RoleDestination =
  | { type: 'root'; category: RoleCategory }
  | { type: 'node'; id: string; placement: 'before' | 'after' | 'inside' };

export type RoleHierarchy = {
  nodes: RoleNode[];
  children: Map<string,RoleNode[]>;
  roots: Map<RoleCategory,RoleNode[]>;
  warnings: string[];
};
const stableSort = (a:RoleNode,b:RoleNode) =>
  (Number.isFinite(a.order)?a.order:0)-(Number.isFinite(b.order)?b.order:0) ||
  a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
const keyOf=(category:string,parentId:string|null|undefined)=>parentId||('@'+category);

export function buildRoleHierarchy(input:RoleNode[]):RoleHierarchy {
  const original=new Map(input.map(n=>[n.id,n]));
  const nodes:RoleNode[]=[];
  const warnings:string[]=[];
  for(const node of input) {
    const parent=node.parentId?original.get(node.parentId):null;
    let invalid=Boolean(node.parentId && (!parent || parent.category!==node.category || parent.id===node.id));
    if(!invalid && parent){
      const seen=new Set<string>([node.id]);
      let cursor:RoleNode|undefined=parent;
      while(cursor){
        if(seen.has(cursor.id)){invalid=true;break;}
        seen.add(cursor.id);
        cursor=cursor.parentId?original.get(cursor.parentId):undefined;
      }
    }
    if(invalid)warnings.push(`Invalid parent reference on "${node.name}"; showing at category root.`);
    nodes.push({...node,parentId:invalid?null:(node.parentId||null)});
  }
  const children=new Map<string,RoleNode[]>();
  const roots=new Map<RoleCategory,RoleNode[]>(ROLE_CATEGORIES.map(cat=>[cat,[]]));
  for(const node of nodes){
    if(node.parentId){
      const list=children.get(node.parentId)||[];
      list.push(node);children.set(node.parentId,list);
    }else if(ROLE_CATEGORIES.includes(node.category as RoleCategory)){
      roots.get(node.category as RoleCategory)!.push(node);
    }else warnings.push(`Unknown role category for "${node.name}".`);
  }
  for(const list of [...children.values(),...roots.values()])list.sort(stableSort);
  return {nodes,children,roots,warnings};
}

function hierarchyPath(nodes:RoleNode[],id:string){
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const ids=new Set<string>();
  let current=byId.get(id);
  while(current) {
    if(ids.has(current.id))throw new Error('Invalid circular hierarchy already exists.');
    ids.add(current.id);
    current=current.parentId?byId.get(current.parentId):undefined;
  }
  return ids;
}

export function moveRole(input:RoleNode[],sourceId:string,destination:RoleDestination) {
  const h=buildRoleHierarchy(input);
  if(h.warnings.length)throw new Error('Repair existing hierarchy errors before reordering.');
  const byId=new Map(h.nodes.map(n=>[n.id,n]));
  const source=byId.get(sourceId);
  if(!source)throw new Error('Role no longer exists.');
  let category:RoleCategory,parentId:string|null,targetIndex:number;
  let target:RoleNode|undefined;
  if(destination.type==='root'){
    category=destination.category;
    parentId=null;
  }else{
    target=byId.get(destination.id);
    if(!target)throw new Error('Drop target no longer exists.');
    if(target.id===source.id)throw new Error('A role cannot be moved onto itself.');
    if(hierarchyPath(h.nodes,target.id).has(source.id)){
      throw new Error('Cannot move a role into one of its descendants.');
    }
    category=target.category as RoleCategory;
    parentId=destination.placement==='inside'?target.id:(target.parentId||null);
  }
  if(!ROLE_CATEGORIES.includes(category))throw new Error('Invalid destination category.');
  const originKey=keyOf(source.category,source.parentId);
  const destinationKey=keyOf(category,parentId);
  const siblings=(key:string)=>h.nodes.filter(n=>keyOf(n.category,n.parentId)===key).sort(stableSort);
  const origin=siblings(originKey).filter(n=>n.id!==source.id);
  const dest=originKey===destinationKey?origin:siblings(destinationKey).filter(n=>n.id!==source.id);
  if(!target || destination.type==='root' || destination.placement==='inside'){
    targetIndex=dest.length;
  }else {
    const hit=dest.findIndex(n=>n.id===target!.id);
    if(hit<0)throw new Error('Destination role is not in its expected branch.');
    targetIndex=hit+(destination.placement==='after'?1:0);
  }
  const relocated={...source,category,parentId};
  const result=dest.slice();
  result.splice(targetIndex,0,relocated);
  const changes=new Map<string,RoleNode>();
  const applySiblings=(arr:RoleNode[])=>{
    arr.forEach((n,index)=>{
      const old=byId.get(n.id)!;
      if(old.order!==index || old.parentId!==n.parentId || old.category!==n.category){
        changes.set(n.id,{...n,order:index});
      }
    });
  };
  if(originKey!==destinationKey)applySiblings(origin);
  applySiblings(result);
  // A moved branch must belong to the same category as every ancestor.
  // Move descendant category values together; never change their parent links.
  if(source.category!==category){
    const walk=(parent:string)=>{
      for(const child of h.children.get(parent)||[]){
        const current=changes.get(child.id)||child;
        changes.set(child.id,{...current,category});
        walk(child.id);
      }
    };
    walk(source.id);
  }
  return { changes:[...changes.values()], movedRole:relocated,
    nodes:h.nodes.map(n=>changes.get(n.id)||n) };
}

export function isDescendant(nodes:RoleNode[],candidateId:string,parentId:string){
  return hierarchyPath(nodes,candidateId).has(parentId);
}

export function flattenHierarchy(nodes:RoleNode[],category:RoleCategory){
  const h=buildRoleHierarchy(nodes);
  const out:Array<{node:RoleNode;depth:number}>=[];
  const walk=(list:RoleNode[],depth:number)=>{
    for(const node of list){
      out.push({node,depth});
      walk(h.children.get(node.id)||[],depth+1);
    }
  };
  walk(h.roots.get(category)||[],0);
  return out;
}
