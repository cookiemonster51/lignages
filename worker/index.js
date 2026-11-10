// Lignages : reçoit le formulaire « Signaler une erreur » et l'envoie par e-mail à l'auteur.
// Rien n'est stocké. Aucun contenu n'est écrit dans les journaux.
const MAX = { sujet: 160, page: 240, message: 3000, source: 600, email: 160 };
const hits = new Map(); // limite de fréquence, au mieux : par instance du Worker

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, n);
const oneLine = (v, n) => clean(v, n).replace(/[\r\n]+/g, " ");

function tooMany(ip) {
  const now = Date.now(), a = (hits.get(ip) || []).filter((t) => now - t < 600000);
  if (a.length >= 5) { hits.set(ip, a); return true; }
  a.push(now); hits.set(ip, a);
  if (hits.size > 5000) hits.clear();
  return false;
}

export async function signaler(request, env) {
  const url = new URL(request.url);
  if (request.method !== "POST") return json({ ok: false, error: "methode" }, 405);
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== url.host) return json({ ok: false, error: "origine" }, 403);
  const raw = await request.text();
  if (raw.length > 12000) return json({ ok: false, error: "trop_long" }, 413);
  let d; try { d = JSON.parse(raw); } catch { return json({ ok: false, error: "format" }, 400); }
  if (!d || typeof d !== "object") return json({ ok: false, error: "format" }, 400);
  // Robots : champ piège rempli, ou formulaire envoyé en moins de trois secondes. On répond « ok » sans rien envoyer.
  if (clean(d.site, 50) || !(Number(d.t) >= 3000)) return json({ ok: true });
  const message = clean(d.message, MAX.message);
  if (message.length < 10) return json({ ok: false, error: "message_court" }, 400);
  const email = oneLine(d.email, MAX.email);
  if (email && !/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i.test(email)) return json({ ok: false, error: "email" }, 400);
  if (tooMany(request.headers.get("cf-connecting-ip") || "?")) return json({ ok: false, error: "frequence" }, 429);
  if (!env.MAIL || !env.MAIL_TO) return json({ ok: false, error: "non_configure" }, 503);

  const sujet = oneLine(d.sujet, MAX.sujet) || "le site", page = oneLine(d.page, MAX.page), source = clean(d.source, MAX.source);
  const text = [
    `Signalement sur : ${sujet}`,
    page ? `Vue : ${url.origin}/${page.replace(/^\/+/, "")}` : "",
    "", "Ce qui semble inexact :", message,
    "", "Source indiquée :", source || "(aucune)",
    "", email ? `Réponse souhaitée à : ${email}` : "Pas d'adresse de réponse.",
    "", "Envoyé par le formulaire de lignages.org.",
  ].filter((l) => l !== null).join("\n");
  const from = env.MAIL_FROM || "formulaire@lignages.org";
  const m = { to: env.MAIL_TO, from: { email: from, name: "Lignages" }, subject: `[Lignages] Signalement : ${sujet}`, text };
  if (email) m.replyTo = email;
  try {
    await env.MAIL.send(m);
    return json({ ok: true });
  } catch (e) {
    console.log("signaler: envoi refusé", e && e.code ? e.code : "erreur");
    return json({ ok: false, error: "envoi", code: (e && e.code) || null }, 502);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/signaler") {
      try { return await signaler(request, env); } catch { return json({ ok: false, error: "interne" }, 500); }
    }
    if (pathname.startsWith("/api/")) return json({ ok: false, error: "inconnu" }, 404);
    return env.ASSETS.fetch(request);
  },
};
