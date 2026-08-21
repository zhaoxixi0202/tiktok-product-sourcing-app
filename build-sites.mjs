import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const serverDir = path.join(dist, "server");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function asJson(value) {
  return JSON.stringify(value);
}

const files = {
  "/": { body: read("index.html"), type: "text/html; charset=utf-8" },
  "/index.html": { body: read("index.html"), type: "text/html; charset=utf-8" },
  "/admin": { body: read("admin.html"), type: "text/html; charset=utf-8" },
  "/admin.html": { body: read("admin.html"), type: "text/html; charset=utf-8" },
  "/admin.js": { body: read("admin.js"), type: "text/javascript; charset=utf-8" },
  "/app.js": { body: read("app.js"), type: "text/javascript; charset=utf-8" },
  "/styles.css": { body: read("styles.css"), type: "text/css; charset=utf-8" },
  "/demo-output.json": { body: read("demo-output.json"), type: "application/json; charset=utf-8" },
  "/demo-scored.json": { body: read("demo-scored.json"), type: "application/json; charset=utf-8" },
};

const worker = `
const files = ${asJson(files)};

const defaultState = {
  config: {
    provider: "demo",
    apiBaseUrl: "https://api.apify.com/v2",
    searchActorId: "unseenuser~tiktok-shop-scraper",
    detailActorId: "pratikdani~tiktok-shop-scraper",
    defaultRegion: "SG",
    defaultCategory: "Fashion Accessories",
    dateRange: "last7Day",
    keywords: ["hair clip", "earrings", "necklace", "bag charm", "card holder"],
    limitPerKeyword: 10,
    page: 1,
    currency: "SGD",
    supplierDetailProvider: "parse1688",
    supplierDetailApiUrl: "https://api.parse.bot/scraper/bb0ade25-1595-4730-86be-b24affd889da",
    feishuSheetUrl: "",
    feishuSheetRange: "",
    feishuLinkColumn: "A"
  },
  stats: { totalQueries: 0, todayQueries: 0, todayKey: new Date().toISOString().slice(0, 10), lastQueryAt: null, lastError: null },
  lastResult: null
};

let runtimeState = structuredClone(defaultState);

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

function accountSnapshot(env) {
  return {
    provider: runtimeState.config.provider,
    apiBaseUrl: runtimeState.config.apiBaseUrl,
    apifyConfigured: Boolean(env.APIFY_TOKEN),
    providerConfigured: runtimeState.config.provider === "demo" || Boolean(env.APIFY_TOKEN || env.TIKTOK_SOURCING_API_KEY || env.FOURSELLER_API_KEY),
    supplierDetailProvider: runtimeState.config.supplierDetailProvider,
    supplierDetailConfigured: runtimeState.config.supplierDetailProvider === "parse1688" ? Boolean(env.PARSE_API_KEY) : true,
    feishuConfigured: Boolean(runtimeState.config.feishuSheetUrl && runtimeState.config.feishuSheetRange && env.LARK_APP_ID && env.LARK_APP_SECRET),
    tokenLocation: "Server environment variables",
    adminProtected: Boolean(env.ADMIN_PASSWORD),
    searchActorId: runtimeState.config.searchActorId,
    detailActorId: runtimeState.config.detailActorId,
    permissions: "线上站点已连接"
  };
}

function detectSupplierPlatform(text) {
  const value = String(text || "").toLowerCase();
  if (value.includes("1688.com")) return "1688";
  if (value.includes("taobao.com") || value.includes("tmall.com")) return "Taobao/Tmall";
  if (value.includes("yangkeduo.com") || value.includes("pinduoduo.com")) return "Pinduoduo";
  return /^https?:\\/\\//.test(value) ? "Other URL" : "Manual Text";
}

async function fetchSupplierPage(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome Safari/537.36",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8"
    }
  });
  const html = await response.text();
  if (/captcha|验证|安全检测|x5secdata|punish/i.test(html)) throw new Error("Blocked by supplier site verification");
  const title = html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").trim() || url;
  return { url, title, description: "", price: "", moq: "", shop: "", textSample: title, fetchedAt: new Date().toISOString(), source: "page-fetch" };
}

async function handleSupplierFetch(request, env) {
  const body = await readBody(request);
  const urls = Array.isArray(body.urls) ? body.urls : [body.url].filter(Boolean);
  const results = [];
  for (const rawUrl of urls.slice(0, 10)) {
    const url = String(rawUrl || "").trim();
    if (!url) continue;
    try {
      const details = await fetchSupplierPage(url);
      results.push({ ok: true, url, details });
    } catch (error) {
      results.push({ ok: false, url, error: error.message });
    }
  }
  return json({ results });
}

function parseFeishuBaseUrl(input) {
  try {
    const parsed = new URL(input);
    const appToken = parsed.pathname.match(/\\/base\\/([A-Za-z0-9]+)/)?.[1] || "";
    return appToken ? { appToken, tableId: parsed.searchParams.get("table") || "", viewId: parsed.searchParams.get("view") || "" } : null;
  } catch { return null; }
}

async function getFeishuTenantToken(env) {
  if (!env.LARK_APP_ID || !env.LARK_APP_SECRET) throw new Error("Missing LARK_APP_ID or LARK_APP_SECRET in backend env");
  const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: env.LARK_APP_ID, app_secret: env.LARK_APP_SECRET })
  });
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) throw new Error(payload.msg || "Feishu auth failed");
  return payload.tenant_access_token;
}

function normalizeCell(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(normalizeCell).join("\\n");
  if (typeof value === "object") return value.link || value.url || value.text || value.name || "";
  return String(value);
}

async function handleFeishuSupplierLinks(request, env) {
  const body = await readBody(request);
  const url = String(body.feishuSheetUrl || runtimeState.config.feishuSheetUrl || "").trim();
  const fieldName = String(body.feishuSheetRange || runtimeState.config.feishuSheetRange || "").trim();
  const base = parseFeishuBaseUrl(url);
  if (!base) return json({ error: "线上版本目前优先支持飞书 Base 链接，请填写 /base/ 链接。" }, 400);
  const tableId = String(body.feishuLinkColumn || runtimeState.config.feishuLinkColumn || "").trim() || base.tableId;
  if (!tableId || !fieldName) return json({ error: "Base 链接需要 table，并在 Range / Field 填字段名。" }, 400);
  const token = await getFeishuTenantToken(env);
  const endpoint = \`https://open.feishu.cn/open-apis/bitable/v1/apps/\${encodeURIComponent(base.appToken)}/tables/\${encodeURIComponent(tableId)}/records/search?page_size=100\`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: \`Bearer \${token}\`, "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ view_id: base.viewId || undefined, field_names: [fieldName] })
  });
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) return json({ error: payload.msg || "Feishu Base read failed" }, 400);
  const links = (payload.data?.items || [])
    .map((record) => normalizeCell(record.fields?.[fieldName]))
    .flatMap((value) => String(value).split(/\\r?\\n|,|\\s+/))
    .map((value) => value.trim())
    .filter((value) => /^https?:\\/\\//i.test(value))
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 100);
  return json({ links, rowCount: payload.data?.items?.length || 0, range: \`\${tableId} / \${fieldName}\`, source: "feishu-base" });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/tiktok/callback") {
      const code = url.searchParams.get("code") || url.searchParams.get("auth_code") || "";
      return new Response(code ? "TikTok authorization received. You can close this page." : "TikTok callback is ready.", {
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }
    if (url.pathname === "/api/admin/state" || url.pathname === "/api/config") {
      return json({ ...runtimeState, account: accountSnapshot(env) });
    }
    if (request.method === "POST" && url.pathname === "/api/admin/config") {
      const body = await readBody(request);
      runtimeState.config = { ...runtimeState.config, ...body };
      return json({ ...runtimeState, account: accountSnapshot(env) });
    }
    if (request.method === "POST" && url.pathname === "/api/admin/supplier-fetch") return handleSupplierFetch(request, env);
    if (request.method === "POST" && url.pathname === "/api/admin/feishu-supplier-links") return handleFeishuSupplierLinks(request, env);
    if (request.method === "POST" && url.pathname === "/api/admin/reset-stats") {
      runtimeState.stats = structuredClone(defaultState.stats);
      return json({ ...runtimeState, account: accountSnapshot(env) });
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "This online preview endpoint is not configured yet." }, 400);
    const file = files[url.pathname] || files["/"];
    return new Response(file.body, { headers: { "content-type": file.type, "cache-control": "no-store" } });
  }
};
`;

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(serverDir, { recursive: true });
fs.writeFileSync(path.join(serverDir, "index.js"), worker);
