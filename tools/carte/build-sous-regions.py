import json,subprocess,numpy as np,os
G=json.load(open('adm1.geojson'))
GR={'normandie':('FR',"Calvados,Eure,Manche,Orne,Seine-Maritime"),
 'anjou':('FR',"Maine-et-Loire,Mayenne,Sarthe,Indre-et-Loire"),
 'poitou':('FR',"Vienne,Deux-Sèvres,Vendée,Charente-Maritime,Charente"),
 'limousin':('FR',"Haute-Vienne,Corrèze,Creuse,Dordogne,Lot"),
 'toulouse':('FR',"Haute-Garonne,Tarn,Tarn-et-Garonne,Aude,Hérault,Gard,Aveyron,Lozère"),
 'picardie':('FR',"Somme"),
 'brabant':('BE,NL',"Antwerp,Brussels,Flemish Brabant,Walloon Brabant,Noord-Brabant"),
 'hollande':('NL',"Noord-Holland,Zuid-Holland,Zeeland"),
 'luxembourg':('LU,BE',"Diekirch,Grevenmacher,Luxembourg")}
feats=[]
for k,(iso,names) in GR.items():
    ns=set(names.split(','));isos=iso.split(',')
    for f in G['features']:
        p=f['properties']
        if p.get('iso_a2') in isos and p.get('name') in ns:
            feats.append({'type':'Feature','properties':{'g':k},'geometry':f['geometry']})
json.dump({'type':'FeatureCollection','features':feats},open('sel.geojson','w'))
subprocess.run(['../node_modules/.bin/mapshaper','sel.geojson','-dissolve','g','-filter-islands','min-area=300km2','-simplify','dp','interval=3500','keep-shapes','-o','out.geojson','force'],check=True)
O=json.load(open('out.geojson'))
R=6371.0
def proj(ll):
    ll=np.array(ll);lam=np.radians(ll[:,0]-6.0);phi=np.radians(ll[:,1]);p0=np.radians(48.0)
    k=np.sqrt(2/(1+np.sin(p0)*np.sin(phi)+np.cos(p0)*np.cos(phi)*np.cos(lam)))
    return np.c_[R*k*np.cos(phi)*np.sin(lam),-R*k*(np.cos(p0)*np.sin(phi)-np.sin(p0)*np.cos(phi)*np.cos(lam))]
Rp={};C={}
for f in O['features']:
    g=f['geometry'];polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    d='';big=None
    for poly in polys:
        q=np.round(proj(poly[0])).astype(int);pts=[]
        for x,y in q:
            if not pts or pts[-1]!=(x,y):pts.append((x,y))
        if len(pts)<4:continue
        d+='M'+' '.join(f'{x},{y}' for x,y in pts[:-1])+'Z'
        if big is None or len(pts)>len(big):big=pts
    a=np.array(big);Rp[f['properties']['g']]=d;C[f['properties']['g']]=[int((a[:,0].min()+a[:,0].max())/2),int((a[:,1].min()+a[:,1].max())/2)]
json.dump({'R':Rp,'C':C},open('sub.json','w'),separators=(',',':'))
print({k:len(v) for k,v in Rp.items()},C,os.path.getsize('sub.json'))
