import express from "express";
import session from "express-session";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

function env(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const SUPABASE_URL = env("SUPABASE_URL").replace(/\/$/, "");
const SUPABASE_ANON_KEY = env("SUPABASE_ANON_KEY");
const CMS_ADMIN_TOKEN = env("CMS_ADMIN_TOKEN");
const ADMIN_EMAIL = env("ADMIN_EMAIL").toLowerCase();
const ADMIN_PASSWORD_SCRYPT = env("ADMIN_PASSWORD_SCRYPT");
const SESSION_SECRET = env("SESSION_SECRET");
const PORT = Number(process.env.PORT || 3000);
const production = process.env.NODE_ENV === "production";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function checked(value) {
  return value ? "checked" : "";
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function verifyPassword(password) {
  const [saltHex, expectedHex] = ADMIN_PASSWORD_SCRYPT.split(":");
  if (!saltHex || !expectedHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function rest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "x-spacecall-admin-token": CMS_ADMIN_TOKEN,
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${text || response.statusText}`);
  }
  return text ? JSON.parse(text) : null;
}

function csrf(req) {
  return `<input type="hidden" name="csrf" value="${escapeHtml(req.session.csrf || "")}">`;
}

function page(title, content, req) {
  const authed = Boolean(req.session?.auth);
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · Space Call Admin</title>
<style>
:root{color-scheme:dark;--bg:#070b14;--panel:#0e1625;--panel2:#111c2e;--line:#23314a;--text:#f8fafc;--muted:#91a0b8;--accent:#4ea1ff;--ok:#27c499;--danger:#ff5f74}*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Tahoma,Arial,sans-serif;background:radial-gradient(circle at top,#10284b 0,#070b14 36rem);color:var(--text)}a{color:inherit;text-decoration:none}.shell{width:min(1180px,calc(100% - 24px));margin:auto;padding:18px 0 48px}.top{position:sticky;top:0;z-index:20;background:rgba(7,11,20,.88);backdrop-filter:blur(18px);border-bottom:1px solid var(--line)}.topin{width:min(1180px,calc(100% - 24px));margin:auto;display:flex;align-items:center;gap:10px;min-height:64px}.brand{font-weight:900;letter-spacing:.2px;margin-left:auto}.brand span{color:var(--accent)}nav{display:flex;gap:6px;overflow:auto}.chip,.btn{border:1px solid var(--line);background:var(--panel);color:var(--text);padding:10px 13px;border-radius:12px;font-weight:700;cursor:pointer}.btn.primary{background:var(--accent);border-color:var(--accent);color:#05111f}.btn.danger{color:#ffd6dc;border-color:#6a2633;background:#2b1118}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.card{background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:0 16px 40px #0004}.card h2,.card h3{margin:0 0 8px}.muted{color:var(--muted);font-size:13px}.section{margin-top:18px}.row{display:grid;grid-template-columns:repeat(12,1fr);gap:10px;align-items:end}.field{grid-column:span 4;display:flex;flex-direction:column;gap:6px}.field.wide{grid-column:span 8}.field.full{grid-column:1/-1}label{font-size:12px;color:var(--muted);font-weight:800}input,textarea,select{width:100%;background:#08111f;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:10px 11px;outline:none}textarea{min-height:86px;resize:vertical}input:focus,textarea:focus,select:focus{border-color:var(--accent)}.toggle{display:flex;align-items:center;gap:8px;padding:9px 0}.toggle input{width:auto}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.preview{width:100%;aspect-ratio:16/7;object-fit:cover;border-radius:12px;border:1px solid var(--line);background:#030712}.login{min-height:100vh;display:grid;place-items:center;padding:22px}.loginbox{width:min(430px,100%);background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:24px;box-shadow:0 30px 80px #0008}.loginbox h1{margin:0 0 6px}.error{background:#3a151d;border:1px solid #7f2f3e;color:#ffd8de;padding:10px 12px;border-radius:10px;margin:12px 0}.ok{color:var(--ok)}@media(max-width:850px){.grid{grid-template-columns:1fr 1fr}.field,.field.wide{grid-column:span 6}}@media(max-width:560px){.grid{grid-template-columns:1fr}.row{display:block}.field,.field.wide,.field.full{margin-top:10px}.topin{display:block;padding:10px 0}.brand{margin-bottom:8px}nav{padding-bottom:2px}.card{padding:14px}}
</style>
</head>
<body>
${authed ? `<header class="top"><div class="topin"><div class="brand">Space <span>Call</span> Admin</div><nav><a class="chip" href="/admin">الرئيسية</a><a class="chip" href="/admin/settings">النصوص</a><a class="chip" href="/admin/hero">Hero</a><a class="chip" href="/admin/navigation">الأيقونات والتنقل</a><a class="chip" href="/admin/sections">الأقسام</a></nav></div></header>` : ""}
${content}
</body></html>`;
}

const app = express();
app.disable("x-powered-by");
if (production) app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: false, limit: "256kb" }));
app.use(
  session({
    name: "spacecall_admin_live",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: production, sameSite: "lax", maxAge: 8 * 60 * 60 * 1000 },
  }),
);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "space-call-admin-live" }));
app.get("/", (_req, res) => res.redirect("/admin"));

app.get("/admin/login", (req, res) => {
  if (req.session.auth) return res.redirect("/admin");
  const error = req.query.error ? `<div class="error">بيانات الدخول غير صحيحة</div>` : "";
  res.send(page("تسجيل الدخول", `<main class="login"><form class="loginbox" method="post" action="/admin/login"><h1>Space Call Admin</h1><p class="muted">لوحة التحكم بالمحتوى والتصميم</p>${error}<div class="field full"><label>البريد / اسم الدخول</label><input name="email" type="email" required autocomplete="username"></div><div class="field full"><label>كلمة المرور</label><input name="password" type="password" required autocomplete="current-password"></div><div class="actions"><button class="btn primary" type="submit">دخول</button></div></form></main>`, req));
});

app.post("/admin/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (email !== ADMIN_EMAIL || !verifyPassword(password)) return res.redirect("/admin/login?error=1");
  req.session.auth = true;
  req.session.csrf = randomBytes(24).toString("hex");
  res.redirect("/admin");
});

function requireAuth(req, res, next) {
  if (!req.session.auth) return res.redirect("/admin/login");
  next();
}

function requireCsrf(req, res, next) {
  if (!req.session.csrf || req.body.csrf !== req.session.csrf) return res.status(403).send("Invalid CSRF token");
  next();
}

app.use("/admin", requireAuth);

app.post("/admin/logout", requireCsrf, (req, res) => req.session.destroy(() => res.redirect("/admin/login")));

app.get("/admin", async (req, res, next) => {
  try {
    const [settings, hero, nav, sections] = await Promise.all([
      rest("cms_site_settings?select=key"),
      rest("cms_hero_slides?select=id"),
      rest("cms_navigation_items?select=id"),
      rest("cms_sections?select=id"),
    ]);
    const body = `<main class="shell"><section><h1>لوحة تحكم Space Call</h1><p class="muted">غيّر المحتوى من هنا بدون تعديل الكود.</p></section><section class="grid section"><a class="card" href="/admin/settings"><h2>${settings.length}</h2><div class="muted">نص وإعداد</div></a><a class="card" href="/admin/hero"><h2>${hero.length}</h2><div class="muted">Hero slides</div></a><a class="card" href="/admin/navigation"><h2>${nav.length}</h2><div class="muted">أيقونة / زر تنقل</div></a><a class="card" href="/admin/sections"><h2>${sections.length}</h2><div class="muted">قسم قابل للتحكم</div></a></section><section class="card section"><h3>الحالة</h3><p class="ok">● متصل مباشرة بـ Supabase CMS</p><p class="muted">التغييرات تحفظ فورًا في قاعدة بيانات الموقع.</p><form method="post" action="/admin/logout">${csrf(req)}<button class="btn" type="submit">تسجيل الخروج</button></form></section></main>`;
    res.send(page("الرئيسية", body, req));
  } catch (error) { next(error); }
});

app.get("/admin/settings", async (req, res, next) => {
  try {
    const rows = await rest("cms_site_settings?select=*&order=group_name.asc,key.asc");
    const cards = rows.map((item) => `<form class="card section" method="post" action="/admin/settings/${encodeURIComponent(item.key)}">${csrf(req)}<div class="row"><div class="field"><label>Key</label><input value="${escapeHtml(item.key)}" disabled></div><div class="field"><label>المجموعة</label><input name="group_name" value="${escapeHtml(item.group_name || "general")}"></div><div class="field"><label>النوع</label><select name="value_type">${["text","number","boolean","json","image","icon","url"].map(v => `<option value="${v}" ${item.value_type === v ? "selected" : ""}>${v}</option>`).join("")}</select></div><div class="field wide"><label>الاسم الظاهر</label><input name="label" value="${escapeHtml(item.label || "")}"></div><div class="field full"><label>القيمة</label><textarea name="value_text">${escapeHtml(item.value_text || "")}</textarea></div><div class="field full"><label>JSON اختياري</label><textarea name="value_json">${escapeHtml(item.value_json ? JSON.stringify(item.value_json, null, 2) : "")}</textarea></div><div class="field"><label class="toggle"><input type="checkbox" name="is_public" ${checked(item.is_public)}> ظاهر للموقع</label></div></div><div class="actions"><button class="btn primary" type="submit">حفظ</button></div></form>`).join("");
    const create = `<form class="card section" method="post" action="/admin/settings/new">${csrf(req)}<h3>إضافة إعداد جديد</h3><div class="row"><div class="field"><label>Key</label><input name="key" required></div><div class="field"><label>Label</label><input name="label"></div><div class="field"><label>Group</label><input name="group_name" value="general"></div><div class="field"><label>Type</label><select name="value_type"><option>text</option><option>url</option><option>image</option><option>json</option></select></div><div class="field full"><label>Value</label><textarea name="value_text"></textarea></div></div><div class="actions"><button class="btn primary">إضافة</button></div></form>`;
    res.send(page("النصوص والإعدادات", `<main class="shell"><h1>النصوص والإعدادات</h1><p class="muted">عدّل النصوص والقيم العامة التي يقرأها الموقع.</p>${create}${cards}</main>`, req));
  } catch (error) { next(error); }
});

app.post("/admin/settings/new", requireCsrf, async (req, res, next) => {
  try {
    await rest("cms_site_settings", { method: "POST", body: JSON.stringify({ key: String(req.body.key || "").trim(), label: req.body.label || null, group_name: req.body.group_name || "general", value_type: req.body.value_type || "text", value_text: req.body.value_text || null, is_public: true }) });
    res.redirect(303, "/admin/settings");
  } catch (error) { next(error); }
});

app.post("/admin/settings/:key", requireCsrf, async (req, res, next) => {
  try {
    let valueJson = null;
    if (String(req.body.value_json || "").trim()) valueJson = JSON.parse(String(req.body.value_json));
    await rest(`cms_site_settings?key=eq.${encodeURIComponent(req.params.key)}`, { method: "PATCH", body: JSON.stringify({ label: req.body.label || null, group_name: req.body.group_name || "general", value_type: req.body.value_type || "text", value_text: req.body.value_text || null, value_json: valueJson, is_public: req.body.is_public === "on", updated_at: new Date().toISOString() }) });
    res.redirect(303, "/admin/settings");
  } catch (error) { next(error); }
});

app.get("/admin/hero", async (req, res, next) => {
  try {
    const rows = await rest("cms_hero_slides?select=*&order=sort_order.asc,created_at.asc");
    const form = (item, isNew = false) => `<form class="card section" method="post" action="${isNew ? "/admin/hero/new" : `/admin/hero/${item.id}`}">${csrf(req)}<h3>${isNew ? "Hero جديد" : escapeHtml(item.title || "Hero")}</h3>${!isNew && item.image_url ? `<img class="preview" src="${escapeHtml(item.image_url)}" alt="">` : ""}<div class="row"><div class="field"><label>العنوان</label><input name="title" value="${escapeHtml(item.title || "")}"></div><div class="field wide"><label>الوصف</label><input name="subtitle" value="${escapeHtml(item.subtitle || "")}"></div><div class="field wide"><label>صورة Desktop</label><input name="image_url" type="url" required value="${escapeHtml(item.image_url || "")}"></div><div class="field"><label>صورة Mobile</label><input name="mobile_image_url" type="url" value="${escapeHtml(item.mobile_image_url || "")}"></div><div class="field"><label>نص الزر</label><input name="button_label" value="${escapeHtml(item.button_label || "")}"></div><div class="field"><label>نوع الرابط</label><select name="target_type">${["none","collection","product","url"].map(v => `<option value="${v}" ${item.target_type === v ? "selected" : ""}>${v}</option>`).join("")}</select></div><div class="field"><label>قيمة الرابط</label><input name="target_value" value="${escapeHtml(item.target_value || "")}"></div><div class="field"><label>الترتيب</label><input name="sort_order" type="number" value="${toInt(item.sort_order)}"></div><div class="field"><label>يبدأ</label><input name="starts_at" type="datetime-local" value="${item.starts_at ? escapeHtml(item.starts_at.slice(0,16)) : ""}"></div><div class="field"><label>ينتهي</label><input name="ends_at" type="datetime-local" value="${item.ends_at ? escapeHtml(item.ends_at.slice(0,16)) : ""}"></div><div class="field"><label class="toggle"><input name="is_published" type="checkbox" ${checked(item.is_published)}> منشور</label></div></div><div class="actions"><button class="btn primary" type="submit">${isNew ? "إضافة" : "حفظ"}</button>${!isNew ? `<button class="btn danger" formmethod="post" formaction="/admin/hero/${item.id}/delete" onclick="return confirm('حذف هذا الهيرو؟')">حذف</button>` : ""}</div></form>`;
    res.send(page("Hero", `<main class="shell"><h1>Hero</h1><p class="muted">غيّر الصور، النص، الرابط، الترتيب ووقت الظهور.</p>${form({ target_type:"none", sort_order:rows.length, is_published:false }, true)}${rows.map(x => form(x)).join("")}</main>`, req));
  } catch (error) { next(error); }
});

function heroPayload(body) {
  return { title: body.title || null, subtitle: body.subtitle || null, image_url: body.image_url, mobile_image_url: body.mobile_image_url || null, button_label: body.button_label || null, target_type: body.target_type || "none", target_value: body.target_value || null, sort_order: toInt(body.sort_order), is_published: body.is_published === "on", starts_at: body.starts_at ? new Date(body.starts_at).toISOString() : null, ends_at: body.ends_at ? new Date(body.ends_at).toISOString() : null, updated_at: new Date().toISOString() };
}
app.post("/admin/hero/new", requireCsrf, async (req,res,next)=>{try{await rest("cms_hero_slides",{method:"POST",body:JSON.stringify(heroPayload(req.body))});res.redirect(303,"/admin/hero");}catch(e){next(e);}});
app.post("/admin/hero/:id", requireCsrf, async (req,res,next)=>{try{await rest(`cms_hero_slides?id=eq.${encodeURIComponent(req.params.id)}`,{method:"PATCH",body:JSON.stringify(heroPayload(req.body))});res.redirect(303,"/admin/hero");}catch(e){next(e);}});
app.post("/admin/hero/:id/delete", requireCsrf, async (req,res,next)=>{try{await rest(`cms_hero_slides?id=eq.${encodeURIComponent(req.params.id)}`,{method:"DELETE"});res.redirect(303,"/admin/hero");}catch(e){next(e);}});

app.get("/admin/navigation", async (req,res,next)=>{try{const rows=await rest("cms_navigation_items?select=*&order=area.asc,sort_order.asc");const form=(item,isNew=false)=>`<form class="card section" method="post" action="${isNew?"/admin/navigation/new":`/admin/navigation/${item.id}`}">${csrf(req)}<h3>${isNew?"زر / أيقونة جديدة":escapeHtml(item.label||"Navigation")}</h3><div class="row"><div class="field"><label>المكان</label><select name="area">${["bottom","header","footer","mobile_menu","trust"].map(v=>`<option value="${v}" ${item.area===v?"selected":""}>${v}</option>`).join("")}</select></div><div class="field"><label>النص</label><input name="label" required value="${escapeHtml(item.label||"")}"></div><div class="field"><label>الرابط</label><input name="href" value="${escapeHtml(item.href||"")}"></div><div class="field"><label>نوع الأيقونة</label><select name="icon_type">${["lucide","image","svg","none"].map(v=>`<option value="${v}" ${item.icon_type===v?"selected":""}>${v}</option>`).join("")}</select></div><div class="field"><label>اسم/رابط الأيقونة</label><input name="icon_value" placeholder="House أو https://..." value="${escapeHtml(item.icon_value||"")}"></div><div class="field"><label>الترتيب</label><input name="sort_order" type="number" value="${toInt(item.sort_order)}"></div><div class="field"><label class="toggle"><input name="is_visible" type="checkbox" ${checked(item.is_visible)}> ظاهر</label></div></div><p class="muted">Lucide: House, LayoutGrid, Grid2X2, Search, ShoppingBag, Heart, Menu, Smartphone, User</p><div class="actions"><button class="btn primary">${isNew?"إضافة":"حفظ"}</button>${!isNew?`<button class="btn danger" formmethod="post" formaction="/admin/navigation/${item.id}/delete" onclick="return confirm('حذف العنصر؟')">حذف</button>`:""}</div></form>`;res.send(page("الأيقونات والتنقل",`<main class="shell"><h1>الأيقونات والتنقل</h1><p class="muted">تحكم بالأيقونات، النصوص، الروابط والترتيب.</p>${form({area:"bottom",icon_type:"lucide",sort_order:rows.length,is_visible:true},true)}${rows.map(x=>form(x)).join("")}</main>`,req));}catch(e){next(e);}});
function navPayload(body){return{area:body.area||"bottom",label:body.label,icon_type:body.icon_type||"lucide",icon_value:body.icon_value||null,href:body.href||null,sort_order:toInt(body.sort_order),is_visible:body.is_visible==="on",updated_at:new Date().toISOString()};}
app.post("/admin/navigation/new",requireCsrf,async(req,res,next)=>{try{await rest("cms_navigation_items",{method:"POST",body:JSON.stringify(navPayload(req.body))});res.redirect(303,"/admin/navigation");}catch(e){next(e);}});
app.post("/admin/navigation/:id",requireCsrf,async(req,res,next)=>{try{await rest(`cms_navigation_items?id=eq.${encodeURIComponent(req.params.id)}`,{method:"PATCH",body:JSON.stringify(navPayload(req.body))});res.redirect(303,"/admin/navigation");}catch(e){next(e);}});
app.post("/admin/navigation/:id/delete",requireCsrf,async(req,res,next)=>{try{await rest(`cms_navigation_items?id=eq.${encodeURIComponent(req.params.id)}`,{method:"DELETE"});res.redirect(303,"/admin/navigation");}catch(e){next(e);}});

app.get("/admin/sections", async(req,res,next)=>{try{const rows=await rest("cms_sections?select=*&order=page_slug.asc,sort_order.asc");const cards=rows.map(item=>`<form class="card section" method="post" action="/admin/sections/${item.id}">${csrf(req)}<div class="row"><div class="field"><label>Page</label><input value="${escapeHtml(item.page_slug)}" disabled></div><div class="field"><label>Section key</label><input value="${escapeHtml(item.section_key)}" disabled></div><div class="field"><label>العنوان</label><input name="title" value="${escapeHtml(item.title||"")}"></div><div class="field wide"><label>الوصف</label><input name="subtitle" value="${escapeHtml(item.subtitle||"")}"></div><div class="field"><label>الترتيب</label><input name="sort_order" type="number" value="${toInt(item.sort_order)}"></div><div class="field"><label class="toggle"><input name="is_visible" type="checkbox" ${checked(item.is_visible)}> ظاهر</label></div></div><div class="actions"><button class="btn primary">حفظ</button></div></form>`).join("");res.send(page("الأقسام",`<main class="shell"><h1>أقسام الصفحة</h1><p class="muted">غيّر العنوان والترتيب أو أخفِ القسم بالكامل.</p>${cards}</main>`,req));}catch(e){next(e);}});
app.post("/admin/sections/:id",requireCsrf,async(req,res,next)=>{try{await rest(`cms_sections?id=eq.${encodeURIComponent(req.params.id)}`,{method:"PATCH",body:JSON.stringify({title:req.body.title||null,subtitle:req.body.subtitle||null,sort_order:toInt(req.body.sort_order),is_visible:req.body.is_visible==="on",updated_at:new Date().toISOString()})});res.redirect(303,"/admin/sections");}catch(e){next(e);}});

app.use((error, req, res, _next) => {
  console.error(error);
  const back = req.headers.referer || "/admin";
  res.status(500).send(page("خطأ", `<main class="shell"><div class="card"><h1>حدث خطأ</h1><p class="error">${escapeHtml(error.message)}</p><a class="btn" href="${escapeHtml(back)}">رجوع</a></div></main>`, req));
});

app.listen(PORT, "0.0.0.0", () => console.log(`Space Call Admin Live listening on ${PORT}`));
