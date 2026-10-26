import assert from 'node:assert/strict';
import {buildRoleHierarchy,moveRole,ROLE_CATEGORIES} from '../src/lib/role-hierarchy';

const n=(id:string,category:string,order:number,parentId:string|null=null)=>({
 id,name:id,category,order,parentId
});
const starting=[
 n('free-a','free',0),n('free-b','free',1),n('free-c','free',2),
 n('b-child','free',0,'free-b'),n('b-grandchild','free',0,'b-child'),
 n('trial-a','trial',0),n('trial-b','trial',1)
];
function assertDense(nodes:typeof starting) {
 const map=new Map<string,number[]>();
 for(const item of nodes){
   const key=item.parentId||'root:'+item.category;
   const list=map.get(key)||[];
   list.push(item.order);map.set(key,list);
 }
 for(const ranks of map.values()){
   const sorted=ranks.sort((a,b)=>a-b);
   assert.deepEqual(sorted,sorted.map((_,i)=>i));
 }
}
function get(nodes:typeof starting,id:string){
 const x=nodes.find(n=>n.id===id);
 assert.ok(x,id+' must exist');return x;
}
{
 const x=moveRole(starting,'free-a',{type:'node',id:'free-c',placement:'after'});
 assert.deepEqual(buildRoleHierarchy(x.nodes).roots.get('free')?.map(v=>v.id),
  ['free-b','free-c','free-a']);
 assertDense(x.nodes);
 assert.equal(get(x.nodes,'b-child').parentId,'free-b');
}
{
 const x=moveRole(starting,'free-c',{type:'node',id:'free-b',placement:'inside'});
 assert.equal(get(x.nodes,'free-c').parentId,'free-b');
 assert.deepEqual(buildRoleHierarchy(x.nodes).children.get('free-b')?.map(v=>v.id),
  ['b-child','free-c']);
 assertDense(x.nodes);
}
{
 const x=moveRole(starting,'free-b',{type:'root',category:'trial'});
 for(const id of ['free-b','b-child','b-grandchild']){
  assert.equal(get(x.nodes,id).category,'trial');
 }
 assert.equal(get(x.nodes,'free-b').parentId,null);
 assert.equal(get(x.nodes,'b-child').parentId,'free-b');
 assert.deepEqual(buildRoleHierarchy(x.nodes).roots.get('trial')?.map(v=>v.id),
  ['trial-a','trial-b','free-b']);
 assertDense(x.nodes);
}
{
 const x=moveRole(starting,'b-child',{type:'node',id:'free-b',placement:'after'});
 assert.equal(get(x.nodes,'b-child').parentId,null);
 assert.equal(get(x.nodes,'b-grandchild').parentId,'b-child');
 assertDense(x.nodes);
}
assert.throws(()=>moveRole(starting,'free-b',{type:'node',id:'b-grandchild',placement:'inside'}),
 /descendants/);
assert.throws(()=>moveRole(starting,'free-b',{type:'node',id:'free-b',placement:'inside'}),
 /itself/);
assert.deepEqual(moveRole(starting,'trial-b',{type:'root',category:'trial'}).changes,[]);
assert.equal(buildRoleHierarchy([...starting,n('orphan','free',3,'missing')]).warnings.length,1);
assert.equal(buildRoleHierarchy([...starting,n('cycle-a','trial',2,'cycle-b'),n('cycle-b','trial',3,'cycle-a')]).warnings.length,2);
assert.deepEqual(ROLE_CATEGORIES,['free','trial','membership','organization','admin']);
console.log('Role hierarchy checks passed: ordering, nesting, move subtree, cycle prevention, and category invariants.');
