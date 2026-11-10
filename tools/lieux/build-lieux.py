#!/usr/bin/env python3
"""Fabrique le bloc de données LX (lieux de naissance, de mort, de sépulture, de sacre)
à partir de l'extraction Wikidata (P19, P20, P119) et l'injecte dans index.html.
Les sacres ne viennent pas de Wikidata : ils sont saisis à la main ci-dessous."""
import re,json,unicodedata,os,sys
D=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.join(D,'..','..')
PL={}
for l in open(os.path.join(D,'wikidata-lieux.txt'),encoding='utf8').read().strip().split('\n'):
    q,lab,c=l.split('|');PL[q]=[lab,[float(x) for x in c.split(',')] if c else None]
# régions et pays : trop vagues pour une visite
DROP={'146246','70972','142','106577','47261','26385','18677767','191085','25','131825304','6121883','43114927','109692165'}
# rattachements : un quartier, une bataille, un bâtiment voisin
MERGE={'27759':'61765','1339583':'2601262','187153':'90','270230':'90','749573':'90','120227728':'2807'}
COORD={'21525871':[47.790,1.067],'12029517':[47.997,2.733]}
NAME={'1820536':'Les Juifs, près de Prasville','90':'Paris'}
# valeur retenue quand Wikidata en donne plusieurs, et corrections
PICK={('carloman2','d'):'209770',('jeannebg','d'):'711557',('othon4','t'):'1717300',('philippe6','d'):'501821'}
# ajouts hors Wikidata
PL['x_reims']=['cathédrale Notre-Dame de Reims',[49.2538,4.0341]]
PL['x_noyon']=['cathédrale Notre-Dame de Noyon',[49.5822,3.0007]]
PL['x_chartres']=['cathédrale Notre-Dame de Chartres',[48.4477,1.4878]]
PL['x_orleans']=['cathédrale Sainte-Croix d’Orléans',[47.9017,1.9100]]
R='x_reims'
SACRE={'pepinbref':('167152',751),'charlemagne':('x_noyon',768),'louispieux':(R,816),'charleschauve':('x_orleans',848),
 'huguescapet':('x_noyon',987),'robert2':('x_orleans',987),'henri1':(R,1027),'philippe1':(R,1059),'louis6':('x_orleans',1108),
 'louis7':(R,1131),'philippe2':(R,1179),'louis8':(R,1223),'louis9':(R,1226),'philippe3':(R,1271),'philippe4':(R,1286),
 'louis10':(R,1315),'philippe5':(R,1317),'charles4':(R,1322),'philippe6':(R,1328),'jean2':(R,1350),'charles5':(R,1364),
 'charles6':(R,1380),'charles7':(R,1429),'louis11':(R,1461),'charles8':(R,1484),'louis12':(R,1498),'francois1':(R,1515),
 'henri2':(R,1547),'francois2':(R,1559),'charles9':(R,1561),'henri3':(R,1575),'henri4':('x_chartres',1594),'louis13':(R,1610),
 'louis14':(R,1654),'louis15':(R,1722),'louis16':(R,1775),'charles10':(R,1825)}
LIVING={'felipe6','leonor','juancarlos','louisxx','jean1965','gaston'}
for q,c in COORD.items():PL[q][1]=c
for q,n in NAME.items():PL[q][0]=n
def ok(q):
    q=MERGE.get(q,q);return q if q in PL and q not in DROP and PL[q][1] else None
W={}
for l in open(os.path.join(D,'wikidata-personnes.txt'),encoding='utf8').read().strip().split('\n'):
    pid,*f=l.split('|')
    if pid in LIVING:continue
    out=[]
    for k,v in zip('bdt',f):
        qs=[x for x in v.split(',') if x]
        if (pid,k) in PICK:qs=[PICK[(pid,k)]]
        elif k=='t' and '184407' in qs:qs=['184407']
        qs=[ok(q) for q in qs];qs=[q for q in qs if q]
        out.append(qs[0] if qs else None)
    if any(out):W[pid]=out
def slug(s):
    s=unicodedata.normalize('NFD',s);s=''.join(c for c in s if unicodedata.category(c)!='Mn').lower()
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')
used=set(q for v in W.values() for q in v if q)|set(q for q,_ in SACRE.values())
sl={};seen=set()
for q in sorted(used,key=lambda q:PL[q][0]):
    s=slug(PL[q][0])
    while s in seen:s+='-2'
    seen.add(s);sl[q]=s
MON=re.compile(r'^(abbaye|basilique|cathédrale|château|chapelle|église|collégiale|couvent|palais|monastère|chartreuse|forteresse|tour|hôtel|dôme|crypte|panthéon|mausolée|cimetière|place|cloître|christ church|binnenhof|theobalds|claremont|much hadham|marlborough|monasterio|palacio)',re.I)
cap=lambda s:s[0].upper()+s[1:]
P={sl[q]:[cap(PL[q][0]),round(PL[q][1][0],3),round(PL[q][1][1],3),1 if MON.match(PL[q][0]) else 0] for q in used}
LX={'P':P,'W':{k:[sl[q] if q else 0 for q in v] for k,v in W.items()},'S':{k:[sl[q],y] for k,(q,y) in SACRE.items()}}
js='/*LIEUX-DATA*/const LX='+json.dumps(LX,ensure_ascii=False,separators=(',',':'))+';/*LIEUX-END*/'
f=os.path.join(ROOT,'index.html');h=open(f,encoding='utf8').read()
assert '/*LIEUX-DATA*/' in h
h=re.sub(r'/\*LIEUX-DATA\*/.*?/\*LIEUX-END\*/',lambda m:js,h,flags=re.S)
open(f,'w',encoding='utf8').write(h)
print(len(P),'lieux,',len(W),'personnes,',len(js),'octets')
