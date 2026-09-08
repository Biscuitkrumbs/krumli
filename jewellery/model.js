// Catalogue records describe manufactured geometry; appearances belong to instances.
// Millimetres throughout. hole.axis is the model-local threading direction.
export const catalogue=[
 {id:'round6',name:'Round bead',shape:'sphere',dimensions:{width:6,height:6,depth:6},hole:{diameter:1,axis:'x'},strandWidth:6},
 {id:'round8',name:'Round bead',shape:'sphere',dimensions:{width:8,height:8,depth:8},hole:{diameter:1.2,axis:'x'},strandWidth:8},
 {id:'round12',name:'Round bead',shape:'sphere',dimensions:{width:12,height:12,depth:12},hole:{diameter:1.5,axis:'x'},strandWidth:12},
 {id:'cube',name:'Cube',shape:'cube',dimensions:{width:8,height:8,depth:8},hole:{diameter:1.2,axis:'x'},strandWidth:8},
 {id:'disc',name:'Disc',shape:'disc',dimensions:{width:3,height:10,depth:10},hole:{diameter:1.2,axis:'x'},strandWidth:3},
 {id:'oval',name:'Oval',shape:'oval',dimensions:{width:12,height:8,depth:8},hole:{diameter:1.2,axis:'x'},strandWidth:12},
 {id:'pendant',name:'Drop pendant',shape:'pendant',dimensions:{width:13,height:23,depth:6},hole:{diameter:2,axis:'z'},strandWidth:5,anchor:'centre'}
];
export const partById=Object.fromEntries(catalogue.map(p=>[p.id,p]));
export const wrap=t=>((t%1)+1)%1;
export const distance=(a,b)=>Math.min(Math.abs(a-b),1-Math.abs(a-b));
export function occupied(items){return items.reduce((n,p)=>n+partById[p.catalogueId].strandWidth,0);}
export function fits(t,id,items,length){return items.every(p=>distance(wrap(t),p.t)*length>=(partById[id].strandWidth+partById[p.catalogueId].strandWidth)/2+1);}
export function planPlacement(id,t,items,length,mirror){
 const part=partById[id];
 if(part.anchor==='centre')return fits(0,id,items,length)?[0]:null;
 // Search within 20 mm of the clicked position, preserving exact mirror pairs.
 for(let offset=0;offset<=20;offset+=.5){
  for(const sign of offset?[1,-1]:[1]){
   const first=wrap(t+offset*sign/length), second=wrap(1-first);
   const positions=mirror&&distance(first,second)*length>part.strandWidth+1?[first,second]:[first];
   const trial=[...items];let valid=true;
   for(const pos of positions){if(!fits(pos,id,trial,length)){valid=false;break;}trial.push({catalogueId:id,t:pos});}
   if(valid)return positions;
  }
 }
 return null;
}
