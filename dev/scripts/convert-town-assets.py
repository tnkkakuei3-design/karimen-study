# Run with the downloaded Kenney packs and Poly Haven originals in /tmp/town-assets.
from pathlib import Path
from PIL import Image
import json,math,shutil
out=Path('drive/assets/external')
for src,name,size in [('asphalt.jpg','asphalt.webp',(512,512)),('wall.jpg','plaster.webp',(512,512)),('sky.jpg','sky.webp',(1024,512))]:
 im=Image.open('/tmp/town-assets/'+src).convert('RGB');im=im.resize(size,Image.Resampling.LANCZOS);im.save(out/name,quality=82,method=6)
def convert(pack,name,target):
 root=Path('/tmp/town-assets')/pack/'Models/OBJ format';materials={};cur=None;tex=None
 for line in (root/(name+'.mtl')).read_text().splitlines():
  a=line.split()
  if not a:continue
  if a[0]=='newmtl':cur=a[1];materials[cur]=[1,1,1]
  if a[0]=='Kd':materials[cur]=list(map(float,a[1:4]))
  if a[0]=='map_Kd':tex=Image.open(root/' '.join(a[1:])).convert('RGB')
 v=[];uv=[];groups={};group='body';material=next(iter(materials));tris=0
 for line in (root/(name+'.obj')).read_text().splitlines():
  a=line.split()
  if not a:continue
  if a[0]=='v':v.append(list(map(float,a[1:4])))
  elif a[0]=='vt':uv.append(list(map(float,a[1:3])))
  elif a[0]=='g':group=a[1]
  elif a[0]=='usemtl':material=a[1]
  elif a[0]=='f':
   g=groups.setdefault(group,{'positions':[],'colors':[]});face=[p.split('/') for p in a[1:]]
   for i in range(1,len(face)-1):
    for p in [face[0],face[i],face[i+1]]:
     g['positions']+=v[int(p[0])-1];c=materials[material]
     if tex:
      u,w=uv[int(p[1])-1];c=[q/255 for q in tex.getpixel((min(tex.width-1,max(0,int(u*tex.width))),min(tex.height-1,max(0,int((1-w)*tex.height)))))]
     g['colors'] += [round(q/12.92 if q<=.04045 else ((q+.055)/1.055)**2.4,4) for q in c]
    tris+=1
 for g in groups.values():g['positions']=[round(q,5) for q in g['positions']]
 (out/target).write_text(json.dumps({'groups':groups},separators=(',',':')))
 print(name,tris,'triangles',len(v),'source vertices', 'bounds',[(min(p[i] for p in v),max(p[i] for p in v)) for i in range(3)])
convert('cars','sedan','sedan.json');convert('nature','tree_detailed','tree.json');convert('nature','rock_smallA','rock.json')
for pack in ['cars','nature']:shutil.copy('/tmp/town-assets/'+pack+'/License.txt',out/('kenney-'+pack+'-license.txt'))
for p in out.iterdir():print(p.name,p.stat().st_size)
