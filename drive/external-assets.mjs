import * as T from './vendor/three.module.min.js';
const base=new URL('./assets/external/',import.meta.url);
export function assetGeometry(data){const geometries=[];for(const [name,g]of Object.entries(data.groups)){if(!g.positions.length||g.positions.length!==g.colors.length||g.positions.length%9)throw new Error('Invalid asset');const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(g.positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(g.colors,3));geo.computeVertexNormals();geo.computeBoundingBox();geometries.push({name,geo});}return geometries;}
async function model(name){const response=await fetch(new URL(name,base),{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('Asset '+response.status);return assetGeometry(await response.json());}
function texture(name){return new Promise((resolve,reject)=>{new T.TextureLoader().load(new URL(name+'?v=2',base).href,t=>{t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;resolve(t);},undefined,reject);});}
// World-space projection keeps aggregate/plaster at a fixed scale on instanced boxes.
export function applySurface(material,map,metres){material.map=map;material.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec2 vSurfaceUv;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nvec4 surfacePoint=vec4(position,1.);vec3 surfaceNormal=normal;\n#ifdef USE_INSTANCING\nsurfacePoint=instanceMatrix*surfacePoint;surfaceNormal=mat3(instanceMatrix)*surfaceNormal;\n#endif\nsurfacePoint=modelMatrix*surfacePoint;surfaceNormal=abs(mat3(modelMatrix)*surfaceNormal);\nvSurfaceUv=(surfaceNormal.y>surfaceNormal.x&&surfaceNormal.y>surfaceNormal.z?surfacePoint.xz:(surfaceNormal.x>surfaceNormal.z?surfacePoint.zy:surfacePoint.xy))/${metres.toFixed(2)};`);
 shader.fragmentShader='varying vec2 vSurfaceUv;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replaceAll('vMapUv','vSurfaceUv'));
 };material.customProgramCacheKey=()=>`world-surface-${metres}`;material.needsUpdate=true;}
export function installExternalAssets({scene,renderer,materials,car,wheels,lamps,trunks,treeMeshes}){
 const status={};const jobs=[];
 jobs.push(Promise.all([texture('asphalt.webp'),texture('plaster.webp'),texture('paving.webp')]).then(([asphalt,plaster,paving])=>{for(const [color,m]of materials){if(color===0x555f62){m.color.setHex(0xdddddd);applySurface(m,asphalt,3);}else if([0xc8c2ae,0xd8ceb0].includes(color))applySurface(m,paving,2.2);else if([0xd5c5af,0xdfe1d9,0xc9d3d4,0xc5bba9].includes(color))applySurface(m,plaster,2.2);}status.surfaces=true;}));
 jobs.push(texture('sky.webp').then(t=>{t.mapping=T.EquirectangularReflectionMapping;t.wrapS=T.RepeatWrapping;t.wrapT=T.ClampToEdgeWrapping;if(!status.skyBackground)scene.background=t;scene.environment=t;scene.environmentIntensity=.4;scene.backgroundIntensity=.85;status.sky=true;}));
 jobs.push(texture('sky-background.webp').then(t=>{t.mapping=T.EquirectangularReflectionMapping;t.wrapT=T.ClampToEdgeWrapping;scene.background=t;status.skyBackground=true;}));
 jobs.push(model('sedan.json').then(parts=>{const root=new T.Group(),newWheels=[];root.rotation.y=Math.PI;root.scale.set(1.38,1.25,1.62);const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.08});
 for(const {name,geo}of parts){const mesh=new T.Mesh(geo,material);if(name.startsWith('wheel')){const center=geo.boundingBox.getCenter(new T.Vector3());geo.translate(-center.x,-center.y,-center.z);const pivot=new T.Group();pivot.position.copy(center);pivot.add(mesh);root.add(pivot);if(name.includes('front'))newWheels.push(pivot);}else root.add(mesh);}
 // Keep the existing brake lights and contact shadow; replace only the vehicle mesh.
 for(const child of car.children)if(!lamps.includes(child)&&!child.material?.transparent)child.visible=false;
 car.add(root);wheels.splice(0,wheels.length,...newWheels);status.car=true;
 }));
 jobs.push(model('tree.json').then(parts=>{const dummy=new T.Object3D(),material=new T.MeshLambertMaterial({vertexColors:true});for(const {geo}of parts){const mesh=new T.InstancedMesh(geo,material,trunks.length);trunks.forEach(([x,,z],i)=>{dummy.position.set(x,0,z);const seed=((i+1)*16807)%2147483647,variation=.82+(seed%997)/997*.36,scale=3.8*variation;dummy.scale.set(scale*(.92+(i%5)*.04),scale,scale);dummy.rotation.y=(seed%628)/100;mesh.setColorAt(i,new T.Color().setHSL(.02+(i%5)*.008,.08,.88+(i%4)*.025));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);}treeMeshes.forEach(m=>{scene.remove(m);});renderer.shadowMap.needsUpdate=true;status.trees=true;}));
 // Small stones remain inside the park planting area, outside driving lanes.
 jobs.push(model('rock.json').then(parts=>{const dummy=new T.Object3D();for(const {geo}of parts){const mesh=new T.InstancedMesh(geo,new T.MeshLambertMaterial({vertexColors:true}),6);for(let i=0;i<6;i++){dummy.position.set(-88+i*8,0,-84);dummy.scale.setScalar(1.2+(i%3)*.2);dummy.rotation.y=i;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.receiveShadow=true;scene.add(mesh);}status.props=true;}));
 return Promise.allSettled(jobs).then(results=>{results.forEach((r,i)=>{if(r.status==='rejected')console.warn('External scenery fallback',i,r.reason);});return status;});
}
