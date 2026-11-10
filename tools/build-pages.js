/* Génère les pages statiques (une par personnage), le plan du site et les données ouvertes
   à partir de index.html. Usage : node tools/build-pages.js   (nécessite playwright) */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'..');const SITE='https://lignages.org';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
(async()=>{
  const b=await chromium.launch();const pg=await b.newPage();
  await pg.route(/^https?:/,r=>r.abort());
  await pg.goto('file://'+path.join(ROOT,'index.html'));await pg.waitForTimeout(600);
  const D=await pg.evaluate(()=>({
    people:P.map(p=>({id:p.id,slug:SLUG[p.id],n:p.n,b:p.b,d:p.d,yrs:yrs(p),ap:!!p.ap,h:p.h,s:p.s,k:!!p.k,t:p.t||"",bio:p.bio||"",al:p.al||[],p:p.p,sp:p.sp||[],m:p.m||"",fa:p.fa||"",R:p.R,facts:FACTS[p.id]||[],wiki:WIKI[p.id]||""})),
    houses:Object.fromEntries(Object.entries(H).map(([k,v])=>[k,{n:v.n,c:v.c}])),
    kings:KINGS.map(k=>({n:k[0],a:k[1],z:k[2],h:k[3],id:k[4],x:k[5],solo:!!k[4]&&!/^(Les |Derniers |République)/.test(k[0])})),
    stories:STORIES.map(s=>({id:s.id,t:s.t,per:s.per,ids:[...new Set(s.steps.flatMap(e=>e.f||[]))]})),
    maudits:[...MAUDITS],lx:LX,druon:DRUON.map(d=>({t:d.t,y:d.y,per:d.per,pitch:d.pitch,cast:d.cast,ext:d.ext,n:d.rh.length})),parcours:PARCOURS.map(p=>({id:p.id,niv:p.niv,t:p.t,prog:p.prog,rep:p.rep,c:p.c,steps:p.steps.map(s=>({t:s.t,x:s.x,q:s.q,go:s.go}))}))}));
  D.kings.forEach((k,i)=>{k.kin='';const q=D.kings[i-1];});
  const kin=await pg.evaluate(ks=>ks.map((k,i)=>{const q=ks[i-1];if(!q||!q.solo||!k.solo)return '';const r=blood(q.id,k.id);return r?kinSentence(byId[q.id],byId[k.id],r):(alliance(q.id,k.id)||'')}),D.kings);
  D.kings.forEach((k,i)=>k.kin=kin[i].replace(/<[^>]+>/g,''));
  const kids=p=>D.people.filter(c=>c.p.includes(p.id)).sort((a,b)=>a.b-b.b);
  const url=p=>`/personnage/${p.slug}/`;
  const by={};D.people.forEach(p=>by[p.id]=p);
  const hslug=k=>D.houses[k].n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const hurl=k=>`/maison/${hslug(k)}/`;
  const maud=new Set(D.maudits);
  const LX=D.lx,LXI={};Object.keys(LX.P).forEach(k=>LXI[k]={t:[],s:[],b:[],d:[]});
  Object.entries(LX.W).forEach(([id,v])=>['b','d','t'].forEach((k,i)=>{if(v[i]&&by[id])LXI[v[i]][k].push(id)}));
  Object.entries(LX.S).forEach(([id,[sl]])=>{if(by[id])LXI[sl].s.push(id)});
  const lxN=sl=>new Set([].concat(...Object.values(LXI[sl]))).size;
  const lxPage=sl=>lxN(sl)>=2;
  const lxLink=sl=>lxPage(sl)?`<a href="/lieu/${sl}/">${esc(LX.P[sl][0])}</a>`:esc(LX.P[sl][0]);
  const link=p=>`<a href="${url(p)}">${esc(p.n)}</a> <span class="y">${esc(p.yrs)}</span>`;
  const list=(t,a)=>a.length?`<h2>${t}</h2><ul class="rel">${a.map(x=>`<li>${typeof x==='string'?esc(x):link(x)}</li>`).join('')}</ul>`:'';
  const clean=s=>s.replace(/<[^>]+>/g,'');
  const today=new Date().toISOString().slice(0,10);
  const head=(title,desc,canon,extra='',img='/og.png')=>`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}${canon}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="article"><meta property="og:url" content="${SITE}${canon}"><meta property="og:image" content="${SITE}${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:site_name" content="Lignages"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/pages.css">${extra}</head><body>
<header class="top"><a class="brand" href="/">Lignages</a><span>Rois de France et maisons d’Europe</span><a class="cta" href="/">Ouvrir l’arbre interactif</a></header><main>`;
  const foot=`</main><footer><p>Lignages est un site gratuit, sans publicité ni inscription. <a href="/#a-propos">Méthode et limites</a> · <a href="/personnages/">Tous les personnages</a> · <a href="/rois/">Liste des rois</a> · <a href="/lieux/">Lieux</a> · <a href="/rois-maudits/">Les Rois maudits</a> · <a href="/parcours/">Parcours 5e et 2de</a> · <a href="/data/lignages.json">Données ouvertes</a> · <a data-sig href="mailto:contact@lignages.org">Signaler une erreur</a></p></footer><script src="/pages.js" defer></script></body></html>`;
  let n=0;
  for(const p of D.people){
    const H=D.houses[p.h],par=p.p.map(i=>by[i]),sp=p.sp.map(i=>by[i]).filter(Boolean),ch=kids(p);
    const sib=[...new Set(par.flatMap(q=>kids(q)).filter(x=>x.id!==p.id))].sort((a,b)=>a.b-b.b);
    const title=`${p.n} (${p.yrs})${p.t?' — '+p.t:''} | Lignages`;
    const bio=clean(p.bio),desc=(bio.length>155?bio.slice(0,152).replace(/\s+\S*$/,'')+'…':bio)||`${p.n}, ${H.n}.`;
    const ld={"@context":"https://schema.org","@type":"Person",name:p.n,url:SITE+url(p),description:bio,...(p.ap?{}:{birthDate:String(p.b)}),...(p.d<2026?{deathDate:String(p.d)}:{}),gender:p.s==='m'?'Male':'Female',
      ...(p.al.length?{alternateName:p.al.map(clean)}:{}),...(p.t?{jobTitle:p.t}:{}),
      ...(par.length?{parent:par.map(x=>({"@type":"Person",name:x.n,url:SITE+url(x)}))}:{}),
      ...(sp.length?{spouse:sp.map(x=>({"@type":"Person",name:x.n,url:SITE+url(x)}))}:{}),
      ...(ch.length?{children:ch.map(x=>({"@type":"Person",name:x.n,url:SITE+url(x)}))}:{}),
      ...(p.wiki?{sameAs:['https://fr.wikipedia.org/wiki/'+encodeURIComponent(p.wiki.replace(/ /g,'_'))]}:{})};
    const bc={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Lignages",item:SITE+"/"},{"@type":"ListItem",position:2,name:"Personnages",item:SITE+"/personnages/"},{"@type":"ListItem",position:3,name:p.n,item:SITE+url(p)}]};
    const ki=D.kings.findIndex(k=>k.solo&&k.id===p.id),K=D.kings[ki],prev=D.kings[ki-1],next=D.kings[ki+1];
    const kl=k=>k.solo?`<a href="${url(by[k.id])}">${esc(k.n)}</a>`:esc(k.n);
    const succ=K?`<h2>Succession</h2><ul class="rel"><li>Règne : ${K.a}–${K.z}. ${esc(K.x)}</li>${prev?`<li>Avant : ${kl(prev)} <span class="y">${prev.a}–${prev.z}</span>${K.kin?'. '+esc(K.kin):''}</li>`:''}${next?`<li>Après : ${kl(next)} <span class="y">${next.a}–${next.z}</span>${next.kin?'. '+esc(next.kin):''}</li>`:''}<li><a href="/rois/">Toute la liste des rois de France</a></li></ul>`:'';
    const sts=D.stories.filter(s=>s.ids.includes(p.id));
    const recits=sts.length||maud.has(p.id)?`<h2>Dans les récits</h2><ul class="rel">${maud.has(p.id)?'<li>Personnage des <i>Rois maudits</i> de Maurice Druon.</li>':''}${sts.map(s=>`<li><a href="/#recit/${s.id}">${esc(s.t)}</a> <span class="y">${esc(s.per)}</span></li>`).join('')}</ul>`:'';
    const w=LX.W[p.id]||[],sc=LX.S[p.id];
    const lrows=[['Naissance',w[0]],['Sacre',sc&&sc[0],sc&&sc[1]],['Mort',w[1]],['Sépulture',w[2]]].filter(r=>r[1]);
    const lieux=lrows.length?`<h2>Lieux</h2><ul class="titles">${lrows.map(([t,sl,y])=>`<li><span>${t}</span><span>${lxLink(sl)}${y?', '+y:''}</span></li>`).join('')}</ul>`:'';
    const parents=[...par, ...(p.fa?['Père : '+clean(p.fa)]:[]), ...(p.m?['Mère : '+clean(p.m)]:[])];
    const html=head(title,desc,url(p),`<script type="application/ld+json">${JSON.stringify(ld)}</script><script type="application/ld+json">${JSON.stringify(bc)}</script>`,`/og/${p.slug}.jpg`)+`
<nav class="crumb"><a href="/">Lignages</a> › <a href="/personnages/">Personnages</a> › ${esc(p.n)}</nav>
<article style="--c:${H.c}">
<p class="house"><a href="${hurl(p.h)}">${esc(H.n)}</a>${p.k?' · a régné':''}</p>
<h1>${esc(p.n)}</h1>
<p class="dates">${esc(p.yrs)}${p.t?' · '+esc(p.t):''}</p>
${p.al.length?`<p class="al">Aussi : ${p.al.map(a=>esc(clean(a))).join(', ')}</p>`:''}
<p class="bio">${p.bio}</p>
<p><a class="btn" href="/#fiche/${p.slug}">Voir dans l’arbre interactif</a></p>
${p.facts.length?`<h2>Faits marquants</h2><ol class="facts">${p.facts.map(([y,t])=>`<li><b>${y}</b><span>${t}</span></li>`).join('')}</ol>`:''}
${p.R.length?`<h2>Titres</h2><ul class="titles">${p.R.map(([l,a,z])=>`<li><span>${esc(l)}</span><span class="y">${a}–${z>=2026?'':z}</span></li>`).join('')}</ul>`:''}
${succ}${lieux}${list('Parents',parents)}${list(sp.length>1?'Conjoints':'Conjoint',sp)}${list('Enfants',ch)}${list('Frères et sœurs',sib)}${recits}
<h2>Sources et vérification</h2><ul class="rel">${p.wiki?`<li><a href="${ld.sameAs[0]}" rel="noopener">Wikipédia : ${esc(p.wiki)}</a></li>`:''}<li>Filiation et mariages comparés à Wikidata le 8 novembre 2026. <a href="/#a-propos">Méthode et limites</a></li></ul>
<p><a class="sigbtn" data-sig href="mailto:contact@lignages.org?subject=${encodeURIComponent('Lignages – erreur sur « '+p.n+' »')}">✉ Signaler une erreur sur cette fiche</a></p>
</article>`+foot;
    const dir=path.join(ROOT,'personnage',p.slug);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html);n++;
  }
  // index des personnages, par maison
  const groups=Object.entries(D.houses).map(([k,h])=>[h,D.people.filter(p=>p.h===k).sort((a,b)=>a.b-b.b),k]).filter(g=>g[1].length);
  fs.mkdirSync(path.join(ROOT,'personnages'),{recursive:true});
  fs.writeFileSync(path.join(ROOT,'personnages','index.html'),head(`Tous les personnages (${D.people.length}) | Lignages`,`Les ${D.people.length} personnages de Lignages, classés par maison : rois de France, reines, princes et grandes familles d’Europe, de Clovis à aujourd’hui.`,'/personnages/')+
   `<nav class="crumb"><a href="/">Lignages</a> › Personnages</nav><article><h1>Tous les personnages</h1><p class="bio">${D.people.length} personnages, ${groups.length} maisons, de Clovis à aujourd’hui.</p>${groups.map(([h,a,k])=>`<section style="--c:${h.c}"><h2><a href="/maison/${hslug(k)}/">${esc(h.n)}</a></h2><ul class="rel cols">${a.map(p=>`<li>${link(p)}</li>`).join('')}</ul></section>`).join('')}</article>`+foot);
  // une page par maison
  for(const [h,a,k] of groups){
    const ks=D.kings.filter(x=>x.solo&&x.h===k),lo=Math.min(...a.map(p=>p.b)),living=a.some(p=>p.d>=2026),hi=Math.max(...a.map(p=>p.d));
    const desc=`${h.n} : ${a.length} personnage${a.length>1?'s':''} dans l’arbre de Lignages${ks.length?`, dont ${ks.length} roi${ks.length>1?'s':''} de France`:''}. Dates, liens de parenté et faits marquants.`;
    const dir=path.join(ROOT,'maison',hslug(k));fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),head(`${h.n} : généalogie et personnages | Lignages`,desc,hurl(k))+`<nav class="crumb"><a href="/">Lignages</a> › <a href="/personnages/">Personnages</a> › ${esc(h.n)}</nav>
<article style="--c:${h.c}"><p class="house">Maison</p><h1>${esc(h.n)}</h1><p class="dates">${a.length} personnage${a.length>1?'s':''} · nés entre ${lo} et ${Math.max(...a.map(p=>p.b))}${living?' · lignée vivante':''}</p>
<p><a class="btn" href="/">Voir dans l’arbre interactif</a></p>
${ks.length?`<h2>Rois de France</h2><ul class="titles">${ks.map(x=>`<li><span><a href="${url(by[x.id])}">${esc(x.n)}</a></span><span class="y">${x.a}–${x.z}</span></li>`).join('')}</ul>`:''}
<h2>Personnages</h2><ul class="rel">${a.map(p=>`<li>${link(p)}${p.t?' · '+esc(p.t):''}</li>`).join('')}</ul></article>`+foot);
  }
  // lieux
  const LK=[['t','Reposent ici'],['s','Sacrés ici'],['b','Nés ici'],['d','Morts ici']];
  const yr=(k,id)=>k==='s'?LX.S[id][1]:k==='b'?by[id].b:by[id].d;
  const lsl=Object.keys(LX.P).sort((a,b)=>lxN(b)-lxN(a)||LX.P[a][0].localeCompare(LX.P[b][0],'fr'));
  for(const sl of lsl.filter(lxPage)){const L=LX.P[sl],n=lxN(sl);
    const parts=LK.filter(([k])=>LXI[sl][k].length).map(([k,t])=>`${LXI[sl][k].length} ${t.toLowerCase().replace(' ici','')}`);
    const desc=`${L[0]} : ${n} personnages de l’arbre de Lignages y sont nés, sacrés, morts ou enterrés. Qui, et quand.`;
    const ld={"@context":"https://schema.org","@type":"Place",name:L[0],url:`${SITE}/lieu/${sl}/`,geo:{"@type":"GeoCoordinates",latitude:L[1],longitude:L[2]}};
    const dir=path.join(ROOT,'lieu',sl);fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),head(`${L[0]} : qui y est né, sacré, mort ou enterré | Lignages`,desc,`/lieu/${sl}/`,`<script type="application/ld+json">${JSON.stringify(ld)}</script>`)+`<nav class="crumb"><a href="/">Lignages</a> › <a href="/lieux/">Lieux</a> › ${esc(L[0])}</nav>
<article><p class="house">Lieu</p><h1>${esc(L[0])}</h1><p class="dates">${n} personnages de l’arbre</p>
<p><a class="btn" href="/#lieu/${sl}">Ouvrir le mode visite</a></p>
${LK.map(([k,t])=>{const a=LXI[sl][k].slice().sort((x,y)=>yr(k,x)-yr(k,y));return a.length?`<h2>${t} (${a.length})</h2><ul class="titles">${a.map(id=>`<li><span><a href="${url(by[id])}">${esc(by[id].n)}</a></span><span class="y">${yr(k,id)}</span></li>`).join('')}</ul>`:''}).join('')}
<h2>Y aller</h2><ul class="rel"><li><a href="https://www.openstreetmap.org/?mlat=${L[1]}&amp;mlon=${L[2]}#map=15/${L[1]}/${L[2]}" rel="noopener">Voir sur une carte</a></li><li>Certains monuments ont disparu ou ne se visitent pas : vérifiez avant de vous déplacer.</li><li>Naissances, morts et sépultures : Wikidata, relevé du 10 novembre 2026. Sacres saisis à la main.</li></ul></article>`+foot);}
  fs.mkdirSync(path.join(ROOT,'lieux'),{recursive:true});
  fs.writeFileSync(path.join(ROOT,'lieux','index.html'),head(`Les lieux des rois de France : naissances, sacres, sépultures | Lignages`,`${lsl.length} lieux où les personnages de Lignages sont nés, ont été sacrés, sont morts ou reposent : Saint-Denis, Reims, Fontainebleau, Westminster, l’Escorial…`,'/lieux/')+
   `<nav class="crumb"><a href="/">Lignages</a> › Lieux</nav><article><h1>Les lieux</h1><p class="bio">${lsl.length} lieux de naissance, de sacre, de mort et de sépulture.</p><p><a class="btn" href="/#lieux">Ouvrir le mode visite</a></p>
<ul class="titles">${lsl.map(sl=>`<li><span>${lxLink(sl)}</span><span class="y">${lxN(sl)}</span></li>`).join('')}</ul></article>`+foot);
  // compagnon de lecture : seul le tome 1 est présenté, pour ne rien dévoiler
  { const d1=D.druon[0];fs.mkdirSync(path.join(ROOT,'rois-maudits'),{recursive:true});
    fs.writeFileSync(path.join(ROOT,'rois-maudits','index.html'),head('Les Rois maudits : compagnon de lecture tome par tome, sans divulgâcher | Lignages','Un compagnon pour lire Les Rois maudits de Maurice Druon : qui est qui au début de chaque tome, sans rien dévoiler, puis ce qui relève du roman et ce qui relève de l’histoire.','/rois-maudits/')+
    `<nav class="crumb"><a href="/">Lignages</a> › Les Rois maudits</nav><article style="--c:#b03a2e"><p class="house">Compagnon de lecture</p><h1>Les Rois maudits, tome par tome</h1>
<p class="bio">Sept romans de Maurice Druon, parus de 1955 à 1977. Pour chacun : qui est qui à la première page, sans rien dévoiler de la suite. Le tome fini : ce que Druon a inventé, et ce que disent les historiens.</p>
<p><a class="btn" href="/#rois-maudits">Ouvrir le compagnon</a></p>
<h2>Les sept tomes</h2><ul class="titles">${D.druon.map((d,i)=>`<li><span><a href="/#rois-maudits/${i+1}">${i+1}. ${esc(d.t)}</a></span><span class="y">${d.per} · paru en ${d.y}</span></li>`).join('')}</ul>
<h2>Tome 1 : ${esc(d1.t)}</h2><p class="bio">${esc(d1.pitch)}</p>
<h2>Qui est qui, à la première page</h2><ul class="rel">${d1.cast.map(([id,r])=>`<li><b>${esc(by[id].n)}</b> · ${esc(r)}</li>`).join('')}${d1.ext.map(([a,r])=>`<li><b>${esc(a)}</b>${r?' · '+esc(r):''}</li>`).join('')}</ul>
<p class="y">Les noms ne mènent pas aux fiches : elles donnent les dates de mort. Les tomes suivants s’ouvrent dans le compagnon, qui les garde masqués tant que vous n’y êtes pas.</p>
<h2>Roman ou histoire ?</h2><p>${D.druon.reduce((a,d)=>a+d.n,0)} points passés au crible, répartis sur les sept tomes : la malédiction des Templiers, la tour de Nesle, les poisons, le fer rouge… Ils s’affichent quand vous marquez un tome comme lu.</p>
<p class="y">Textes rédigés pour Lignages, sans citation du roman.</p></article>`+foot); }
  // parcours pour la classe
  { fs.mkdirSync(path.join(ROOT,'parcours'),{recursive:true});
    fs.writeFileSync(path.join(ROOT,'parcours','index.html'),head('Parcours d’histoire 5e et 2de : rois de France, État monarchique, séances prêtes à projeter | Lignages','Trois parcours calés sur les programmes d’histoire de 5e et de seconde : l’affirmation de l’État monarchique, du Prince de la Renaissance au roi absolu, l’État à l’époque moderne. Des étapes, une vue interactive, une question.','/parcours/')+
    `<nav class="crumb"><a href="/">Lignages</a> › Parcours</nav><article><p class="house">En classe</p><h1>Parcours calés sur les programmes</h1>
<p class="bio">Des séances prêtes à projeter. À chaque étape : une vue de l’arbre ou de la carte à ouvrir, et une question. Les réponses sont dans la version interactive.</p>
<p><a class="btn" href="/#parcours">Ouvrir les parcours</a></p>
${D.parcours.map(p=>`<section style="--c:${p.c}"><h2>${esc(p.niv)} · ${esc(p.t)}</h2><p class="y">${esc(p.prog)} ${esc(p.rep)}</p><ol class="kings">${p.steps.map(s=>`<li style="--c:${p.c}"><b>${esc(s.t)}</b><p>${esc(s.x)}</p><p class="kin">${esc(s.q)}</p><p><a href="/#${s.go}">Ouvrir la vue</a></p></li>`).join('')}</ol><p><a href="/#parcours/${p.id}">Voir ce parcours avec les réponses</a></p></section>`).join('')}
<p class="y">Intitulés tirés des programmes en vigueur (Éduscol). Les parcours et les questions sont ceux de Lignages, pas des documents officiels.</p></article>`+foot); }
  // liste des rois
  fs.mkdirSync(path.join(ROOT,'rois'),{recursive:true});
  const kld={"@context":"https://schema.org","@type":"ItemList",name:"Rois de France",itemListElement:D.kings.filter(k=>k.solo).map((k,i)=>({"@type":"ListItem",position:i+1,name:k.n,url:SITE+url(by[k.id])}))};
  fs.writeFileSync(path.join(ROOT,'rois','index.html'),head('Liste des rois de France, de Clovis à Louis-Philippe : qui succède à qui | Lignages','Tous les rois de France dans l’ordre, de Clovis (481) à Louis-Philippe (1848), avec les dates de règne et le lien de parenté entre chaque roi et son prédécesseur.','/rois/',`<script type="application/ld+json">${JSON.stringify(kld)}</script>`)+
   `<nav class="crumb"><a href="/">Lignages</a> › Rois de France</nav><article><h1>Les rois de France</h1><p class="bio">De Clovis à Louis-Philippe. Pour chaque roi : son règne, et son lien de parenté avec celui qui le précède.</p><p><a class="btn" href="/#rois">Voir la frise des règnes</a></p>
<ol class="kings">${D.kings.map(k=>`<li style="--c:${D.houses[k.h]?D.houses[k.h].c:'var(--line)'}"><b>${k.solo?`<a href="${url(by[k.id])}">${esc(k.n)}</a>`:esc(k.n)}</b> <span class="y">${k.a}–${k.z}</span>${k.kin?`<p class="kin">${esc(k.kin)}</p>`:''}<p>${esc(k.x)}</p></li>`).join('')}</ol></article>`+foot);
  // image de partage par personnage
  if(!process.argv.includes('--no-og')){
    fs.mkdirSync(path.join(ROOT,'og'),{recursive:true});
    const fav=fs.readFileSync(path.join(ROOT,'favicon.svg'),'utf8');const fl=(fav.match(/<path[^>]*>/)||[''])[0];
    const og=await b.newPage({viewport:{width:1200,height:630}});
    for(const p of D.people){const H=D.houses[p.h];const fs1=p.n.length>26?72:p.n.length>18?88:108;
      await og.setContent(`<body style="margin:0;width:1200px;height:630px;background:#0c1631;color:#ece7da;font-family:'Liberation Serif','DejaVu Serif',serif;position:relative;overflow:hidden">
<div style="position:absolute;left:0;top:0;bottom:0;width:26px;background:${H.c}"></div>
<div style="position:absolute;left:90px;top:70px;font:700 26px 'Liberation Sans','DejaVu Sans',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#efc45a">${esc(H.n)}${p.k?' · a régné':''}</div>
<div style="position:absolute;left:90px;right:70px;top:150px;font-size:${fs1}px;line-height:1.05">${esc(p.n)}</div>
<div style="position:absolute;left:90px;right:70px;bottom:150px;font:34px 'Liberation Sans','DejaVu Sans',sans-serif;color:#a3adc9">${esc(p.yrs)}${p.t?' · '+esc(p.t):''}</div>
<svg viewBox="0 0 24 24" width="56" height="56" style="position:absolute;left:90px;bottom:54px"><circle cx="12" cy="12" r="12" fill="#172040" stroke="#efc45a" stroke-width=".5"/>${fl}</svg>
<div style="position:absolute;left:162px;bottom:60px;font-size:40px">Lignages</div>
<div style="position:absolute;right:70px;bottom:66px;font:26px 'Liberation Sans','DejaVu Sans',sans-serif;color:#a3adc9">lignages.org</div></body>`);
      await og.screenshot({path:path.join(ROOT,'og',p.slug+'.jpg'),type:'jpeg',quality:82});}
  }
  await b.close();
  // plan du site, robots, données ouvertes
  const urls=['/','/personnages/','/rois/','/lieux/','/rois-maudits/','/parcours/',...lsl.filter(lxPage).map(sl=>`/lieu/${sl}/`),...groups.map(g=>hurl(g[2])),...D.people.map(url)];
  fs.writeFileSync(path.join(ROOT,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`<url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(ROOT,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  fs.mkdirSync(path.join(ROOT,'data'),{recursive:true});
  fs.writeFileSync(path.join(ROOT,'data','lignages.json'),JSON.stringify({source:SITE,licence:"CC BY-SA 4.0",genere:today,maisons:D.houses,personnages:D.people.map(p=>({id:p.id,slug:p.slug,nom:p.n,naissance:p.b,mort:p.d>=2026?null:p.d,approximatif:p.ap,maison:p.h,sexe:p.s,titre:p.t,parents:p.p,conjoints:p.sp,titres:p.R,faits:p.facts,wikipedia:p.wiki}))},null,1));
  console.log(n+' pages, '+urls.length+' URL');
})();
