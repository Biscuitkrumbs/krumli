import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {catalogue,partById,occupied,planPlacement} from './model.js';

const $=id=>document.getElementById(id);
const host=$('viewport');
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}
catch(error){$('loading').textContent='This studio needs WebGL. Try a current browser with hardware acceleration enabled.';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
host.appendChild(renderer.domElement);$('loading').remove();
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(37,1,1,2000);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=145;controls.maxDistance=850;
controls.maxPolarAngle=Math.PI*.9;controls.minPolarAngle=.1;
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
const env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xdffcff,0x748891,2));
for(const [pos,intensity,color] of [[[120,180,160],160000,0xfff1d9],[[-150,60,140],100000,0xbbefff],[[0,150,-120],140000,0xffffff]]){
 const light=new THREE.PointLight(color,intensity);light.position.set(...pos);scene.add(light);
}
const body=new THREE.Group();scene.add(body);
// A smooth display bust, in millimetres. Neck and shoulder profile form one surface.
const profile=[new THREE.Vector2(0,-106),new THREE.Vector2(77,-106),new THREE.Vector2(93,-98),new THREE.Vector2(108,-75),new THREE.Vector2(117,-52),new THREE.Vector2(113,-31),new THREE.Vector2(95,-10),new THREE.Vector2(68,8),new THREE.Vector2(43,22),new THREE.Vector2(36,43),new THREE.Vector2(34,90),new THREE.Vector2(31,99),new THREE.Vector2(0,99)];
const smoothProfile=new THREE.SplineCurve(profile).getPoints(110);
const bustGeometry=new THREE.LatheGeometry(smoothProfile,80);
const bustMaterial=new THREE.MeshPhysicalMaterial({color:0xb8d3d8,transparent:true,opacity:.19,roughness:.65,metalness:.05,side:THREE.FrontSide,depthWrite:false});
const bust=new THREE.Mesh(bustGeometry,bustMaterial);bust.scale.z=.65;body.add(bust);
const wireGeometry=new THREE.LatheGeometry(profile,28);
const wire=new THREE.Mesh(wireGeometry,new THREE.MeshBasicMaterial({color:0x91b6c0,wireframe:true,transparent:true,opacity:.15,depthWrite:false}));wire.scale.z=.65;wire.visible=false;body.add(wire);
const plinth=new THREE.Mesh(new THREE.CylinderGeometry(78,81,4,80),new THREE.MeshStandardMaterial({color:0x607d83,metalness:.4,roughness:.45}));plinth.scale.z=.65;plinth.position.y=-109;body.add(plinth);
let state={length:450,type:'drape',baseStyle:'chain',baseMaterial:'gold',items:[]};
let nextId=1,chosen='round8',appearance={colour:'#7dc7c0',finish:'ceramic'},mode='place',selected=null;
const history=[];
let curve,pathGroup=new THREE.Group(),partsGroup=new THREE.Group(),ghostGroup=new THREE.Group();
scene.add(pathGroup,partsGroup,ghostGroup);
let meshes=[],ghostKey='',pendingPositions=null;
const golds={gold:'#d7ae63',silver:'#d2e0e7',rose:'#dda58e',black:'#37444e'};
function material(a){
 const options={color:a.colour,roughness:.2,metalness:.05};
 if(a.finish==='pearl')Object.assign(options,{roughness:.24,metalness:.2,iridescence:.35,iridescenceIOR:1.3});
 if(a.finish==='metal')Object.assign(options,{metalness:1,roughness:.16});
 if(a.finish==='glass')Object.assign(options,{transmission:.65,thickness:4,roughness:.08,ior:1.48});
 if(a.finish==='matte')Object.assign(options,{metalness:0,roughness:.88});
 return new THREE.MeshPhysicalMaterial({...options,clearcoat:a.finish==='ceramic'?.8:.2});
}
function geometry(p){
 const {width:w,height:h,depth:d}=p.dimensions;let g;
 if(p.shape==='cube')g=new THREE.BoxGeometry(w,h,d);
 else if(p.shape==='disc'){g=new THREE.CylinderGeometry(h/2,h/2,w,40);g.rotateZ(Math.PI/2);}
 else if(p.shape==='pendant'){
  const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(-2,-4,-w/2,-9,-w/2,-15);s.bezierCurveTo(-w/2,-23,w/2,-23,w/2,-15);s.bezierCurveTo(w/2,-9,2,-4,0,0);
  g=new THREE.ExtrudeGeometry(s,{depth:d-2,bevelEnabled:true,bevelThickness:1,bevelSize:1,bevelSegments:3,steps:1,curveSegments:24});
  g.computeBoundingBox();const bounds=g.boundingBox,size=bounds.getSize(new THREE.Vector3());
  g.translate(-((bounds.min.x+bounds.max.x)/2),-bounds.max.y,-((bounds.min.z+bounds.max.z)/2));g.scale(w/size.x,(h-6.5)/size.y,d/size.z);g.translate(0,-4,0);
 }else{g=new THREE.SphereGeometry(1,32,24);g.scale(w/2,h/2,d/2);}
 return g;
}
const geometries=Object.fromEntries(catalogue.map(p=>[p.id,geometry(p)]));
const bailGeometry=new THREE.TorusGeometry(2.5,.75,8,24);
function partObject(item,ghost=false){
 const p=partById[item.catalogueId],group=new THREE.Group();
 const mat=material(item.appearance);if(ghost){mat.transparent=true;mat.opacity=.45;mat.transmission=0;mat.depthWrite=false;}
 const main=new THREE.Mesh(geometries[p.id],mat);group.add(main);
 if(p.anchor==='centre'){
  const bail=new THREE.Mesh(bailGeometry,new THREE.MeshStandardMaterial({color:golds[state.baseMaterial],metalness:.9,roughness:.2,transparent:ghost,opacity:ghost?.45:1}));bail.position.y=-.75;group.add(bail);
 }
 group.userData.itemId=item.id;group.traverse(o=>o.userData.itemId=item.id);
 return group;
}
function placeObject(obj,item){
 obj.position.copy(curve.getPointAt(item.t));
 if(partById[item.catalogueId].anchor!=='centre')obj.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),curve.getTangentAt(item.t).normalize());
}
function clearGroup(group,disposeGeometry=false){
 for(const child of [...group.children]){child.traverse(o=>{if(o.material)o.material.dispose();if((disposeGeometry||o.type==='BoxHelper')&&o.geometry)o.geometry.dispose();});group.remove(child);}
}
function makeCurve(){
 const points=[];const drop=state.type==='collar'?14:state.type==='v'?66:48;
 for(let i=0;i<160;i++){
  const a=i/160*Math.PI*2,front=(1+Math.cos(a))/2;
  const y=state.type==='v'?34-drop*Math.pow(front,3):34-drop*front;
  points.push(new THREE.Vector3(Math.sin(a)*60,y,Math.cos(a)*58));
 }
 const initial=new THREE.CatmullRomCurve3(points,true,'centripetal');
 const scale=state.length/initial.getLength();
 // Scale about the rear neckline, retaining a stable shoulder reference.
 for(const p of points){p.x*=scale;p.z*=scale;p.y=34+(p.y-34)*scale;}
 curve=new THREE.CatmullRomCurve3(points,true,'centripetal');curve.arcLengthDivisions=1600;curve.updateArcLengths();
}
function rebuild(){
 makeCurve();clearGroup(pathGroup,true);clearGroup(partsGroup);clearGroup(ghostGroup);ghostKey='';
 const baseColour=golds[state.baseMaterial];
 const mat=new THREE.MeshStandardMaterial({color:baseColour,metalness:state.baseStyle==='cord'?0:.95,roughness:state.baseStyle==='cord'?.9:.24});
 const radius=state.baseStyle==='cord'?1.05:state.baseStyle==='wire'?.45:.35;
 pathGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve,360,radius,8,true),mat));
 if(state.baseStyle==='chain'){
  const count=Math.round(state.length/2.4),g=new THREE.TorusGeometry(.95,.23,5,10),chain=new THREE.InstancedMesh(g,mat.clone(),count);
  const dummy=new THREE.Object3D(),q=new THREE.Quaternion();
  for(let i=0;i<count;i++){
   const t=i/count;dummy.position.copy(curve.getPointAt(t));
   dummy.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),curve.getTangentAt(t));
   q.setFromAxisAngle(new THREE.Vector3(1,0,0),i%2?Math.PI/2:0);dummy.quaternion.multiply(q);dummy.scale.set(1.4,1,1);dummy.updateMatrix();chain.setMatrixAt(i,dummy.matrix);
  }pathGroup.add(chain);
 }
 meshes=[];
 for(const item of state.items){const obj=partObject(item);placeObject(obj,item);partsGroup.add(obj);meshes.push(...obj.children);if(item.id===selected){const box=new THREE.BoxHelper(obj,0x8bffce);partsGroup.add(box);}}
 updateUI();
}
function checkpoint(){history.push(structuredClone(state));if(history.length>60)history.shift();$('undo').disabled=false;}
function updateUI(){
 $('length').value=state.length/10;$('length-value').textContent=state.length/10+' cm';$('type').value=state.type;$('base-style').value=state.baseStyle;$('base-material').value=state.baseMaterial;
 $('count').textContent=state.items.length;$('occupied').textContent=occupied(state.items)+' / '+state.length+' mm';const pct=Math.round(occupied(state.items)/state.length*100);$('percent').textContent=pct+'%';$('meter').style.width=pct+'%';
 $('undo').disabled=!history.length;$('remove').disabled=selected===null;$('clear').disabled=!state.items.length;
 $('place').classList.toggle('active',mode==='place');$('select').classList.toggle('active',mode==='select');$('place').setAttribute('aria-pressed',mode==='place');$('select').setAttribute('aria-pressed',mode==='select');
 $('appearance-title').textContent=selected!==null?'SELECTED PART APPEARANCE':'NEW PART APPEARANCE';
 const item=state.items.find(x=>x.id===selected),p=partById[item?item.catalogueId:chosen];
 $('selection-info').textContent=(item?'Selected: ':'')+p.name+' · '+Object.values(p.dimensions).join(' × ')+' mm';
 $('hint').textContent=mode==='place'?'Click the strand to place · Drag to orbit · Scroll to zoom':'Click a part to select · Delete to remove · Drag to orbit';
}
let toastTimer;function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800);}
function setMode(value){mode=value;selected=null;clearGroup(ghostGroup);ghostKey='';rebuild();}
function setAppearance(next){
 appearance={...appearance,...next};$('colour').value=appearance.colour;$('hex').textContent=appearance.colour.toUpperCase();$('finish').value=appearance.finish;
 const item=state.items.find(x=>x.id===selected);if(item){checkpoint();item.appearance={...appearance};rebuild();}
 ghostKey='';
}
// Render catalogue tiles with the same geometry and lighting as the workbench.
const thumbRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});thumbRenderer.setSize(180,100);thumbRenderer.setPixelRatio(1);thumbRenderer.toneMapping=THREE.ACESFilmicToneMapping;thumbRenderer.toneMappingExposure=1.2;
const thumbScene=new THREE.Scene();thumbScene.environment=scene.environment;thumbScene.add(new THREE.HemisphereLight(0xffffff,0x788d83,3));
const thumbCamera=new THREE.PerspectiveCamera(32,1.8,.1,200);thumbCamera.position.set(20,13,45);thumbCamera.lookAt(0,0,0);
for(const p of catalogue){
 const item={catalogueId:p.id,appearance:{colour:p.anchor?'#c8a161':'#88bbb1',finish:p.anchor?'metal':'ceramic'}};
 const obj=partObject(item);if(p.anchor)obj.position.y=12;thumbScene.add(obj);thumbRenderer.render(thumbScene,thumbCamera);
 const button=document.createElement('button');button.className='tile'+(p.id===chosen?' active':'');button.setAttribute('aria-pressed',p.id===chosen);button.dataset.part=p.id;
 const img=document.createElement('img');img.src=thumbRenderer.domElement.toDataURL();img.alt='';button.append(img);
 const title=document.createElement('strong');title.textContent=p.name;button.append(title);const detail=document.createElement('small');detail.textContent=p.shape==='sphere'?p.dimensions.width+' mm':p.dimensions.width+' × '+p.dimensions.height+' mm';button.append(detail);
 button.onclick=()=>{chosen=p.id;setMode('place');document.querySelectorAll('.tile').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);});if(p.anchor)toast('Click the strand to add a pendant at the centre.');};
 $('library').append(button);thumbScene.remove(obj);obj.traverse(o=>{if(o.material)o.material.dispose();});
}thumbRenderer.dispose();
for(const colour of ['#7dc7c0','#f4e9d7','#d7ae63','#c05b61','#3b6594','#252f3b']){const b=document.createElement('button');b.className='swatch';b.style.background=colour;b.setAttribute('aria-label','Use colour '+colour);b.onclick=()=>setAppearance({colour});$('swatches').append(b);}
$('colour').addEventListener('input',e=>{$('hex').textContent=e.target.value.toUpperCase();});$('colour').addEventListener('change',e=>setAppearance({colour:e.target.value}));$('finish').onchange=e=>setAppearance({finish:e.target.value});
$('place').onclick=()=>setMode('place');$('select').onclick=()=>setMode('select');
$('undo').onclick=()=>{if(!history.length)return;state=history.pop();selected=null;rebuild();toast('Undone.');};
function removeSelected(){if(selected===null)return;checkpoint();state.items=state.items.filter(p=>p.id!==selected);selected=null;rebuild();toast('Part removed.');}
$('remove').onclick=removeSelected;$('clear').onclick=()=>{if(!state.items.length)return;checkpoint();state.items=[];selected=null;rebuild();toast('Strand cleared. Undo brings everything back.');};
for(const [id,key] of [['type','type'],['base-style','baseStyle'],['base-material','baseMaterial']])$(id).onchange=e=>{checkpoint();state[key]=e.target.value;rebuild();};
let lengthEditing=false;
$('length').addEventListener('input',e=>{if(!lengthEditing){checkpoint();lengthEditing=true;}state.length=Number(e.target.value)*10;rebuild();});
$('length').addEventListener('change',()=>{lengthEditing=false;const overlaps=state.items.some((a,i)=>state.items.some((b,j)=>j>i&&Math.min(Math.abs(a.t-b.t),1-Math.abs(a.t-b.t))*state.length<(partById[a.catalogueId].strandWidth+partById[b.catalogueId].strandWidth)/2));if(overlaps)toast('Shorter strand: some parts now overlap. Remove parts or undo.');});
$('mirror').onchange=()=>{ghostKey='';};
$('view').onchange=e=>{const v=e.target.value;body.visible=v!=='hidden';bust.visible=v!=='wire';wire.visible=v==='wire';bustMaterial.opacity=v==='solid'?1:.19;bustMaterial.transparent=v!=='solid';bustMaterial.depthWrite=v==='solid';bustMaterial.needsUpdate=true;};
function resetCamera(){camera.position.set(145,58,340);controls.target.set(0,-5,0);controls.update();}
$('front').onclick=()=>{camera.position.set(0,28,370);controls.target.set(0,-5,0);controls.update();};resetCamera();
const pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster();let down=null;
function nearestPath(event){
 const rect=renderer.domElement.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;let best=Infinity,t=0;
 for(let i=0;i<800;i++){
  const p=curve.getPointAt(i/800).project(camera);if(p.z< -1||p.z>1)continue;
  const d=Math.hypot((p.x+1)*rect.width/2-x,(1-p.y)*rect.height/2-y);
  if(d<best){best=d;t=i/800;}
 }
 return best<32?t:null;
}
function preview(event){
 if(mode!=='place'||down){ghostGroup.visible=false;return;}
 const t=nearestPath(event);if(t===null){ghostGroup.visible=false;pendingPositions=null;renderer.domElement.style.cursor='grab';return;}
 pendingPositions=planPlacement(chosen,t,state.items,state.length,$('mirror').checked);
 renderer.domElement.style.cursor=pendingPositions?'crosshair':'not-allowed';
 const key=JSON.stringify([chosen,pendingPositions,appearance]);
 if(key!==ghostKey){clearGroup(ghostGroup);ghostKey=key;if(pendingPositions)for(const pos of pendingPositions){const item={catalogueId:chosen,t:pos,appearance};const obj=partObject(item,true);placeObject(obj,item);ghostGroup.add(obj);}}
 ghostGroup.visible=true;
}
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,button:e.button};ghostGroup.visible=false;});
renderer.domElement.addEventListener('pointermove',preview);
renderer.domElement.addEventListener('pointerleave',()=>{ghostGroup.visible=false;});
renderer.domElement.addEventListener('pointercancel',()=>{down=null;});
renderer.domElement.addEventListener('pointerup',e=>{
 const start=down;down=null;if(!start||start.button!==0||Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)return;
 if(mode==='select'){
  const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(meshes,false)[0];selected=hit?hit.object.userData.itemId:null;
  if(selected!==null){const item=state.items.find(p=>p.id===selected);appearance={...item.appearance};$('colour').value=appearance.colour;$('hex').textContent=appearance.colour.toUpperCase();$('finish').value=appearance.finish;}rebuild();return;
 }
 const t=nearestPath(e);if(t===null){toast('Click closer to the strand.');return;}
 const positions=planPlacement(chosen,t,state.items,state.length,$('mirror').checked);
 if(!positions){toast(partById[chosen].anchor?'The centre is occupied. Select and remove the centre part first.':'No space here. Try another spot on the strand.');return;}
 checkpoint();for(const pos of positions)state.items.push({id:nextId++,catalogueId:chosen,t:pos,appearance:{...appearance}});rebuild();toast(positions.length===2?'Matching pair placed.':'Part placed.');
});
window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$('undo').click();}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSelected();}else if(e.key==='Escape')setMode('select');});
// A small editable example opens the studio with scale and symmetry already visible.
state.items.push({id:nextId++,catalogueId:'pendant',t:0,appearance:{colour:'#d7ae63',finish:'metal'}});
for(const [offset,id,colour,finish] of [[.024,'round8','#f3e9d5','pearl'],[.047,'round12','#7dc7c0','ceramic'],[.071,'disc','#d7ae63','metal'],[.09,'round8','#f3e9d5','pearl'],[.112,'round8','#7dc7c0','ceramic']])for(const t of [offset,1-offset])state.items.push({id:nextId++,catalogueId:id,t,appearance:{colour,finish}});
rebuild();
new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(host);
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
