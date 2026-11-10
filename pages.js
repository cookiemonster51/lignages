// Pages simples : le lien « Signaler une erreur » ouvre un formulaire. Sans script, il reste un lien mail.
(function(){
  var links=document.querySelectorAll("a[data-sig]");if(!links.length||!window.fetch||!("showModal" in document.createElement("dialog")))return;
  var d=document.createElement("dialog");d.id="sig";d.setAttribute("aria-labelledby","sigT");
  d.innerHTML='<form novalidate><h2 id="sigT">Signaler une erreur</h2><p class="y" id="sigS"></p>'+
   '<label for="sigM">Qu’est-ce qui vous semble inexact ?</label><textarea id="sigM" rows="5" maxlength="3000"></textarea>'+
   '<label for="sigR">Votre source <span>(facultatif)</span></label><input id="sigR" type="text" maxlength="600" placeholder="Un livre, un article, une page…">'+
   '<label for="sigE">Votre adresse, si vous voulez une réponse <span>(facultatif)</span></label><input id="sigE" type="email" maxlength="160" autocomplete="email" placeholder="nom@exemple.fr">'+
   '<div class="sigx" aria-hidden="true"><label for="sigX">Ne pas remplir</label><input id="sigX" type="text" tabindex="-1" autocomplete="off"></div>'+
   '<p id="sigO" role="status" aria-live="polite"></p><p><button class="btn" type="submit">Envoyer</button> <button class="btn alt" type="button" id="sigC">Fermer</button></p>'+
   '<p class="y">Votre message part par e-mail à l’auteur du site. Rien d’autre n’est enregistré. <a id="sigA" href="#">Écrire plutôt par e-mail</a></p></form>';
  document.body.appendChild(d);
  var $=function(i){return document.getElementById(i)},t0=0,f=d.querySelector("form"),b=f.querySelector("button[type=submit]"),h1=document.querySelector("h1"),dates=document.querySelector(".dates");
  var sujet=(h1?h1.textContent.trim():document.title)+(document.querySelector('link[rel=canonical][href*="/personnage/"]')&&dates?" ("+dates.textContent.split("·")[0].trim()+")":"");
  function say(t,c){$("sigO").textContent=t;$("sigO").className=c;}
  [].forEach.call(links,function(a){a.addEventListener("click",function(e){e.preventDefault();t0=Date.now();$("sigS").textContent="Page : "+sujet;$("sigA").href=a.href;say("","");b.hidden=false;b.disabled=false;d.showModal();$("sigM").focus();});});
  $("sigC").addEventListener("click",function(){d.close();});
  d.addEventListener("click",function(e){if(e.target===d)d.close();});
  f.addEventListener("submit",function(e){e.preventDefault();
    var m=$("sigM").value.trim(),em=$("sigE").value.trim();
    if(m.length<10){say("Décrivez l’erreur en quelques mots.","err");$("sigM").focus();return;}
    if(em&&!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(em)){say("Cette adresse ne semble pas valide.","err");$("sigE").focus();return;}
    b.disabled=true;say("Envoi…","");
    function fail(){b.disabled=false;say("L’envoi n’a pas abouti. Réessayez, ou utilisez le lien « Écrire plutôt par e-mail » ci-dessous.","err");}
    fetch("/api/signaler",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sujet:sujet,page:location.pathname,message:m,source:$("sigR").value,email:em,site:$("sigX").value,t:Date.now()-t0})})
     .then(function(r){return r.json().catch(function(){return null}).then(function(j){
       if(r.ok&&j&&j.ok){say("Merci. Votre signalement est parti.","ok");f.reset();b.hidden=true;}
       else if(r.status===429){b.disabled=false;say("Trop de messages en peu de temps. Réessayez dans quelques minutes.","err");}
       else fail();});}).catch(fail);
  });
})();
