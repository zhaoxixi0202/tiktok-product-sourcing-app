const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = __dirname;
const port = Number(process.env.PORT || 8787);
const stateDir = path.join(root, "data");
const stateFile = path.join(stateDir, "app-state.json");
const jobs = new Map();
const sessions = new Map();

loadEnv(path.join(root, ".env"));

const defaultState = {
  config: {
    provider: "demo",
    apiBaseUrl: "https://api.apify.com/v2",
    searchActorId: process.env.APIFY_SEARCH_ACTOR_ID || "unseenuser~tiktok-shop-scraper",
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
    feishuLinkColumn: "A",
  },
  stats: {
    totalQueries: 0,
    todayQueries: 0,
    todayKey: todayKey(),
    lastQueryAt: null,
    lastError: null,
  },
  lastResult: null,
  tiktok: {
    authState: null,
    token: null,
    shops: [],
    products: [],
    lastSyncAt: null,
    lastError: null,
  },
};

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCharCode(Number(number)));
}

function textFromHtml(html) {
  return decodeHtml(String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function metaContent(html, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const propertyMatch = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"));
  if (propertyMatch) return decodeHtml(propertyMatch[1]);
  const reverseMatch = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"));
  return reverseMatch ? decodeHtml(reverseMatch[1]) : "";
}

function extractSupplierPage(html, url) {
  if (/_____tmd_____\/punish|x5secdata|punish\?x5secdata|captcha|验证|安全检测/i.test(html)) {
    throw new Error("Blocked by supplier site verification");
  }
  const title = metaContent(html, "og:title") || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? textFromHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)[1]) : "");
  const description = metaContent(html, "description") || metaContent(html, "og:description");
  const image = metaContent(html, "og:image");
  const visibleText = textFromHtml(html).slice(0, 6000);
  const price = visibleText.match(/(?:￥|¥|S\$|\$)\s?\d+(?:\.\d+)?(?:\s?[-~]\s?(?:￥|¥|S\$|\$)?\d+(?:\.\d+)?)?/i)?.[0] || "";
  const moq = visibleText.match(/(?:起批|起订|MOQ|minimum order)[^\d]{0,8}\d+/i)?.[0] || "";
  const shop = visibleText.match(/(?:店铺|公司|厂|旗舰店|supplier|shop|store)[：:\s]{0,4}[\u4e00-\u9fa5A-Za-z0-9\s-]{2,40}/i)?.[0] || "";
  if (!title && !description && visibleText.length < 80) {
    throw new Error("No readable product content found");
  }
  return {
    url,
    title: title.trim(),
    description: description.trim(),
    image,
    price,
    moq,
    shop,
    textSample: visibleText.slice(0, 1200),
    fetchedAt: new Date().toISOString(),
  };
}

function normalizeParse1688Details(raw, url) {
  const data = raw.data || raw.result || raw;
  const seller = data.seller || {};
  const priceRange = data.price_range || data.priceRange || {};
  const attributes = Array.isArray(data.attributes)
    ? data.attributes.map((item) => `${item.name || item.key || ""}:${item.value || ""}`).filter(Boolean)
    : [];
  const mainImage = data.main_images?.[0]?.fullPathImageURI || data.main_images?.[0]?.url || data.images?.[0]?.fullPathImageURI || data.images?.[0]?.url || "";
  const price = priceRange.min || priceRange.max
    ? `CNY ${priceRange.min || "?"}${priceRange.max && priceRange.max !== priceRange.min ? `-${priceRange.max}` : ""}`
    : "";
  return {
    url,
    title: String(data.title || ""),
    description: attributes.slice(0, 12).join(" / "),
    image: mainImage,
    price,
    moq: data.begin_amount ? `MOQ ${data.begin_amount}` : "",
    shop: seller.company_name || seller.companyName || seller.login_id || seller.loginId || "",
    textSample: [
      data.title,
      price,
      data.unit ? `unit:${data.unit}` : "",
      data.sale_num != null ? `sale_num:${data.sale_num}` : "",
      seller.company_name || seller.companyName || "",
      attributes.join(" "),
    ].filter(Boolean).join(" ").slice(0, 1600),
    fetchedAt: new Date().toISOString(),
    source: "parse1688",
    raw,
  };
}

async function fetchParse1688Details(config, url) {
  if (!process.env.PARSE_API_KEY) throw new Error("Missing PARSE_API_KEY in backend .env");
  const baseUrl = (config.supplierDetailApiUrl || "https://api.parse.bot/scraper/bb0ade25-1595-4730-86be-b24affd889da").replace(/\/$/, "");
  const endpoint = `${baseUrl}/get_product_details?offer_id=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint, {
    headers: {
      "X-API-Key": process.env.PARSE_API_KEY,
      "Accept": "application/json",
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Parse 1688 ${response.status}: ${text.slice(0, 180)}`);
  const payload = JSON.parse(text);
  return normalizeParse1688Details(payload, url);
}

async function fetchSupplierPage(url) {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only http/https URLs are supported");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error(`Unsupported content type: ${contentType || "unknown"}`);
    }
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_500_000) throw new Error("Page is too large to inspect safely");
      chunks.push(value);
    }
    const html = Buffer.concat(chunks).toString("utf8");
    return extractSupplierPage(html, parsed.toString());
  } finally {
    clearTimeout(timer);
  }
}

function apifyHeaders() {
  return {
    "Authorization": `Bearer ${process.env.APIFY_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function providerApiKey(provider) {
  if (provider === "4seller") return process.env.FOURSELLER_API_KEY || process.env.TIKTOK_SOURCING_API_KEY || "";
  if (provider === "generic" || provider === "kalodata") return process.env.TIKTOK_SOURCING_API_KEY || "";
  return "";
}

function supplierDetailConfigured(config) {
  if (config.supplierDetailProvider === "manual") return true;
  if (config.supplierDetailProvider === "page-fetch") return true;
  if (config.supplierDetailProvider === "parse1688") return Boolean(process.env.PARSE_API_KEY);
  return false;
}

function feishuConfigured(config) {
  return Boolean(config.feishuSheetUrl && config.feishuSheetRange && process.env.LARK_APP_ID && process.env.LARK_APP_SECRET);
}

function tiktokConfigured() {
  return Boolean(process.env.TIKTOK_APP_KEY && process.env.TIKTOK_APP_SECRET);
}

function tiktokRedirectUri(req) {
  if (process.env.TIKTOK_REDIRECT_URI) return process.env.TIKTOK_REDIRECT_URI;
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${req.headers.host}/api/tiktok/callback`;
}

function tiktokAuthBase() {
  return process.env.TIKTOK_AUTH_BASE_URL || "https://services.tiktokshop.com/open/authorize";
}

function tiktokApiBase() {
  return (process.env.TIKTOK_API_BASE_URL || "https://open-api.tiktokglobalshop.com").replace(/\/$/, "");
}

function publicTikTokConnection(tiktok) {
  const token = tiktok?.token || null;
  const shops = Array.isArray(tiktok?.shops) ? tiktok.shops : [];
  const products = Array.isArray(tiktok?.products) ? tiktok.products : [];
  return {
    configured: tiktokConfigured(),
    authorized: Boolean(token?.accessToken),
    accessTokenExpiresAt: token?.accessTokenExpiresAt || null,
    refreshTokenExpiresAt: token?.refreshTokenExpiresAt || null,
    openId: token?.openId || "",
    scopes: token?.grantedScopes || [],
    requiredScopes: ["seller.authorization.info", "seller.global_product.info", "seller.shop.info"],
    shops,
    products,
    lastSyncAt: tiktok?.lastSyncAt || null,
    lastError: tiktok?.lastError || null,
  };
}

function providerConfigured(config) {
  if (config.provider === "demo") return true;
  if (config.provider === "apify") return hasApifyToken();
  return Boolean(providerApiKey(config.provider));
}

function sendUnauthorized(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/admin" || url.pathname === "/admin.html") {
    res.writeHead(302, { Location: `/login?next=${encodeURIComponent(url.pathname)}` });
    res.end();
    return;
  }
  sendJson(res, 401, { error: "请先登录后台账号" });
}

function secureCompare(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && cryptoSafeEqual(a, b);
}

function cryptoSafeEqual(a, b) {
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a[index] ^ b[index];
  }
  return mismatch === 0;
}

function isAdminProtected() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function isAdminRequest(url) {
  return url.pathname === "/admin" || url.pathname === "/admin.html" || url.pathname === "/admin.js" || url.pathname.startsWith("/api/admin") || url.pathname === "/api/products/search" || url.pathname === "/api/products/search-async";
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(header.split(";").map((part) => {
    const index = part.indexOf("=");
    if (index === -1) return ["", ""];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function sessionCookieOptions(req, maxAge) {
  const secure = req.headers["x-forwarded-proto"] === "https" || String(req.headers.host || "").includes("onrender.com");
  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
    maxAge != null ? `Max-Age=${maxAge}` : "",
  ].filter(Boolean).join("; ");
}

function createSession(username) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    username,
    createdAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });
  return token;
}

function currentSession(req) {
  const token = parseCookies(req).ps_session || "";
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function isAuthorized(req) {
  if (!isAdminProtected()) return true;
  return Boolean(currentSession(req));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname === "/admin" ? "/admin.html" : url.pathname === "/login" ? "/login.html" : url.pathname;
  const filePath = path.normalize(path.join(root, pathname));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const type = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
    }[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

async function handleLogin(req, res) {
  try {
    if (!isAdminProtected()) {
      sendJson(res, 200, { ok: true, disabled: true });
      return;
    }
    const body = JSON.parse((await readBody(req)) || "{}");
    const expectedUsername = process.env.ADMIN_USERNAME || "admin";
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const usernameOk = secureCompare(username, expectedUsername);
    const passwordOk = secureCompare(password, process.env.ADMIN_PASSWORD);
    if (!usernameOk || !passwordOk) {
      sendJson(res, 401, { error: "账号或密码不正确" });
      return;
    }
    const token = createSession(username);
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": `ps_session=${encodeURIComponent(token)}; ${sessionCookieOptions(req, 60 * 60 * 24 * 7)}`,
    });
    res.end(JSON.stringify({ ok: true, username }));
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

function handleLogout(req, res) {
  const token = parseCookies(req).ps_session || "";
  if (token) sessions.delete(token);
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Set-Cookie": `ps_session=; ${sessionCookieOptions(req, 0)}`,
  });
  res.end(JSON.stringify({ ok: true }));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readState() {
  try {
    if (!fs.existsSync(stateFile)) return structuredClone(defaultState);
    const parsed = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    const state = {
      ...structuredClone(defaultState),
      ...parsed,
      config: { ...defaultState.config, ...(parsed.config || {}) },
      stats: { ...defaultState.stats, ...(parsed.stats || {}) },
      tiktok: { ...defaultState.tiktok, ...(parsed.tiktok || {}) },
    };
    if (!Array.isArray(state.config.keywords)) state.config.keywords = defaultState.config.keywords;
    if (state.stats.todayKey !== todayKey()) {
      state.stats.todayKey = todayKey();
      state.stats.todayQueries = 0;
    }
    return state;
  } catch {
    return structuredClone(defaultState);
  }
}

function writeState(state) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function sanitizeConfig(input) {
  const next = {};
  const textFields = ["provider", "apiBaseUrl", "searchActorId", "detailActorId", "defaultRegion", "defaultCategory", "dateRange", "currency", "supplierDetailProvider", "supplierDetailApiUrl", "feishuSheetUrl", "feishuSheetRange", "feishuLinkColumn"];
  for (const field of textFields) {
    if (typeof input[field] === "string") next[field] = input[field].trim();
  }
  if (Array.isArray(input.keywords)) {
    next.keywords = input.keywords.map((keyword) => String(keyword).trim()).filter(Boolean).slice(0, 30);
  } else if (typeof input.keywords === "string") {
    next.keywords = input.keywords.split(/\r?\n|,/).map((keyword) => keyword.trim()).filter(Boolean).slice(0, 30);
  }
  if (input.limitPerKeyword !== undefined) {
    next.limitPerKeyword = Math.max(1, Math.min(100, Number(input.limitPerKeyword) || 10));
  }
  if (input.page !== undefined) {
    next.page = Math.max(1, Math.min(20, Number(input.page) || 1));
  }
  return next;
}

function extractFeishuSpreadsheetToken(input) {
  const value = String(input || "").trim();
  if (!value) return "";
  const match = value.match(/\/(?:sheets|spreadsheets)\/([A-Za-z0-9]+)/);
  return match ? match[1] : value;
}

function parseFeishuBaseUrl(input) {
  const value = String(input || "").trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const token = parsed.pathname.match(/\/base\/([A-Za-z0-9]+)/)?.[1] || "";
    if (!token) return null;
    return {
      appToken: token,
      tableId: parsed.searchParams.get("table") || "",
      viewId: parsed.searchParams.get("view") || "",
    };
  } catch {
    const token = value.match(/\/base\/([A-Za-z0-9]+)/)?.[1] || "";
    return token ? { appToken: token, tableId: "", viewId: "" } : null;
  }
}

function columnIndex(column) {
  const value = String(column || "A").trim();
  if (/^\d+$/.test(value)) return Math.max(0, Number(value) - 1);
  const letters = value.toUpperCase().replace(/[^A-Z]/g, "");
  if (!letters) return 0;
  return letters.split("").reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function normalizeFeishuCellValue(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) {
    return value.map((item) => normalizeFeishuCellValue(item)).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    return value.link || value.url || value.text || value.name || value.en_us || value.zh_cn || "";
  }
  return String(value).trim();
}

async function getFeishuTenantToken() {
  if (!process.env.LARK_APP_ID || !process.env.LARK_APP_SECRET) {
    throw new Error("Missing LARK_APP_ID or LARK_APP_SECRET in backend .env");
  }
  const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: process.env.LARK_APP_ID,
      app_secret: process.env.LARK_APP_SECRET,
    }),
  });
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.msg || `Feishu auth failed: HTTP ${response.status}`);
  }
  return payload.tenant_access_token;
}

async function fetchFeishuSupplierLinks(config) {
  const baseInfo = parseFeishuBaseUrl(config.feishuSheetUrl);
  if (baseInfo) return fetchFeishuBaseSupplierLinks(config, baseInfo);
  const spreadsheetToken = extractFeishuSpreadsheetToken(config.feishuSheetUrl);
  const range = String(config.feishuSheetRange || "").trim();
  if (!spreadsheetToken || !range) throw new Error("Missing Feishu sheet URL or range");
  const tenantToken = await getFeishuTenantToken();
  const endpoint = `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${encodeURIComponent(spreadsheetToken)}/values/${encodeURIComponent(range)}`;
  const response = await fetch(endpoint, {
    headers: {
      "Authorization": `Bearer ${tenantToken}`,
      "Accept": "application/json",
    },
  });
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.msg || `Feishu sheet read failed: HTTP ${response.status}`);
  }
  const values = payload.data?.valueRange?.values || [];
  const linkIndex = columnIndex(config.feishuLinkColumn || "A");
  const links = values
    .map((row) => Array.isArray(row) ? row[linkIndex] : "")
    .map((value) => {
      if (typeof value === "object" && value) return value.text || value.link || value.url || "";
      return String(value || "").trim();
    })
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 100);
  return { links, rowCount: values.length, range };
}

async function fetchFeishuBaseSupplierLinks(config, baseInfo) {
  const fieldName = String(config.feishuSheetRange || "").trim();
  const tableId = String(config.feishuLinkColumn || "").trim() || baseInfo.tableId;
  if (!baseInfo.appToken || !tableId || !fieldName) {
    throw new Error("Missing Feishu Base table or field. Base 链接需要包含 table=...，并在 Range / Field 填字段名，例如 1688商品链接。");
  }
  const tenantToken = await getFeishuTenantToken();
  const endpoint = `https://open.feishu.cn/open-apis/bitable/v1/apps/${encodeURIComponent(baseInfo.appToken)}/tables/${encodeURIComponent(tableId)}/records/search?page_size=100`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${tenantToken}`,
      "Content-Type": "application/json; charset=utf-8",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      view_id: baseInfo.viewId || undefined,
      field_names: [fieldName],
    }),
  });
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.msg || `Feishu Base read failed: HTTP ${response.status}`);
  }
  const items = payload.data?.items || [];
  const links = items
    .map((record) => normalizeFeishuCellValue(record.fields?.[fieldName]))
    .flatMap((value) => String(value).split(/\r?\n|,|\s+/))
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => /^https?:\/\//i.test(value))
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 100);
  return {
    links,
    rowCount: items.length,
    range: `${tableId} / ${fieldName}`,
    source: "feishu-base",
  };
}

function accountSnapshot(state) {
  const tokenLocation = state.config.provider === "apify"
    ? "Server environment variable: APIFY_TOKEN"
    : "Server environment variable: FOURSELLER_API_KEY or TIKTOK_SOURCING_API_KEY";
  return {
    provider: state.config.provider,
    apiBaseUrl: state.config.apiBaseUrl,
    apifyConfigured: hasApifyToken(),
    providerConfigured: providerConfigured(state.config),
    supplierDetailProvider: state.config.supplierDetailProvider,
    supplierDetailConfigured: supplierDetailConfigured(state.config),
    feishuConfigured: feishuConfigured(state.config),
    tiktokConfigured: tiktokConfigured(),
    tiktokAuthorized: Boolean(state.tiktok?.token?.accessToken),
    tiktokShopCount: Array.isArray(state.tiktok?.shops) ? state.tiktok.shops.length : 0,
    tokenLocation,
    adminProtected: isAdminProtected(),
    searchActorId: state.config.searchActorId,
    detailActorId: state.config.detailActorId,
    permissions: providerConfigured(state.config) ? "数据源已配置" : "缺少当前数据源 Token",
  };
}

function adminStatePayload(state) {
  return {
    config: state.config,
    stats: state.stats,
    account: accountSnapshot(state),
    lastResult: state.lastResult,
    tiktok: publicTikTokConnection(state.tiktok),
  };
}

function buildTikTokAuthUrl(req) {
  if (!tiktokConfigured()) throw new Error("Missing TIKTOK_APP_KEY or TIKTOK_APP_SECRET in backend environment");
  const state = readState();
  const authState = crypto.randomBytes(16).toString("hex");
  state.tiktok.authState = authState;
  state.tiktok.lastError = null;
  writeState(state);
  const url = new URL(process.env.TIKTOK_AUTH_URL || tiktokAuthBase());
  if (!url.searchParams.get("service_id") && process.env.TIKTOK_SERVICE_ID) {
    url.searchParams.set("service_id", process.env.TIKTOK_SERVICE_ID);
  }
  if (!url.searchParams.get("service_id")) {
    throw new Error("Missing TIKTOK_SERVICE_ID or TIKTOK_AUTH_URL in backend environment");
  }
  url.searchParams.set("state", authState);
  url.searchParams.set("redirect_uri", tiktokRedirectUri(req));
  return url.toString();
}

function normalizeTikTokToken(data) {
  return {
    accessToken: data.access_token || data.accessToken || "",
    refreshToken: data.refresh_token || data.refreshToken || "",
    accessTokenExpiresAt: data.access_token_expire_in || data.accessTokenExpiresAt || null,
    refreshTokenExpiresAt: data.refresh_token_expire_in || data.refreshTokenExpiresAt || null,
    openId: data.open_id || data.openId || "",
    userType: data.user_type ?? data.userType ?? "",
    grantedScopes: data.granted_scopes || data.grantedScopes || [],
  };
}

function tikTokSign(pathname, params, body = "") {
  const sorted = Object.keys(params)
    .filter((key) => key !== "sign" && key !== "access_token")
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");
  const base = `${process.env.TIKTOK_APP_SECRET}${pathname}${sorted}${body}${process.env.TIKTOK_APP_SECRET}`;
  return crypto.createHmac("sha256", process.env.TIKTOK_APP_SECRET).update(base).digest("hex");
}

async function exchangeTikTokCode(code) {
  if (!tiktokConfigured()) throw new Error("Missing TIKTOK_APP_KEY or TIKTOK_APP_SECRET in backend environment");
  const endpoint = new URL("https://auth.tiktok-shops.com/api/v2/token/get");
  endpoint.searchParams.set("app_key", process.env.TIKTOK_APP_KEY);
  endpoint.searchParams.set("app_secret", process.env.TIKTOK_APP_SECRET);
  endpoint.searchParams.set("auth_code", code);
  endpoint.searchParams.set("grant_type", "authorized_code");
  const response = await fetch(endpoint);
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || `TikTok token exchange failed: HTTP ${response.status}`);
  }
  return payload.data || {};
}

async function refreshTikTokTokenIfNeeded(state) {
  const token = state.tiktok?.token;
  if (!token?.refreshToken) throw new Error("TikTok Shop is not authorized yet");
  const expiresAt = Number(token.accessTokenExpiresAt || 0);
  const now = Math.floor(Date.now() / 1000);
  if (token.accessToken && expiresAt > now + 600) return token.accessToken;

  const endpoint = new URL("https://auth.tiktok-shops.com/api/v2/token/refresh");
  endpoint.searchParams.set("app_key", process.env.TIKTOK_APP_KEY);
  endpoint.searchParams.set("app_secret", process.env.TIKTOK_APP_SECRET);
  endpoint.searchParams.set("refresh_token", token.refreshToken);
  endpoint.searchParams.set("grant_type", "refresh_token");
  const response = await fetch(endpoint);
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || `TikTok token refresh failed: HTTP ${response.status}`);
  }
  state.tiktok.token = normalizeTikTokToken({ ...token, ...(payload.data || {}) });
  writeState(state);
  return state.tiktok.token.accessToken;
}

async function callTikTokApi(pathname, options = {}) {
  if (!tiktokConfigured()) throw new Error("Missing TIKTOK_APP_KEY or TIKTOK_APP_SECRET in backend environment");
  const state = readState();
  const accessToken = await refreshTikTokTokenIfNeeded(state);
  const method = options.method || "GET";
  const bodyText = options.body ? JSON.stringify(options.body) : "";
  const query = {
    app_key: process.env.TIKTOK_APP_KEY,
    timestamp: Math.floor(Date.now() / 1000),
    ...(options.query || {}),
  };
  query.sign = tikTokSign(pathname, query, bodyText);
  const endpoint = new URL(`${tiktokApiBase()}${pathname}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") endpoint.searchParams.set(key, String(value));
  }
  const response = await fetch(endpoint, {
    method,
    headers: {
      "content-type": "application/json",
      "x-tts-access-token": accessToken,
    },
    body: bodyText || undefined,
  });
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    const message = payload.message || `TikTok API failed: HTTP ${response.status}`;
    if (/scope|authorized to access the endpoint|access denied/i.test(message)) {
      throw new Error(`${message} Required scope for this step may be missing from the access token. Reset TikTok auth, reconnect, and confirm seller.authorization.info is Active.`);
    }
    throw new Error(message);
  }
  return payload.data || {};
}

async function fetchTikTokAuthorizedShops() {
  const data = await callTikTokApi("/authorization/202309/shops");
  return data.shops || [];
}

function normalizeTikTokShopProduct(product, index, shop) {
  const firstSku = Array.isArray(product.skus) ? product.skus[0] || {} : {};
  const price = firstSku.price || product.price || {};
  const image = product.main_images?.[0]?.urls?.[0] || product.main_images?.[0]?.url || product.images?.[0]?.url || "";
  return {
    rank: index + 1,
    productId: String(product.id || product.product_id || ""),
    title: String(product.title || product.product_name || "Untitled product"),
    status: String(product.status || product.audit_status || ""),
    productUrl: product.product_url || "",
    imageUrl: image,
    sellerSku: firstSku.seller_sku || "",
    price: price.sale_price || price.tax_exclusive_price || "",
    currency: price.currency || "",
    inventory: Array.isArray(firstSku.inventory) ? firstSku.inventory.reduce((sum, item) => sum + Number(item.available_stock || item.quantity || 0), 0) : null,
    shopName: shop?.name || "",
    shopRegion: shop?.region || "",
    shopCipher: shop?.cipher || "",
  };
}

async function syncTikTokProducts(limit = 50) {
  const state = readState();
  const shops = state.tiktok?.shops?.length ? state.tiktok.shops : await fetchTikTokAuthorizedShops();
  const shop = shops[0];
  if (!shop?.cipher) throw new Error("No authorized TikTok Shop found. Please connect a shop first.");
  const pageSize = Math.max(1, Math.min(100, Number(limit) || 50));
  const data = await callTikTokApi("/product/202502/products/search", {
    method: "POST",
    query: { shop_cipher: shop.cipher, page_size: pageSize },
    body: { status: "ALL" },
  });
  const products = (data.products || []).map((product, index) => normalizeTikTokShopProduct(product, index, shop));
  state.tiktok.shops = shops;
  state.tiktok.products = products;
  state.tiktok.lastSyncAt = new Date().toISOString();
  state.tiktok.lastError = null;
  writeState(state);
  return publicTikTokConnection(state.tiktok);
}

function firstImage(raw) {
  const direct = raw.image ?? raw.imageUrl ?? raw.image_url ?? raw.primaryImage ?? raw.primary_image ?? raw.thumbnailUrl ?? raw.thumbnail_url ?? raw.coverUrl ?? raw.cover_url ?? raw.cover ?? raw.mainImage ?? raw.main_image ?? raw.productImage ?? raw.product_image;
  if (typeof direct === "string" && direct) return direct;
  const collections = [raw.images, raw.imageUrls, raw.image_urls, raw.media, raw.medias, raw.photos, raw.productImages];
  for (const collection of collections) {
    if (!Array.isArray(collection) || !collection.length) continue;
    const first = collection[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const nested = first.url ?? first.imageUrl ?? first.image_url ?? first.thumbnailUrl ?? first.coverUrl;
      if (typeof nested === "string" && nested) return nested;
    }
  }
  return "";
}

function normalizeProduct(raw, index) {
  const price = raw.amount ?? raw.priceFormat ?? raw.price ?? raw.currentPrice ?? raw.current_price ?? raw.salePrice ?? raw.productPrice ?? raw.minPrice ?? raw.skuPrice;
  const sales = raw.sales ?? raw.sold ?? raw.soldCount ?? raw.sold_count ?? raw.totalSold ?? raw.total_sold ?? raw.orders ?? raw.sales_volume ?? raw.sales_volumn;
  const title = raw.title ?? raw.name ?? raw.productTitle ?? raw.product_title ?? raw.product_name ?? raw.productName;
  const shop = raw.shopName ?? raw.shop_name ?? raw.sellerName ?? raw.seller_name ?? raw.seller ?? raw.storeName ?? raw.store_name ?? raw.shop;
  const url = raw.productUrl ?? raw.product_url ?? raw.url ?? raw.link ?? raw.productLink ?? raw.product_link;
  const numericPrice = Number(String(price ?? 0).replace(/[^\d.]/g, "")) || 0;
  const numericSales = Number(String(sales ?? 0).replace(/[^\d.]/g, "")) || 0;
  const revenue = raw.revenue ?? raw.gmv ?? raw.salesAmount ?? raw.sales_amount ?? raw.totalRevenue ?? raw.total_revenue;
  const numericRevenue = Number(String(revenue ?? "").replace(/[^\d.]/g, ""));
  const growth = raw.growthRate ?? raw.revenue_growth_rate ?? raw.growth_rate ?? raw.salesGrowth ?? raw.sales_growth;
  return {
    rank: raw.rank || index + 1,
    productId: String(raw.productId ?? raw.product_id ?? raw.id ?? raw.itemId ?? `apify-${index + 1}`),
    title: String(title || "Untitled product"),
    price: numericPrice,
    sales: numericSales,
    revenue: Number.isFinite(numericRevenue) && numericRevenue > 0 ? numericRevenue : numericPrice * numericSales,
    revenueEstimated: !(Number.isFinite(numericRevenue) && numericRevenue > 0),
    growthRate: growth == null ? null : Number(String(growth).replace(/[^\d.-]/g, "")) || 0,
    commissionRate: Number(raw.commissionRate ?? raw.commission_rate ?? 0) || 0,
    rating: Number(raw.rating ?? 0) || 0,
    reviews: Number(String(raw.reviews ?? raw.reviewCount ?? raw.review_count ?? raw.reviewsCount ?? raw.reviews_count ?? 0).replace(/[^\d.]/g, "")) || 0,
    skuCount: Number(raw.skuCount ?? raw.sku_count ?? 0) || 0,
    sellerId: String(raw.sellerId ?? raw.seller_id ?? ""),
    shopName: String(shop || ""),
    productUrl: String(url || ""),
    imageUrl: String(firstImage(raw) || ""),
    launchDate: String(raw.launchDate ?? raw.launch_date ?? ""),
    category: String(raw.category ?? ""),
    currency: String(raw.currencyName ?? raw.currency ?? raw.currencySymbol ?? ""),
    sourceRegion: String(raw.searchRegion ?? raw.country_code ?? raw.countryCode ?? raw.region ?? raw.country ?? raw.market ?? ""),
    scrapedAt: String(raw.scrapedAt ?? raw.scraped_at ?? ""),
    keyword: String(raw.sourceQuery ?? raw.query ?? raw.keyword ?? raw.searchQuery ?? raw.search_query ?? ""),
  };
}

function normalizePayload(items, meta) {
  const rows = Array.isArray(items) ? items : items?.items || items?.data || items?.records || [];
  const normalizedItems = rows.filter((item) => item && typeof item === "object").map(normalizeProduct);
  return {
    source: meta.source || "backend",
    region: meta.region,
    category: meta.category,
    keyword: meta.keyword,
    dateRange: meta.dateRange,
    currency: meta.currency,
    callTime: new Date().toISOString(),
    items: normalizedItems.map((item) => ({ ...item, keyword: item.keyword || meta.keyword || "" })),
  };
}

function demoRankPayload(config, body = {}) {
  const now = new Date().toISOString();
  const region = body.region || config.defaultRegion;
  const category = body.category || config.defaultCategory;
  const dateRange = body.dateRange || config.dateRange;
  const currency = config.currency || "SGD";
  const baseItems = [
    {
      rank: 1,
      productId: "demo-hot-hairclip-001",
      title: "Large Acetate Hair Claw Clip for Hot Weather Hair Fix",
      price: 8.9,
      sales: 1840,
      revenue: 16376,
      growthRate: 38.4,
      commissionRate: 18,
      rating: 4.7,
      reviews: 126,
      shopName: "Demo Hair Studio",
      category,
      currency,
      sourceRegion: region,
      launchDate: "2026-08-02",
      keyword: "hot products",
    },
    {
      rank: 2,
      productId: "demo-hot-earring-002",
      title: "Hypoallergenic Pearl Hoop Earrings for Office Outfit",
      price: 12.9,
      sales: 1320,
      revenue: 17028,
      growthRate: 31.2,
      commissionRate: 15,
      rating: 4.8,
      reviews: 88,
      shopName: "Demo Accessories",
      category,
      currency,
      sourceRegion: region,
      launchDate: "2026-07-28",
      keyword: "hot products",
    },
    {
      rank: 3,
      productId: "demo-hot-cardholder-003",
      title: "Mini Card Holder With Phone Strap for MRT Commute",
      price: 14.9,
      sales: 720,
      revenue: 10728,
      growthRate: 18.6,
      commissionRate: 12,
      rating: 4.5,
      reviews: 43,
      shopName: "Demo Daily Carry",
      category,
      currency,
      sourceRegion: region,
      launchDate: "2026-07-18",
      keyword: "hot products",
    },
  ];
  return {
    source: "demo-hot-products",
    region,
    category,
    keyword: "hot products",
    dateRange,
    currency,
    callTime: now,
    items: baseItems.slice(0, Number(body.limit || config.limitPerKeyword || 10)),
  };
}

function hasApifyToken() {
  const token = process.env.APIFY_TOKEN || "";
  return Boolean(token && token !== "replace-with-your-apify-token" && token !== "your-apify-token");
}

async function runApifyActor(input, keyword) {
  const actorId = input.searchActorId || input.actorId || process.env.APIFY_SEARCH_ACTOR_ID || "sentry~tiktok-shop-search-pro";
  if (!hasApifyToken()) throw new Error("Missing APIFY_TOKEN in backend .env");
  const encodedActorId = encodeURIComponent(actorId);
  const url = `https://api.apify.com/v2/actors/${encodedActorId}/run-sync-get-dataset-items?clean=true&format=json`;
  const actorInput = buildActorInput(input, keyword);
  const response = await fetch(url, {
    method: "POST",
    headers: apifyHeaders(),
    body: JSON.stringify(actorInput),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify ${response.status}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

function buildActorInput(input, keyword) {
  const searchRegion = input.searchRegion || input.region || input.defaultRegion || "SG";
  const maxResults = Number(input.limitPerKeyword || input.limit || 10);
  const actorId = String(input.searchActorId || input.actorId || "").toLowerCase();
  if (actorId.includes("silentflow") && actorId.includes("tiktok-shop-scraper")) {
    return {
      searchKeywords: [keyword],
      region: searchRegion.toLowerCase(),
      debugMode: false,
    };
  }
  if (actorId.includes("unseenuser") && actorId.includes("tiktok-shop-scraper")) {
    return {
      mode: "shop_search",
      searchKeywords: [keyword],
      region: searchRegion.toUpperCase(),
      maxResults: maxResults,
      maxReviewsPerProduct: 5,
      getRelatedVideos: false,
    };
  }
  if (actorId.includes("trakk") && actorId.includes("tiktok-shop-search-scraper")) {
    return {
      mode: "fast",
      keywords: [keyword],
      country_code: searchRegion,
      maxItems: maxResults,
      maxPages: Math.max(1, Number(input.page || 1)),
      sortBy: "relevance",
      dedupe: true,
      compactOutput: true,
      includeRawProduct: true,
      htmlReport: false,
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
        apifyProxyCountry: searchRegion,
      },
    };
  }
  const actorInput = {
    queries: [keyword],
    searchRegion,
    maxResultsPerQuery: maxResults,
    maxPagesPerQuery: Math.max(1, Number(input.page || 1)),
    includeRawProduct: true,
    compactNullFields: true,
  };
  return actorInput;
}

function rankDateRange(value) {
  if (value === "last7Day" || value === "7d") return "7d";
  if (value === "last30Day" || value === "30d") return "30d";
  return "day";
}

function rankDateType(value) {
  return { day: 1, "7d": 2, "30d": 3 }[rankDateRange(value)] || 1;
}

function defaultRankDateValue() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 2);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return Number(`${y}${m}${d}`);
}

function orderField(sortBy) {
  return {
    sales: "sold_count",
    revenue: "sale_amount",
    growth: "sold_count_inc_rate",
  }[sortBy] || "sold_count";
}

async function run4SellerRank(config, body) {
  const apiKey = providerApiKey("4seller");
  if (!apiKey) throw new Error("Missing FOURSELLER_API_KEY or TIKTOK_SOURCING_API_KEY in backend .env");
  const baseUrl = config.apiBaseUrl || process.env.FOURSELLER_API_BASE_URL || process.env.TIKTOK_SOURCING_API_BASE_URL || "https://beta.4seller.com/api/listing/tiktok/sale-rank-by-tk-api";
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify({
      pageCurrent: Math.max(1, Number(body.page || config.page || 1)),
      pageSize: Math.max(1, Math.min(100, Number(body.limit || config.limitPerKeyword || 10))),
      region: body.region || config.defaultRegion,
      orderDesc: "desc",
      pcname: body.category || config.defaultCategory,
      dateType: rankDateType(body.dateRange || config.dateRange),
      dateValue: Number(body.dateValue || defaultRankDateValue()),
      order: orderField(body.sortBy || "sales"),
      keyword: body.keyword || undefined,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`4Seller ${response.status}: ${text.slice(0, 300)}`);
  }
  const raw = await response.json();
  if (raw.code !== undefined && raw.code !== 0) {
    throw new Error(raw.message || raw.msg || `4Seller API returned code ${raw.code}`);
  }
  const rows = raw.data?.records || raw.data?.items || raw.items || [];
  const payload = normalizePayload(rows, {
    source: raw.source || "4seller-hot-products",
    region: body.region || config.defaultRegion,
    category: body.category || config.defaultCategory,
    keyword: body.keyword || "",
    dateRange: rankDateRange(body.dateRange || config.dateRange),
    currency: config.currency,
  });
  return {
    ...payload,
    total: raw.data?.total ?? raw.total ?? payload.items.length,
    callTime: raw.callTime || raw.data?.callTime || new Date().toISOString(),
    source: raw.source || "4seller-hot-products",
    items: payload.items.map((item, index) => ({
      ...item,
      rank: item.rank || index + 1,
      shopName: item.shopName || rows[index]?.shop_info?.name || "",
      growthRate: item.growthRate ?? Number(rows[index]?.sold_count_inc_rate || rows[index]?.growthRate || 0),
    })),
  };
}

async function runGenericRank(config, body) {
  const apiKey = providerApiKey(config.provider);
  if (!apiKey) throw new Error("Missing TIKTOK_SOURCING_API_KEY in backend .env");
  const baseUrl = (config.apiBaseUrl || process.env.TIKTOK_SOURCING_API_BASE_URL || "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("Missing API Base URL for generic provider");
  const authScheme = process.env.TIKTOK_SOURCING_AUTH_SCHEME === "raw" || config.provider === "kalodata" ? "" : "Bearer ";
  const response = await fetch(`${baseUrl}/product/rank`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `${authScheme}${apiKey}`,
    },
    body: JSON.stringify({
      region: body.region || config.defaultRegion,
      category: body.category || config.defaultCategory,
      dateRange: rankDateRange(body.dateRange || config.dateRange),
      limit: Math.max(1, Math.min(100, Number(body.limit || config.limitPerKeyword || 10))),
      sortBy: body.sortBy || "sales",
      keyword: body.keyword || undefined,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Generic API ${response.status}: ${text.slice(0, 300)}`);
  }
  const raw = await response.json();
  return normalizePayload(raw, {
    source: config.provider === "kalodata" ? "kalodata-rank" : "generic-rank",
    region: body.region || config.defaultRegion,
    category: body.category || config.defaultCategory,
    keyword: body.keyword || "",
    dateRange: rankDateRange(body.dateRange || config.dateRange),
    currency: config.currency,
  });
}

async function runProviderSearch(config, body, keywords) {
  if (config.provider === "demo") return demoRankPayload(config, body);
  if (config.provider === "4seller") return run4SellerRank(config, body);
  if (config.provider === "generic" || config.provider === "kalodata") return runGenericRank(config, body);

  const allRows = [];
  for (const keyword of keywords) {
    const raw = await runApifyActor(config, keyword);
    const payload = normalizePayload(raw, {
      source: "apify-backend",
      region: body.region || config.defaultRegion,
      category: body.category || config.defaultCategory,
      keyword,
      dateRange: body.dateRange || config.dateRange,
      currency: config.currency,
    });
    allRows.push(...payload.items.map((item) => ({ ...item, keyword })));
  }
  const seen = new Set();
  const items = allRows.filter((item) => {
    const key = item.productId || item.productUrl || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((item, index) => ({ ...item, rank: index + 1 }));
  return {
    source: "apify-backend",
    region: body.region || config.defaultRegion,
    category: body.category || config.defaultCategory,
    keyword: keywords.join(", "),
    dateRange: body.dateRange || config.dateRange,
    currency: config.currency,
    callTime: new Date().toISOString(),
    items,
  };
}

async function startApifyActor(input, keyword) {
  const actorId = input.searchActorId || input.actorId || process.env.APIFY_SEARCH_ACTOR_ID || "sentry~tiktok-shop-search-pro";
  if (!hasApifyToken()) throw new Error("Missing APIFY_TOKEN in backend .env");
  const encodedActorId = encodeURIComponent(actorId);
  const url = `https://api.apify.com/v2/actors/${encodedActorId}/runs`;
  const response = await fetch(url, {
    method: "POST",
    headers: apifyHeaders(),
    body: JSON.stringify(buildActorInput(input, keyword)),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify ${response.status}: ${text.slice(0, 300)}`);
  }
  const payload = await response.json();
  return payload.data || payload;
}

async function getApifyRun(runId) {
  const response = await fetch(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}`, {
    headers: apifyHeaders(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify run ${response.status}: ${text.slice(0, 300)}`);
  }
  const payload = await response.json();
  return payload.data || payload;
}

async function getDatasetItems(datasetId) {
  const response = await fetch(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json`, {
    headers: apifyHeaders(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify dataset ${response.status}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

async function getLastDatasetItems(config) {
  if (!hasApifyToken()) throw new Error("Missing APIFY_TOKEN in backend .env");
  const actorId = config.searchActorId || process.env.APIFY_SEARCH_ACTOR_ID || "sentry~tiktok-shop-search-pro";
  const url = `https://api.apify.com/v2/actors/${encodeURIComponent(actorId)}/runs/last/dataset/items?status=SUCCEEDED&clean=true&format=json`;
  const response = await fetch(url, { headers: apifyHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify last dataset ${response.status}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

async function getApifyRuns(config, limit = 20) {
  if (!hasApifyToken()) throw new Error("Missing APIFY_TOKEN in backend .env");
  const actorId = config.searchActorId || process.env.APIFY_SEARCH_ACTOR_ID || "sentry~tiktok-shop-search-pro";
  const url = `https://api.apify.com/v2/actors/${encodeURIComponent(actorId)}/runs?desc=1&limit=${Math.max(1, Math.min(50, Number(limit) || 20))}`;
  const response = await fetch(url, { headers: apifyHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify runs ${response.status}: ${text.slice(0, 300)}`);
  }
  const payload = await response.json();
  return payload.data?.items || payload.items || [];
}

async function handleSearch(req, res) {
  const state = readState();
  const startedAt = new Date().toISOString();
  try {
    const body = JSON.parse((await readBody(req)) || "{}");
    const config = { ...state.config, ...sanitizeConfig(body) };
    const keywords = (body.keyword ? [body.keyword] : body.keywords || config.keywords || [])
      .map((keyword) => String(keyword).trim())
      .filter(Boolean)
      .slice(0, 20);
    if (!keywords.length) keywords.push("hair clip");

    const result = await runProviderSearch(config, body, keywords);

    state.stats.totalQueries += keywords.length;
    state.stats.todayKey = todayKey();
    state.stats.todayQueries += keywords.length;
    state.stats.lastQueryAt = startedAt;
    state.stats.lastError = null;
    state.lastResult = { ...result, callTime: result.callTime || startedAt };
    writeState(state);
    sendJson(res, 200, state.lastResult);
  } catch (error) {
    state.stats.lastError = error.message;
    writeState(state);
    sendJson(res, 500, { error: error.message });
  }
}

async function handleLastResult(res) {
  try {
    const state = readState();
    const raw = await getLastDatasetItems(state.config);
    const payload = normalizePayload(raw, {
      region: state.config.defaultRegion,
      category: state.config.defaultCategory,
      keyword: "",
      dateRange: state.config.dateRange,
      currency: state.config.currency,
    });
    const actualRegions = [...new Set(payload.items.map((item) => item.sourceRegion).filter(Boolean))];
    state.lastResult = { ...payload, region: actualRegions.join(" / ") || payload.region, source: "apify-last-run" };
    state.stats.lastQueryAt = new Date().toISOString();
    state.stats.lastError = null;
    writeState(state);
    sendJson(res, 200, adminStatePayload(state));
  } catch (error) {
    const state = readState();
    state.stats.lastError = error.message;
    writeState(state);
    sendJson(res, 500, { error: error.message });
  }
}

async function handleRuns(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const state = readState();
    const runs = await getApifyRuns(state.config, url.searchParams.get("limit") || 20);
    sendJson(res, 200, { runs: runs.map(summarizeRun) });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

function summarizeRun(run) {
  return {
    id: run.id,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    defaultDatasetId: run.defaultDatasetId,
    usageUsd: run.usageUsd ?? run.usageTotalUsd ?? null,
    origin: run.meta?.origin || run.origin || "",
  };
}

async function handleAsyncSearch(req, res) {
  try {
    const state = readState();
    const body = JSON.parse((await readBody(req)) || "{}");
    const config = { ...state.config, ...sanitizeConfig(body) };
    if (config.provider !== "apify") {
      sendJson(res, 400, { error: "异步抓取目前只支持 Apify Actor；4Seller/Generic 请使用“按配置抓取”。" });
      return;
    }
    const keywords = (body.keyword ? [body.keyword] : body.keywords || config.keywords || [])
      .map((keyword) => String(keyword).trim())
      .filter(Boolean)
      .slice(0, 20);
    if (!keywords.length) keywords.push("hair clip");

    const runs = [];
    for (const keyword of keywords) {
      const run = await startApifyActor({ ...config, region: body.region || config.defaultRegion }, keyword);
      runs.push({ keyword, runId: run.id, status: run.status, defaultDatasetId: run.defaultDatasetId });
    }
    const jobId = `job-${Date.now()}`;
    jobs.set(jobId, {
      id: jobId,
      status: "RUNNING",
      startedAt: new Date().toISOString(),
      region: body.region || config.defaultRegion,
      category: body.category || config.defaultCategory,
      dateRange: body.dateRange || config.dateRange,
      currency: config.currency,
      runs,
      resultSaved: false,
    });
    sendJson(res, 202, { jobId, status: "RUNNING", runs });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function handleJobStatus(req, res, jobId) {
  try {
    const job = jobs.get(jobId);
    if (!job) {
      sendJson(res, 404, { error: "Job not found" });
      return;
    }
    const updatedRuns = [];
    for (const runRef of job.runs) {
      const run = await getApifyRun(runRef.runId);
      updatedRuns.push({ ...runRef, ...summarizeRun(run) });
    }
    job.runs = updatedRuns;
    const done = updatedRuns.every((run) => ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.status));
    job.status = done ? (updatedRuns.every((run) => run.status === "SUCCEEDED") ? "SUCCEEDED" : "FINISHED_WITH_ERRORS") : "RUNNING";

    if (done && !job.resultSaved) {
      const allRows = [];
      for (const run of updatedRuns.filter((item) => item.status === "SUCCEEDED" && item.defaultDatasetId)) {
        const raw = await getDatasetItems(run.defaultDatasetId);
        const payload = normalizePayload(raw, {
          region: job.region,
          category: job.category,
          keyword: run.keyword,
          dateRange: job.dateRange,
          currency: job.currency,
        });
        allRows.push(...payload.items.map((item) => ({ ...item, keyword: run.keyword })));
      }
      const seen = new Set();
      const items = allRows.filter((item) => {
        const key = item.productId || item.productUrl || item.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).map((item, index) => ({ ...item, rank: index + 1 }));
      const state = readState();
      state.stats.totalQueries += updatedRuns.length;
      state.stats.todayKey = todayKey();
      state.stats.todayQueries += updatedRuns.length;
      state.stats.lastQueryAt = new Date().toISOString();
      state.stats.lastError = job.status === "SUCCEEDED" ? null : "Some async runs did not succeed";
      state.lastResult = {
        source: "apify-async",
        region: job.region,
        category: job.category,
        keyword: updatedRuns.map((run) => run.keyword).join(", "),
        dateRange: job.dateRange,
        currency: job.currency,
        callTime: new Date().toISOString(),
        items,
      };
      writeState(state);
      job.resultSaved = true;
      job.lastResult = state.lastResult;
    }
    jobs.set(jobId, job);
    sendJson(res, 200, job);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function handleSaveConfig(req, res) {
  try {
    const state = readState();
    const body = JSON.parse((await readBody(req)) || "{}");
    state.config = { ...state.config, ...sanitizeConfig(body) };
    writeState(state);
    sendJson(res, 200, adminStatePayload(state));
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function handleSupplierFetch(req, res) {
  try {
    const state = readState();
    const body = JSON.parse((await readBody(req)) || "{}");
    const urls = Array.isArray(body.urls) ? body.urls : [body.url].filter(Boolean);
    const results = [];
    for (const rawUrl of urls.slice(0, 10)) {
      const url = String(rawUrl || "").trim();
      if (!url) continue;
      try {
        const provider = state.config.supplierDetailProvider || "parse1688";
        const details = provider === "parse1688" && /1688\.com/i.test(url)
          ? await fetchParse1688Details(state.config, url)
          : provider === "manual"
            ? (() => { throw new Error("Manual mode: paste product title/specs for review"); })()
            : await fetchSupplierPage(url);
        results.push({ ok: true, url, details });
      } catch (error) {
        if ((state.config.supplierDetailProvider || "parse1688") === "parse1688") {
          try {
            const details = await fetchSupplierPage(url);
            results.push({ ok: true, url, details, fallback: "page-fetch" });
            continue;
          } catch (fallbackError) {
            results.push({ ok: false, url, error: `${error.message}; fallback: ${fallbackError.message}` });
            continue;
          }
        }
        results.push({ ok: false, url, error: error.message });
      }
    }
    sendJson(res, 200, { results });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function handleFeishuSupplierLinks(req, res) {
  try {
    const state = readState();
    const body = JSON.parse((await readBody(req)) || "{}");
    const config = { ...state.config, ...sanitizeConfig(body) };
    const result = await fetchFeishuSupplierLinks(config);
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function handleTikTokCallback(req, res, url) {
  const state = readState();
  const code = url.searchParams.get("code");
  const incomingState = url.searchParams.get("state");
  const denied = url.searchParams.get("error");
  try {
    if (denied || !code || code === "null") throw new Error(denied || "TikTok authorization was cancelled");
    if (state.tiktok.authState && incomingState !== state.tiktok.authState) throw new Error("TikTok authorization state mismatch");
    const tokenData = await exchangeTikTokCode(code);
    state.tiktok.token = normalizeTikTokToken(tokenData);
    state.tiktok.authState = null;
    writeState(state);
    state.tiktok.shops = await fetchTikTokAuthorizedShops();
    state.tiktok.lastError = null;
    writeState(state);
    res.writeHead(302, { Location: "/admin?tiktok=connected" });
    res.end();
  } catch (error) {
    state.tiktok.lastError = error.message;
    writeState(state);
    res.writeHead(302, { Location: `/admin?tiktok_error=${encodeURIComponent(error.message)}` });
    res.end();
  }
}

async function handleTikTokAuthUrl(req, res) {
  try {
    sendJson(res, 200, { url: buildTikTokAuthUrl(req) });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

function handleTikTokConnection(res) {
  const state = readState();
  sendJson(res, 200, publicTikTokConnection(state.tiktok));
}

async function handleTikTokRefreshShops(res) {
  const state = readState();
  try {
    state.tiktok.shops = await fetchTikTokAuthorizedShops();
    state.tiktok.lastError = null;
    writeState(state);
    sendJson(res, 200, publicTikTokConnection(state.tiktok));
  } catch (error) {
    state.tiktok.lastError = error.message;
    writeState(state);
    sendJson(res, 400, { error: error.message, connection: publicTikTokConnection(state.tiktok) });
  }
}

async function handleTikTokSyncProducts(req, res) {
  try {
    const body = JSON.parse((await readBody(req)) || "{}");
    sendJson(res, 200, await syncTikTokProducts(body.limit || 50));
  } catch (error) {
    const state = readState();
    state.tiktok.lastError = error.message;
    writeState(state);
    sendJson(res, 400, { error: error.message, connection: publicTikTokConnection(state.tiktok) });
  }
}

function handleTikTokReset(res) {
  const state = readState();
  state.tiktok = {
    ...defaultState.tiktok,
    lastError: null,
  };
  writeState(state);
  sendJson(res, 200, publicTikTokConnection(state.tiktok));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "POST" && url.pathname === "/api/login") {
    handleLogin(req, res);
    return;
  }
  if (req.method === "GET" && (url.pathname === "/login" || url.pathname === "/login.html")) {
    serveStatic(req, res);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/tiktok/callback") {
    handleTikTokCallback(req, res, url);
    return;
  }
  if (isAdminRequest(url) && !isAuthorized(req)) {
    sendUnauthorized(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/admin/logout") {
    handleLogout(req, res);
    return;
  }
  if (req.method === "GET" && (url.pathname === "/api/config" || url.pathname === "/api/admin/state")) {
    const state = readState();
    sendJson(res, 200, adminStatePayload(state));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/admin/config") {
    handleSaveConfig(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/admin/supplier-fetch") {
    handleSupplierFetch(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/admin/feishu-supplier-links") {
    handleFeishuSupplierLinks(req, res);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/admin/tiktok/connection") {
    handleTikTokConnection(res);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/admin/tiktok/auth-url") {
    handleTikTokAuthUrl(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/admin/tiktok/shops") {
    handleTikTokRefreshShops(res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/admin/tiktok/products") {
    handleTikTokSyncProducts(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/admin/tiktok/reset") {
    handleTikTokReset(res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/admin/reset-stats") {
    const state = readState();
    state.stats = { ...defaultState.stats, todayKey: todayKey() };
    writeState(state);
    sendJson(res, 200, adminStatePayload(state));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/admin/apify-last") {
    handleLastResult(res);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/admin/runs") {
    handleRuns(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/products/search-async") {
    handleAsyncSearch(req, res);
    return;
  }
  if (req.method === "GET" && url.pathname.startsWith("/api/admin/jobs/")) {
    handleJobStatus(req, res, decodeURIComponent(url.pathname.split("/").pop()));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/products/search") {
    handleSearch(req, res);
    return;
  }
  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(port, () => {
  console.log(`TikTok Product Sourcing app running at http://localhost:${port}`);
});
