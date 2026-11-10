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
    houses:Object.fromEntries(Object.entries(H).map(([k,v])=>[k,{n:v.n,c:v.c}]))}));
  await b.close();
  const by={};D.people.forEach(p=>by[p.id]=p);
  const kids=p=>D.people.filter(c=>c.p.includes(p.id)).sort((a,b)=>a.b-b.b);
  const url=p=>`/personnage/${p.slug}/`;
  const link=p=>`<a href="${url(p)}">${esc(p.n)}</a> <span class="y">${esc(p.yrs)}</span>`;
  const list=(t,a)=>a.length?`<h2>${t}</h2><ul class="rel">${a.map(x=>`<li>${typeof x==='string'?esc(x):link(x)}</li>`).join('')}</ul>`:'';
  const clean=s=>s.replace(/<[^>]+>/g,'');
  const today=new Date().toISOString().slice(0,10);
  const head=(title,desc,canon,extra='')=>`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}${canon}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="article"><meta property="og:url" content="${SITE}${canon}"><meta property="og:image" content="${SITE}/og.png"><meta property="og:site_name" content="Lignages"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/pages.css">${extra}</head><body>
<header class="top"><a class="brand" href="/">Lignages</a><span>Rois de France et maisons d’Europe</span><a class="cta" href="/">Ouvrir l’arbre interactif</a></header><main>`;
  const foot=`</main><footer><p>Lignages est un site gratuit, sans publicité ni inscription. <a href="/#a-propos">Méthode et limites</a> · <a href="/personnages/">Tous les personnages</a> · <a href="/data/lignages.json">Données ouvertes</a> · <a href="mailto:contact@lignages.org">Signaler une erreur</a></p></footer></body></html>`;
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
    const parents=[...par, ...(p.fa?['Père : '+clean(p.fa)]:[]), ...(p.m?['Mère : '+clean(p.m)]:[])];
    const html=head(title,desc,url(p),`<script type="application/ld+json">${JSON.stringify(ld)}</script><script type="application/ld+json">${JSON.stringify(bc)}</script>`)+`
<nav class="crumb"><a href="/">Lignages</a> › <a href="/personnages/">Personnages</a> › ${esc(p.n)}</nav>
<article style="--c:${H.c}">
<p class="house">${esc(H.n)}${p.k?' · a régné':''}</p>
<h1>${esc(p.n)}</h1>
<p class="dates">${esc(p.yrs)}${p.t?' · '+esc(p.t):''}</p>
${p.al.length?`<p class="al">Aussi : ${p.al.map(a=>esc(clean(a))).join(', ')}</p>`:''}
<p class="bio">${p.bio}</p>
<p><a class="btn" href="/#fiche/${p.slug}">Voir dans l’arbre interactif</a></p>
${p.facts.length?`<h2>Faits marquants</h2><ol class="facts">${p.facts.map(([y,t])=>`<li><b>${y}</b><span>${t}</span></li>`).join('')}</ol>`:''}
${p.R.length?`<h2>Titres</h2><ul class="titles">${p.R.map(([l,a,z])=>`<li><span>${esc(l)}</span><span class="y">${a}–${z>=2026?'':z}</span></li>`).join('')}</ul>`:''}
${list('Parents',parents)}${list(sp.length>1?'Conjoints':'Conjoint',sp)}${list('Enfants',ch)}${list('Frères et sœurs',sib)}
<h2>Sources et vérification</h2><ul class="rel">${p.wiki?`<li><a href="${ld.sameAs[0]}" rel="noopener">Wikipédia : ${esc(p.wiki)}</a></li>`:''}<li>Filiation et mariages comparés à Wikidata le 8 novembre 2026. <a href="/#a-propos">Méthode et limites</a></li></ul>
</article>`+foot;
    const dir=path.join(ROOT,'personnage',p.slug);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html);n++;
  }
  // index des personnages, par maison
  const groups=Object.entries(D.houses).map(([k,h])=>[h,D.people.filter(p=>p.h===k).sort((a,b)=>a.b-b.b)]).filter(g=>g[1].length);
  fs.mkdirSync(path.join(ROOT,'personnages'),{recursive:true});
  fs.writeFileSync(path.join(ROOT,'personnages','index.html'),head(`Tous les personnages (${D.people.length}) | Lignages`,`Les ${D.people.length} personnages de Lignages, classés par maison : rois de France, reines, princes et grandes familles d’Europe, de Clovis à aujourd’hui.`,'/personnages/')+
   `<nav class="crumb"><a href="/">Lignages</a> › Personnages</nav><article><h1>Tous les personnages</h1><p class="bio">${D.people.length} personnages, ${groups.length} maisons, de Clovis à aujourd’hui.</p>${groups.map(([h,a])=>`<section style="--c:${h.c}"><h2>${esc(h.n)}</h2><ul class="rel cols">${a.map(p=>`<li>${link(p)}</li>`).join('')}</ul></section>`).join('')}</article>`+foot);
  // plan du site, robots, données ouvertes
  const urls=['/','/personnages/',...D.people.map(url)];
  fs.writeFileSync(path.join(ROOT,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`<url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(ROOT,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  fs.mkdirSync(path.join(ROOT,'data'),{recursive:true});
  fs.writeFileSync(path.join(ROOT,'data','lignages.json'),JSON.stringify({source:SITE,licence:"CC BY-SA 4.0",genere:today,maisons:D.houses,personnages:D.people.map(p=>({id:p.id,slug:p.slug,nom:p.n,naissance:p.b,mort:p.d>=2026?null:p.d,approximatif:p.ap,maison:p.h,sexe:p.s,titre:p.t,parents:p.p,conjoints:p.sp,titres:p.R,faits:p.facts,wikipedia:p.wiki}))},null,1));
  console.log(n+' pages, '+urls.length+' URL');
})();
