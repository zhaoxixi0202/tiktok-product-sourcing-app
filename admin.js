const state = {
  config: null,
  stats: null,
  account: null,
  lastResult: null,
  tiktok: null,
};

const el = {
  configPageTab: document.querySelector("#configPageTab"),
  rankingPageTab: document.querySelector("#rankingPageTab"),
  tiktokPageTab: document.querySelector("#tiktokPageTab"),
  supplierPageTab: document.querySelector("#supplierPageTab"),
  configPage: document.querySelector("#configPage"),
  rankingPage: document.querySelector("#rankingPage"),
  tiktokPage: document.querySelector("#tiktokPage"),
  supplierPage: document.querySelector("#supplierPage"),
  languageSwitch: document.querySelector("#languageSwitch"),
  frontLink: document.querySelector("#frontLink"),
  logoutButton: document.querySelector("#logoutButton"),
  permissionStatus: document.querySelector("#permissionStatus"),
  keywordSummary: document.querySelector("#keywordSummary"),
  saveStatus: document.querySelector("#saveStatus"),
  provider: document.querySelector("#provider"),
  apiBaseUrl: document.querySelector("#apiBaseUrl"),
  searchActorId: document.querySelector("#searchActorId"),
  detailActorId: document.querySelector("#detailActorId"),
  defaultRegion: document.querySelector("#defaultRegion"),
  defaultCategory: document.querySelector("#defaultCategory"),
  dateRange: document.querySelector("#dateRange"),
  currency: document.querySelector("#currency"),
  supplierDetailProvider: document.querySelector("#supplierDetailProvider"),
  supplierDetailApiUrl: document.querySelector("#supplierDetailApiUrl"),
  feishuSheetUrl: document.querySelector("#feishuSheetUrl"),
  feishuSheetRange: document.querySelector("#feishuSheetRange"),
  feishuLinkColumn: document.querySelector("#feishuLinkColumn"),
  supplierFeishuSheetUrl: document.querySelector("#supplierFeishuSheetUrl"),
  supplierFeishuSheetRange: document.querySelector("#supplierFeishuSheetRange"),
  supplierFeishuLinkColumn: document.querySelector("#supplierFeishuLinkColumn"),
  limitPerKeyword: document.querySelector("#limitPerKeyword"),
  page: document.querySelector("#page"),
  keywords: document.querySelector("#keywords"),
  configForm: document.querySelector("#configForm"),
  runSearch: document.querySelector("#runSearch"),
  runAsyncSearch: document.querySelector("#runAsyncSearch"),
  loadLastRun: document.querySelector("#loadLastRun"),
  refreshRuns: document.querySelector("#refreshRuns"),
  resetStats: document.querySelector("#resetStats"),
  tiktokConnectionStatus: document.querySelector("#tiktokConnectionStatus"),
  tiktokConnectionDetail: document.querySelector("#tiktokConnectionDetail"),
  tiktokConnectionBadge: document.querySelector("#tiktokConnectionBadge"),
  tiktokPageTitle: document.querySelector("#tiktokPageTitle"),
  tiktokPageDesc: document.querySelector("#tiktokPageDesc"),
  tiktokConnectionEyebrow: document.querySelector("#tiktokConnectionEyebrow"),
  tiktokSecretNote: document.querySelector("#tiktokSecretNote"),
  connectTikTokShop: document.querySelector("#connectTikTokShop"),
  refreshTikTokShops: document.querySelector("#refreshTikTokShops"),
  syncTikTokProducts: document.querySelector("#syncTikTokProducts"),
  syncTikTokPromotions: document.querySelector("#syncTikTokPromotions"),
  resetTikTokAuth: document.querySelector("#resetTikTokAuth"),
  tiktokShopList: document.querySelector("#tiktokShopList"),
  tiktokProductList: document.querySelector("#tiktokProductList"),
  promoAdviceTitle: document.querySelector("#promoAdviceTitle"),
  promoAdviceSummary: document.querySelector("#promoAdviceSummary"),
  promoAdviceSignal: document.querySelector("#promoAdviceSignal"),
  promoAdviceGrid: document.querySelector("#promoAdviceGrid"),
  accountDetail: document.querySelector("#accountDetail"),
  lastError: document.querySelector("#lastError"),
  search: document.querySelector("#search"),
  recommendationFilter: document.querySelector("#recommendationFilter"),
  keywordFilter: document.querySelector("#keywordFilter"),
  marketFilter: document.querySelector("#marketFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  analyzeProducts: document.querySelector("#analyzeProducts"),
  downloadCsv: document.querySelector("#downloadCsv"),
  analysisSummary: document.querySelector("#analysisSummary"),
  adviceSummary: document.querySelector("#adviceSummary"),
  adviceSignal: document.querySelector("#adviceSignal"),
  adviceGrid: document.querySelector("#adviceGrid"),
  supplierInput: document.querySelector("#supplierInput"),
  reviewSupplierRisk: document.querySelector("#reviewSupplierRisk"),
  importSupplierLinks: document.querySelector("#importSupplierLinks"),
  supplierRiskBadge: document.querySelector("#supplierRiskBadge"),
  supplierRiskGrid: document.querySelector("#supplierRiskGrid"),
  listMeta: document.querySelector("#listMeta"),
  jobStatus: document.querySelector("#jobStatus"),
  runRows: document.querySelector("#runRows"),
  rows: document.querySelector("#rows"),
};

let activeJobId = "";
let jobTimer = null;
let currentLanguage = localStorage.getItem("adminLanguage") || "zh";

const i18n = {
  zh: {
    front: "返回前台榜单",
    logout: "退出登录",
    tabConfig: "配置中心",
    tabRanking: "榜单分析",
    tabTiktok: "店铺商品",
    tabSupplier: "货源审核",
    tiktokTitle: "店铺商品",
    tiktokDesc: "授权 TikTok Shop 店铺后，同步并预览店铺商品列表。",
    openApi: "官方 Open API",
    connectionBadge: "店铺连接",
    connect: "连接 TikTok Shop",
    refreshShops: "刷新店铺",
    syncProducts: "同步商品",
    syncPromotions: "同步促销",
    resetAuth: "重置授权",
    configuredMissing: "缺少 Key / Secret",
    configuredMissingDetail: "请在 Render Environment Variables 添加 TIKTOK_APP_KEY、TIKTOK_APP_SECRET、TIKTOK_SERVICE_ID、TIKTOK_REDIRECT_URI，然后重新部署。",
    notAuthorized: "未授权店铺",
    notAuthorizedDetail: "配置已就绪，点击连接 TikTok Shop 后用店铺账号授权。",
    authorized: "已授权",
    shopsCount: (count) => `${count} 个店铺`,
    noShopRead: "未读取到店铺",
    noSync: "尚未同步商品",
    lastSync: (value) => `最近同步：${value}`,
    scopesLine: (required, granted) => `需要权限：${required || "-"}；Token 已授权：${granted || "TikTok 未返回 scopes，若仍报错请重置授权后重新连接"}`,
    secretNote: "App Key、App Secret、Redirect URL 只在 Render Environment Variables 里配置。页面只显示授权状态，不显示密钥。",
    authorizedShops: "已授权店铺",
    noShops: "暂无店铺。授权后会显示店铺市场和店铺编码。",
    shopProducts: "店铺商品",
    noProducts: "暂无商品。授权店铺后点同步商品。",
    productScore: "评分",
    productAdvice: "建议",
    productFields: "已获取字段",
    productCanPush: "可优先优化",
    productWatch: "先补充信息",
    productAvoid: "暂缓",
    productScoreSummary: (total, recommend, watch, avoid) => `已分析 ${total} 个店铺商品：可优先优化 ${recommend}，先补充信息 ${watch}，暂缓 ${avoid}。`,
    promoTitle: "产品促销组合建议",
    promoEmpty: "同步店铺商品后，会按价格、库存和品类给出组合促销建议。",
    promoReady: "可组合",
    promoWaiting: "待分析",
    promoBundle: "组合包",
    promoAddOn: "加购款",
    promoThreshold: "满减门槛",
    promoContent: "短视频话术",
    promoExisting: (count) => `已读取 ${count} 个促销`,
    promoNoExisting: "暂无已读取促销",
    promoPlan: "本周执行方案",
    promoHero: "主推商品",
    promoMechanics: "活动机制",
    promoOperations: "执行步骤",
    stock: "库存",
    typeHair: "头饰",
    typeEarrings: "耳饰",
    typeNecklace: "项链",
    typeBagCard: "包挂与卡包",
    typeOther: "其他",
    opening: "打开中...",
    refreshing: "刷新中...",
    syncing: "同步中...",
    syncingPromotions: "同步促销中...",
  },
  en: {
    front: "Back to Public List",
    logout: "Logout",
    tabConfig: "Settings",
    tabRanking: "Ranking Analysis",
    tabTiktok: "Shop Products",
    tabSupplier: "Supplier Review",
    tiktokTitle: "Shop Products",
    tiktokDesc: "Authorize your TikTok Shop, then sync and preview your shop product list.",
    openApi: "Official Open API",
    connectionBadge: "Shop Connection",
    connect: "Connect TikTok Shop",
    refreshShops: "Refresh Shops",
    syncProducts: "Sync Products",
    syncPromotions: "Sync Promotions",
    resetAuth: "Reset Auth",
    configuredMissing: "Missing Key / Secret",
    configuredMissingDetail: "Add TIKTOK_APP_KEY, TIKTOK_APP_SECRET, TIKTOK_SERVICE_ID, and TIKTOK_REDIRECT_URI in Render Environment Variables, then redeploy.",
    notAuthorized: "Shop Not Authorized",
    notAuthorizedDetail: "Configuration is ready. Connect TikTok Shop and authorize with your seller account.",
    authorized: "Authorized",
    shopsCount: (count) => `${count} shop${count === 1 ? "" : "s"}`,
    noShopRead: "No shop loaded",
    noSync: "Products not synced yet",
    lastSync: (value) => `Last sync: ${value}`,
    scopesLine: (required, granted) => `Required scopes: ${required || "-"}; Token scopes: ${granted || "TikTok did not return scopes. Reset auth and reconnect if it still fails."}`,
    secretNote: "App Key, App Secret, and Redirect URL stay in Render Environment Variables. This page never displays secrets.",
    authorizedShops: "Authorized Shops",
    noShops: "No shops yet. Authorized shops will show market and shop code here.",
    shopProducts: "Shop Products",
    noProducts: "No products yet. Authorize a shop, then click Sync Products.",
    productScore: "Score",
    productAdvice: "Advice",
    productFields: "Fetched Fields",
    productCanPush: "Optimize First",
    productWatch: "Needs Work",
    productAvoid: "Pause",
    productScoreSummary: (total, recommend, watch, avoid) => `Analyzed ${total} shop products: ${recommend} optimize first, ${watch} need work, ${avoid} paused.`,
    promoTitle: "Promotion Bundle Suggestions",
    promoEmpty: "After syncing shop products, suggestions will be generated by price, stock, and category.",
    promoReady: "Bundle Ready",
    promoWaiting: "Waiting",
    promoBundle: "Bundle",
    promoAddOn: "Add-on",
    promoThreshold: "Spend Threshold",
    promoContent: "Video Angle",
    promoExisting: (count) => `${count} promotion${count === 1 ? "" : "s"} loaded`,
    promoNoExisting: "No promotion loaded",
    promoPlan: "This Week's Plan",
    promoHero: "Hero Product",
    promoMechanics: "Promotion Mechanics",
    promoOperations: "Execution Steps",
    stock: "Stock",
    typeHair: "Hair Accessories",
    typeEarrings: "Earrings",
    typeNecklace: "Necklace",
    typeBagCard: "Bag & Card",
    typeOther: "Other",
    opening: "Opening...",
    refreshing: "Refreshing...",
    syncing: "Syncing...",
    syncingPromotions: "Syncing Promotions...",
  },
};

function t(key, ...args) {
  const value = i18n[currentLanguage]?.[key] ?? i18n.zh[key] ?? key;
  return typeof value === "function" ? value(...args) : value;
}

function applyLanguage() {
  if (el.languageSwitch) el.languageSwitch.value = currentLanguage;
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
  el.frontLink.textContent = t("front");
  el.logoutButton.textContent = t("logout");
  el.configPageTab.textContent = t("tabConfig");
  el.rankingPageTab.textContent = t("tabRanking");
  el.tiktokPageTab.textContent = t("tabTiktok");
  el.supplierPageTab.textContent = t("tabSupplier");
  el.tiktokPageTitle.textContent = t("tiktokTitle");
  el.tiktokPageDesc.textContent = t("tiktokDesc");
  el.promoAdviceTitle.textContent = t("promoTitle");
  el.tiktokConnectionEyebrow.textContent = t("openApi");
  el.tiktokConnectionBadge.textContent = t("connectionBadge");
  el.connectTikTokShop.textContent = t("connect");
  el.refreshTikTokShops.textContent = t("refreshShops");
  el.syncTikTokProducts.textContent = t("syncProducts");
  el.syncTikTokPromotions.textContent = t("syncPromotions");
  el.resetTikTokAuth.textContent = t("resetAuth");
  el.tiktokSecretNote.textContent = t("secretNote");
  el.typeFilter.querySelector('option[value="hair"]').textContent = t("typeHair");
  el.typeFilter.querySelector('option[value="earrings"]').textContent = t("typeEarrings");
  el.typeFilter.querySelector('option[value="necklace"]').textContent = t("typeNecklace");
  el.typeFilter.querySelector('option[value="bag-card"]').textContent = t("typeBagCard");
  el.typeFilter.querySelector('option[value="other"]').textContent = t("typeOther");
  renderTikTokConnection(state.tiktok);
  renderTikTokPromotionAdvice(state.tiktok?.products || [], state.tiktok?.promotions || []);
  renderRows();
}

function fillForm() {
  const config = state.config || {};
  el.provider.value = config.provider || "apify";
  el.apiBaseUrl.value = config.apiBaseUrl || "";
  el.searchActorId.value = config.searchActorId || "";
  el.detailActorId.value = config.detailActorId || "";
  el.defaultRegion.value = config.defaultRegion || "SG";
  el.defaultCategory.value = config.defaultCategory || "Fashion Accessories";
  el.dateRange.value = config.dateRange || "last7Day";
  el.currency.value = config.currency || "SGD";
  el.supplierDetailProvider.value = config.supplierDetailProvider || "parse1688";
  el.supplierDetailApiUrl.value = config.supplierDetailApiUrl || "https://api.parse.bot/scraper/bb0ade25-1595-4730-86be-b24affd889da";
  el.feishuSheetUrl.value = config.feishuSheetUrl || "";
  el.feishuSheetRange.value = config.feishuSheetRange || "";
  el.feishuLinkColumn.value = config.feishuLinkColumn || "A";
  el.supplierFeishuSheetUrl.value = config.feishuSheetUrl || "";
  el.supplierFeishuSheetRange.value = config.feishuSheetRange || "";
  el.supplierFeishuLinkColumn.value = config.feishuLinkColumn || "A";
  el.limitPerKeyword.value = config.limitPerKeyword || 10;
  el.page.value = config.page || 1;
  el.keywords.value = (config.keywords || []).join("\n");
}

function readForm() {
  return {
    provider: el.provider.value,
    apiBaseUrl: el.apiBaseUrl.value.trim(),
    searchActorId: el.searchActorId.value.trim(),
    detailActorId: el.detailActorId.value.trim(),
    defaultRegion: el.defaultRegion.value,
    defaultCategory: el.defaultCategory.value,
    dateRange: el.dateRange.value,
    currency: el.currency.value.trim() || "SGD",
    supplierDetailProvider: el.supplierDetailProvider.value,
    supplierDetailApiUrl: el.supplierDetailApiUrl.value.trim(),
    feishuSheetUrl: el.feishuSheetUrl.value.trim(),
    feishuSheetRange: el.feishuSheetRange.value.trim(),
    feishuLinkColumn: el.feishuLinkColumn.value.trim() || "A",
    limitPerKeyword: Number(el.limitPerKeyword.value || 10),
    page: Number(el.page.value || 1),
    keywords: el.keywords.value,
  };
}

function keywordListFromForm() {
  return el.keywords.value.split(/\r?\n|,/).map((keyword) => keyword.trim()).filter(Boolean);
}

function confirmPaidRun(mode) {
  const keywords = keywordListFromForm();
  const keywordCount = keywords.length || 1;
  const limit = Number(el.limitPerKeyword.value || 10);
  const label = mode === "async" ? "异步抓取" : "按配置抓取";
  const provider = el.provider.value;
  const costText = provider === "apify"
    ? "会启动 Apify run，可能产生费用。"
    : provider === "demo"
      ? "会使用本地演示数据，不会消耗外部额度。"
      : "会调用已配置的热销榜接口，可能消耗接口额度。";
  return window.confirm(
    `${label}${costText}\n\n` +
      `本次预计：${keywordCount} 个关键词 × 每词 ${limit} 条。\n` +
      `关键词：${keywords.slice(0, 8).join(", ")}${keywords.length > 8 ? "..." : ""}\n\n` +
      `如果只是查看旧数据，建议取消后点“读取上次成功结果”。\n\n确认继续吗？`
  );
}

function renderStats() {
  const stats = state.stats || {};
  const account = state.account || {};
  const actualRegions = [...new Set(normalizeItems().map((item) => item.sourceRegion).filter(Boolean))];
  const configuredRegion = state.config?.defaultRegion || "";
  const regionMismatch = configuredRegion && actualRegions.length && !actualRegions.includes(configuredRegion);
  el.permissionStatus.textContent = account.apifyConfigured ? "已连接" : "缺 Token";
  el.keywordSummary.textContent = keywordsFromItems().join(" / ") || "-";
  el.listMeta.textContent = `最近抓取时间：${state.lastResult?.callTime ? new Date(state.lastResult.callTime).toLocaleString() : "-"}；数据来源：${state.lastResult?.source || "-"}；配置地区：${configuredRegion || "-"}；实际地区：${actualRegions.join(" / ") || state.lastResult?.region || "-"}${regionMismatch ? "；注意：返回市场与配置不一致" : ""}`;
  const protectedText = account.adminProtected ? "后台已启用密码保护" : "后台未启用密码保护";
  const tokenText = account.apifyConfigured ? "Token 已配置，内容已隐藏" : "Token 未配置";
  const supplierText = account.supplierDetailConfigured ? `${account.supplierDetailProvider || "-"} 已配置` : `${account.supplierDetailProvider || "-"} 缺 Token`;
  const feishuText = account.feishuConfigured ? "飞书表格已配置" : "飞书表格未配置或缺密钥";
  const tiktokText = account.tiktokAuthorized ? `TikTok 已授权 ${account.tiktokShopCount || 0} 个店铺` : account.tiktokConfigured ? "TikTok Key 已配置，待授权店铺" : "TikTok Key 未配置";
  el.accountDetail.textContent = `当前数据源：${account.provider || "-"}，搜索 Actor：${account.searchActorId || "-"}，${tokenText}；货源详情：${supplierText}；${feishuText}；${tiktokText}；${protectedText}。线上请在部署平台 Secrets 中配置 ADMIN_USERNAME、ADMIN_PASSWORD、APIFY_TOKEN、PARSE_API_KEY、LARK_APP_ID、LARK_APP_SECRET、TIKTOK_APP_KEY、TIKTOK_APP_SECRET、TIKTOK_SERVICE_ID 和 TIKTOK_REDIRECT_URI。`;
  el.lastError.textContent = stats.lastError ? `最近错误：${stats.lastError}` : "";
}

function renderTikTokConnection(connection = state.tiktok) {
  const tiktok = connection || {};
  if (!el.tiktokConnectionStatus) return;
  if (!tiktok.configured) {
    el.tiktokConnectionStatus.textContent = t("configuredMissing");
    el.tiktokConnectionDetail.textContent = t("configuredMissingDetail");
  } else if (!tiktok.authorized) {
    el.tiktokConnectionStatus.textContent = t("notAuthorized");
    el.tiktokConnectionDetail.textContent = tiktok.lastError || t("notAuthorizedDetail");
  } else {
    const shopText = tiktok.shops?.length ? t("shopsCount", tiktok.shops.length) : t("noShopRead");
    const syncText = tiktok.lastSyncAt ? t("lastSync", new Date(tiktok.lastSyncAt).toLocaleString()) : t("noSync");
    const requiredScopes = (tiktok.requiredScopes || []).join(", ");
    const grantedScopes = (tiktok.scopes || []).join(", ");
    el.tiktokConnectionStatus.textContent = t("authorized");
    el.tiktokConnectionDetail.textContent = `${shopText}；${syncText}。${t("scopesLine", requiredScopes, grantedScopes)}`;
  }

  el.refreshTikTokShops.disabled = !tiktok.authorized;
  el.syncTikTokProducts.disabled = !tiktok.authorized;
  el.syncTikTokPromotions.disabled = !tiktok.authorized;
  el.resetTikTokAuth.disabled = !tiktok.authorized && !tiktok.lastError;
  renderTikTokShops(tiktok.shops || []);
  renderTikTokProducts(tiktok.products || []);
  renderTikTokPromotionAdvice(tiktok.products || [], tiktok.promotions || []);
}

function renderTikTokShops(shops) {
  el.tiktokShopList.innerHTML = `
    <h4>${t("authorizedShops")}</h4>
    ${shops.length ? shops.map((shop) => `
      <div class="mini-row">
        <strong>${escapeHtml(shop.name || shop.id || "TikTok Shop")}</strong>
        <span>${escapeHtml([shop.region, shop.seller_type, shop.code].filter(Boolean).join(" · ") || "-")}</span>
      </div>
    `).join("") : `<p>${t("noShops")}</p>`}
  `;
}

function renderTikTokProducts(products) {
  const visibleProducts = products.slice(0, 12);
  const analyses = products.map(scoreTikTokShopProduct);
  const recommendCount = analyses.filter((item) => item.recommendation === "recommend").length;
  const watchCount = analyses.filter((item) => item.recommendation === "watch").length;
  const avoidCount = analyses.filter((item) => item.recommendation === "avoid").length;
  el.tiktokProductList.innerHTML = `
    <h4>${t("shopProducts")}</h4>
    ${products.length ? `<p class="mini-summary">${t("productScoreSummary", products.length, recommendCount, watchCount, avoidCount)}</p>` : ""}
    ${visibleProducts.length ? visibleProducts.map((product) => {
      const analysis = scoreTikTokShopProduct(product);
      return `
      <div class="shop-product-row">
        ${product.imageUrl ? `<img src="${escapeAttr(product.imageUrl)}" alt="${escapeAttr(product.title || "TikTok Shop product")}" loading="lazy" referrerpolicy="no-referrer" />` : `<div class="shop-product-image-empty">No image</div>`}
        <div class="shop-product-main">
          <strong>${escapeHtml(product.title || "Untitled product")}</strong>
          <span>${escapeHtml([product.status, product.currency && product.price ? `${product.currency} ${product.price}` : "", product.inventory == null ? "" : `${t("stock")} ${product.inventory}`].filter(Boolean).join(" · ") || "-")}</span>
          <small>${escapeHtml(analysis.reasons.join(" / "))}</small>
        </div>
        <div class="shop-product-score">
          <span class="pill ${analysis.recommendation}">${analysis.label} ${analysis.score}</span>
        </div>
      </div>
    `;
    }).join("") : `<p>${t("noProducts")}</p>`}
  `;
}

function scoreTikTokShopProduct(product) {
  const title = String(product.title || "").toLowerCase();
  const status = String(product.status || "").toUpperCase();
  const price = Number(product.price || 0);
  const inventory = product.inventory == null ? null : Number(product.inventory || 0);
  const reasons = [];
  let score = 42;

  if (status === "ACTIVATE" || status === "APPROVED") {
    score += 18;
    reasons.push(currentLanguage === "zh" ? "已上架/审核通过" : "Active or approved");
  } else if (status === "PENDING" || status === "DRAFT") {
    score -= 6;
    reasons.push(currentLanguage === "zh" ? "待审核或草稿" : "Pending or draft");
  } else if (status) {
    score -= 14;
    reasons.push(currentLanguage === "zh" ? `状态需复核：${status}` : `Check status: ${status}`);
  }

  if (price >= 5.9 && price <= 29.9) {
    score += 16;
    reasons.push(currentLanguage === "zh" ? "价格带适合配饰测款" : "Good accessory test price");
  } else if (price > 0 && price < 5.9) {
    score += 6;
    reasons.push(currentLanguage === "zh" ? "低价款需确认利润" : "Low price, check margin");
  } else if (price > 29.9 && price <= 99) {
    score += 4;
    reasons.push(currentLanguage === "zh" ? "客单较高，素材要突出质感" : "Higher price, content must prove value");
  } else {
    reasons.push(currentLanguage === "zh" ? "价格缺失或不在测试甜点区" : "Price missing or outside test range");
  }

  if (inventory == null) {
    score -= 4;
    reasons.push(currentLanguage === "zh" ? "库存未返回" : "Inventory unavailable");
  } else if (inventory >= 20) {
    score += 12;
    reasons.push(currentLanguage === "zh" ? "库存有基础" : "Inventory available");
  } else if (inventory > 0) {
    score += 4;
    reasons.push(currentLanguage === "zh" ? "库存偏浅" : "Low inventory");
  } else {
    score -= 18;
    reasons.push(currentLanguage === "zh" ? "无可售库存" : "No sellable stock");
  }

  if (product.imageUrl) {
    score += 10;
    reasons.push(currentLanguage === "zh" ? "有主图" : "Main image available");
  } else {
    score -= 12;
    reasons.push(currentLanguage === "zh" ? "缺主图" : "Missing main image");
  }

  if (/(hair|clip|earring|necklace|bracelet|ring|charm|bag|card|发夹|抓夹|耳环|耳钉|项链|手链|戒指|挂件|卡包)/.test(title)) {
    score += 10;
    reasons.push(currentLanguage === "zh" ? "配饰关键词明确" : "Clear accessory keyword");
  }

  if (/(replica|dupe|logo|disney|sanrio|hello kitty|kuromi|pokemon|chanel|dior|lv|gucci|prada|同款|大牌|复刻|高仿|原单|尾单|佛牌|宗教|美白|减肥|治疗)/.test(title)) {
    score -= 30;
    reasons.push(currentLanguage === "zh" ? "存在侵权/敏感风险词" : "IP or sensitive risk keyword");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const recommendation = score >= 72 ? "recommend" : score >= 48 ? "watch" : "avoid";
  const label = recommendation === "recommend" ? t("productCanPush") : recommendation === "watch" ? t("productWatch") : t("productAvoid");
  return { score, recommendation, label, reasons: reasons.slice(0, 4) };
}

function promoType(product) {
  const title = String(product.title || "").toLowerCase();
  if (/(hair|clip|claw|scrunchie|barrette|发夹|抓夹|头绳)/.test(title)) return "hair";
  if (/(earring|earrings|stud|hoop|耳环|耳钉)/.test(title)) return "earrings";
  if (/(necklace|pendant|chain|choker|项链|吊坠)/.test(title)) return "necklace";
  if (/(bag|card|wallet|strap|charm|卡包|包挂|挂绳)/.test(title)) return "bag-card";
  return "other";
}

function formatMoney(currency, value) {
  const number = Number(value || 0);
  if (!number) return "";
  return `${currency || "SGD"} ${Number.isInteger(number) ? number : number.toFixed(2)}`;
}

function lineBreaks(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function renderTikTokPromotionAdvice(products, promotions = []) {
  if (!el.promoAdviceGrid) return;
  if (!products.length) {
    el.promoAdviceSignal.textContent = t("promoWaiting");
    el.promoAdviceSummary.textContent = t("promoEmpty");
    el.promoAdviceGrid.innerHTML = "";
    return;
  }
  const activeProducts = products
    .map((product) => ({ ...product, priceNumber: Number(product.price || 0), type: promoType(product), analysis: scoreTikTokShopProduct(product) }))
    .filter((product) => product.analysis.recommendation !== "avoid" && product.priceNumber > 0 && Number(product.inventory ?? 1) > 0)
    .sort((a, b) => b.analysis.score - a.analysis.score || b.inventory - a.inventory);
  const hero = activeProducts[0] || products[0];
  const addOns = activeProducts.filter((product) => product.productId !== hero.productId && product.priceNumber <= Math.max(15, Number(hero.price || 0))).slice(0, 3);
  const avgPrice = activeProducts.length ? activeProducts.reduce((sum, product) => sum + product.priceNumber, 0) / activeProducts.length : 0;
  const threshold = Math.ceil((avgPrice * 2.2) / 5) * 5;
  const types = [...new Set(activeProducts.map((product) => typeLabel(product.type)))].slice(0, 4);
  const activePromotions = promotions.filter((promo) => /ACTIVE|ONGOING|APPROVED|START|ENABLE|LIVE/i.test(promo.status));
  const promotionNote = promotions.length ? t("promoExisting", promotions.length) : t("promoNoExisting");
  const heroPrice = formatMoney(hero.currency, hero.price);
  const thresholdText = formatMoney(hero.currency, threshold || 25);
  const discountText = formatMoney(hero.currency, (hero.currency || "SGD") === "SGD" ? 2 : Math.max(1, Math.round((threshold || 25) * 0.08)));
  el.promoAdviceSignal.textContent = activeProducts.length >= 2 ? t("promoReady") : t("promoWaiting");
  el.promoAdviceSummary.textContent = currentLanguage === "zh"
    ? `基于 ${products.length} 个店铺商品，筛出 ${activeProducts.length} 个可组合款；${promotionNote}。建议先做“主推款 + 加购款 + 小额门槛券”。`
    : `Based on ${products.length} shop products, ${activeProducts.length} are bundle candidates; ${promotionNote}. Start with a hero product, add-ons, and a small threshold coupon.`;
  const addOnNames = addOns.map((product) => `${shortTitle(product.title)}（${formatMoney(product.currency, product.price) || "-"}）`).join(" / ");
  const heroReasons = hero.analysis?.reasons?.slice(0, 2).join(" / ") || "";
  const cards = [
    {
      title: t("promoPlan"),
      body: currentLanguage === "zh"
        ? `目标：提高客单价，而不是单纯降价。\n打法：${shortTitle(hero.title)} 做主推，搭配 ${addOns.length ? addOnNames : "1-2 个低价高库存款"}。\n周期：先跑 3-5 天，看点击率、加购率和转化。`
        : `Goal: lift average order value, not just discount.\nMove: use ${shortTitle(hero.title)} as the hero and pair it with ${addOns.length ? addOnNames : "1-2 low-price in-stock add-ons"}.\nRun it for 3-5 days, then check clicks, carts, and conversion.`,
    },
    {
      title: t("promoHero"),
      body: currentLanguage === "zh"
        ? `${shortTitle(hero.title)}｜${heroPrice || "价格待补"}｜库存 ${hero.inventory ?? "-"}。\n选择原因：${heroReasons || "当前评分最高，适合先做素材测试"}。`
        : `${shortTitle(hero.title)} | ${heroPrice || "price missing"} | stock ${hero.inventory ?? "-"}.\nWhy: ${heroReasons || "Highest current score, good first creative test candidate"}.`,
    },
    {
      title: t("promoMechanics"),
      body: currentLanguage === "zh"
        ? `${activePromotions.length ? "已有活动，先检查是否和新券叠加，避免利润被吃掉。" : "目前没有读到活动，建议先在 Seller Center 建一个 Seller Voucher/Coupon。"}\n建议门槛：满 ${thresholdText || "SGD 25"} 减 ${discountText || "SGD 2"}，或第二件 9 折。\n注意：TikTok Open API 主要用于读取促销，创建优惠券通常仍在 Seller Center 操作。`
        : `${activePromotions.length ? "Existing campaigns found. Check stacking before adding another discount." : "No active campaign loaded. Create a Seller Voucher/Coupon in Seller Center first."}\nSuggested threshold: ${discountText || "SGD 2"} off over ${thresholdText || "SGD 25"}, or 10% off the second item.\nNote: TikTok Open API is mainly useful here for reading promotions; coupon creation usually stays in Seller Center.`,
    },
    {
      title: t("promoOperations"),
      body: currentLanguage === "zh"
        ? `1. 先确认主推款库存和主图完整。\n2. 用加购款做套装图或直播口播：“买主推加 ${addOns[0] ? shortTitle(addOns[0].title) : "小配饰"} 更划算”。\n3. 短视频拍：上班前 30 秒搭配 / 一套衣服换 3 个配饰 / 热天轻便不夸张。\n4. 结束后保留转化好的款，低点击款换封面或标题。`
        : `1. Confirm hero stock and main image.\n2. Use add-ons in bundle images or live scripts: buy the hero with ${addOns[0] ? shortTitle(addOns[0].title) : "a small accessory"} for better value.\n3. Video hooks: 30-second office styling / one outfit, three accessories / light humid-weather styling.\n4. Keep converters; refresh covers or titles for low-click products.`,
    },
  ];
  el.promoAdviceGrid.innerHTML = cards.map((card) => `
    <article class="advice-card">
      <h4>${escapeHtml(card.title)}</h4>
      <p>${lineBreaks(card.body)}</p>
    </article>
  `).join("");
}

async function loadTikTokConnection() {
  const response = await fetch("/api/admin/tiktok/connection");
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error || "TikTok 状态读取失败");
  state.tiktok = payload;
  renderTikTokConnection(payload);
}

async function connectTikTokShop() {
  el.connectTikTokShop.disabled = true;
  el.connectTikTokShop.textContent = t("opening");
  try {
    const response = await fetch("/api/admin/tiktok/auth-url");
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "无法生成授权链接");
    window.location.href = payload.url;
  } finally {
    el.connectTikTokShop.disabled = false;
    el.connectTikTokShop.textContent = t("connect");
  }
}

async function refreshTikTokShops() {
  el.refreshTikTokShops.disabled = true;
  el.refreshTikTokShops.textContent = t("refreshing");
  try {
    const response = await fetch("/api/admin/tiktok/shops", { method: "POST" });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "店铺读取失败");
    state.tiktok = payload;
    renderTikTokConnection(payload);
  } finally {
    el.refreshTikTokShops.disabled = false;
    el.refreshTikTokShops.textContent = t("refreshShops");
  }
}

async function syncTikTokProducts() {
  el.syncTikTokProducts.disabled = true;
  el.syncTikTokProducts.textContent = t("syncing");
  try {
    const response = await fetch("/api/admin/tiktok/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 50 }),
    });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "商品同步失败");
    state.tiktok = payload;
    renderTikTokConnection(payload);
  } finally {
    el.syncTikTokProducts.disabled = false;
    el.syncTikTokProducts.textContent = t("syncProducts");
  }
}

async function syncTikTokPromotions() {
  el.syncTikTokPromotions.disabled = true;
  el.syncTikTokPromotions.textContent = t("syncingPromotions");
  try {
    const response = await fetch("/api/admin/tiktok/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 50 }),
    });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "促销同步失败");
    state.tiktok = payload;
    renderTikTokConnection(payload);
  } finally {
    el.syncTikTokPromotions.disabled = false;
    el.syncTikTokPromotions.textContent = t("syncPromotions");
  }
}

async function resetTikTokAuth() {
  if (!window.confirm(currentLanguage === "zh"
    ? "确认重置 TikTok 授权吗？这只会清除本工具保存的 token、店铺和商品缓存，不会影响 TikTok 店铺。"
    : "Reset TikTok authorization? This only clears the token, shop, and product cache saved in this tool."
  )) return;
  el.resetTikTokAuth.disabled = true;
  el.resetTikTokAuth.textContent = currentLanguage === "zh" ? "重置中..." : "Resetting...";
  try {
    const response = await fetch("/api/admin/tiktok/reset", { method: "POST" });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "TikTok reset failed");
    state.tiktok = payload;
    renderTikTokConnection(payload);
  } finally {
    el.resetTikTokAuth.disabled = false;
    el.resetTikTokAuth.textContent = t("resetAuth");
  }
}

function keywordsFromItems() {
  const values = normalizeItems().map((item) => item.keyword).filter(Boolean);
  return [...new Set(values)];
}

function marketsFromItems() {
  const values = normalizeItems().map((item) => item.sourceRegion).filter(Boolean);
  return [...new Set(values)];
}

function scoreProduct(item) {
  const title = String(item.title || "").toLowerCase();
  const sales = Number(item.sales || 0);
  const revenue = Number(item.revenue || 0);
  const growth = Number(item.growthRate || 0);
  const price = Number(item.price || 0);
  const commission = Number(item.commissionRate || 0);
  const rating = Number(item.rating || 0);
  const reviews = Number(item.reviews || 0);
  const skuCount = Number(item.skuCount || 0);
  const visualWords = ["hair", "clip", "earring", "necklace", "bracelet", "ring", "charm", "strap", "bag", "card", "发夹", "抓夹", "耳环", "项链", "手链", "戒指", "挂件", "卡包"];
  const cheapTrapWords = ["moissanite", "diamond", "gold", "925", "916", "gra", "certificate"];
  const riskWords = ["replica", "dupe", "logo", "medical", "cure", "whitening", "slimming", "仿牌", "同款", "大牌", "治疗", "美白", "减肥"];
  const reasons = [];
  let score = 0;

  const salesScore = Math.min(34, Math.log10(sales + 1) * 10);
  const revenueScore = Math.min(14, Math.log10(revenue + 1) * 3);
  const growthScore = growth ? Math.min(8, Math.max(0, growth) / 8) : 0;
  const commissionScore = commission ? Math.min(6, commission / 3) : 0;
  const priceScore = price >= 5.9 && price <= 29.9 ? 18 : price >= 1 && price < 5.9 ? 10 : price > 29.9 && price <= 99 ? 6 : 0;
  const visualScore = visualWords.some((word) => title.includes(word)) ? 18 : 0;
  const trustScore = rating >= 4.6 && (reviews >= 5 || sales >= 100) ? 8 : rating >= 4.3 || sales >= 50 ? 5 : 0;
  const skuPenalty = skuCount > 20 ? 4 : 0;
  const risky = riskWords.some((word) => title.includes(word));
  const cheapTrap = price <= 0.5 || cheapTrapWords.some((word) => title.includes(word));

  score += salesScore + revenueScore + growthScore + commissionScore + priceScore + visualScore + trustScore;
  if (risky) score -= 25;
  if (cheapTrap) score -= 18;
  if (skuPenalty) score -= skuPenalty;

  if (salesScore >= 22) reasons.push("需求强");
  else if (salesScore >= 10) reasons.push("销量有基础");
  if (revenueScore >= 8) reasons.push("GMV可看");
  if (growthScore >= 8) reasons.push("增长较快");
  if (priceScore >= 10) reasons.push("价格带适合新加坡配饰");
  if (visualScore > 0) reasons.push("适合短视频展示");
  if (commissionScore >= 5) reasons.push("佣金有吸引力");
  if (trustScore > 0) reasons.push("评分或销量有支撑");
  if (skuPenalty) reasons.push("SKU偏多，备货复杂");
  if (cheapTrap) reasons.push("低价/珠宝证书类风险，需人工复核");
  if (risky) reasons.push("存在品牌/功效风险词");
  if (!reasons.length) reasons.push("数据优势不明显");

  score = Math.max(0, Math.min(100, score));
  const recommendation = risky || score < 38 ? "avoid" : score >= 62 && !cheapTrap ? "recommend" : "watch";
  return { score: Number(score.toFixed(1)), recommendation, reasons };
}

function formatMoney(value) {
  const currency = state.config?.currency || "SGD";
  return `${currency} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
}

function normalizeItems() {
  const items = state.lastResult?.items || [];
  return items.map((item, index) => ({
    rank: item.rank || index + 1,
    title: item.title || item.product_name || item.name || "Untitled product",
    price: Number(item.price || item.discounted_price || item.price_min || item.unit_price || 0),
    sales: Number(item.sales || item.sold_count || item.sales_count || item.sales_volume || item.sales_volumn || 0),
    revenue: Number(item.revenue || item.gmv || 0) || Number(item.price || item.discounted_price || item.price_min || item.unit_price || 0) * Number(item.sales || item.sold_count || item.sales_count || item.sales_volume || item.sales_volumn || 0),
    revenueEstimated: Boolean(item.revenueEstimated || item.revenue_estimated || !(Number(item.revenue || item.gmv || 0) > 0)),
    growthRate: item.growthRate ?? item.revenue_growth_rate ?? null,
    shopName: item.shopName || item.shop_name || item.shop || "",
    productUrl: item.productUrl || item.product_url || item.url || "",
    imageUrl: item.image || item.imageUrl || item.image_url || item.thumbnailUrl || item.thumbnail_url || item.coverUrl || item.cover_url || firstImageFromItem(item),
    keyword: item.keyword || state.lastResult?.keyword || "",
    commissionRate: Number(item.commissionRate || item.commission_rate || 0),
    rating: Number(item.rating || 0),
    reviews: Number(item.reviews || item.reviewCount || item.review_count || item.rating_count || item.reviews_total || 0),
    skuCount: Number(item.skuCount || item.sku_count || item.variant_count || 0),
    sellerId: item.sellerId || item.seller_id || "",
    sourceRegion: String(item.sourceRegion || item.searchRegion || item.region || "").toUpperCase(),
    scrapedAt: item.scrapedAt || item.scraped_at || "",
  }));
}

function classifyItem(item) {
  const title = String(item.title || "").toLowerCase();
  if (/(hair|clip|claw|barrette|scrunchie|发夹|抓夹|头绳)/.test(title)) return "hair";
  if (/(earring|earrings|stud|hoop|耳环|耳钉)/.test(title)) return "earrings";
  if (/(necklace|pendant|choker|chain|项链|吊坠)/.test(title)) return "necklace";
  if (/(bag|card|wallet|strap|charm|卡包|包挂|挂绳)/.test(title)) return "bag-card";
  return "other";
}

function typeLabel(type) {
  return {
    hair: t("typeHair"),
    earrings: t("typeEarrings"),
    necklace: t("typeNecklace"),
    "bag-card": t("typeBagCard"),
    other: t("typeOther"),
  }[type] || t("typeOther");
}

function tasteSignals(item) {
  const text = `${item.title || ""} ${item.shopName || ""} ${item.keyword || ""}`.toLowerCase();
  const signals = [];
  const has = (words) => words.some((word) => text.includes(word));
  if (has(["office", "work", "daily", "minimal", "simple", "dainty", "clean", "commute", "mrt"])) {
    signals.push({ key: "office", label: "通勤简约", reason: "适合办公室、MRT 通勤和日常穿搭内容" });
  }
  if (has(["hair", "clip", "claw", "scrunchie", "anti slip", "strong grip", "lightweight"])) {
    signals.push({ key: "hot-weather", label: "热带实用", reason: "新加坡天气热，抓夹/轻量/防滑卖点容易做场景" });
  }
  if (has(["gift", "birthday", "anniversary", "wedding", "party", "ceremony", "box"])) {
    signals.push({ key: "gift", label: "送礼场景", reason: "适合生日、节日、情侣/朋友送礼内容" });
  }
  if (has(["pearl", "bow", "heart", "kawaii", "soft", "cute", "pink", "flower", "butterfly"])) {
    signals.push({ key: "soft", label: "甜美软感", reason: "适合轻甜、约会、学生党或 soft girl 内容" });
  }
  if (has(["y2k", "chunky", "statement", "bold", "cross", "street", "vintage", "metal"])) {
    signals.push({ key: "statement", label: "个性吸睛", reason: "适合短视频出镜，但新店备货要控制款式深度" });
  }
  if (has(["moissanite", "diamond", "gold", "925", "916", "gra", "certificate", "buddha", "amulet", "religious"])) {
    signals.push({ key: "sensitive", label: "复核风险", reason: "珠宝证书/宗教元素/贵金属词需要人工复核合规和供应链" });
  }
  if (!signals.length) {
    signals.push({ key: "general", label: "泛配饰", reason: "本地文化信号不强，先看价格、销量和内容展示性" });
  }
  return signals;
}

function buildSourcingAdvice(items) {
  const rows = items.map((item) => ({ ...item, analysis: scoreProduct(item), signals: tasteSignals(item) }));
  const signalCounts = {};
  for (const row of rows) {
    for (const signal of row.signals) signalCounts[signal.label] = (signalCounts[signal.label] || 0) + 1;
  }
  const topSignals = Object.entries(signalCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const candidates = rows
    .filter((item) => item.analysis.recommendation !== "avoid")
    .sort((a, b) => b.analysis.score - a.analysis.score || b.sales - a.sales)
    .slice(0, 3);
  const avoid = rows
    .filter((item) => item.analysis.recommendation === "avoid" || item.signals.some((signal) => signal.key === "sensitive"))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 2);
  const avgPrice = rows.length ? rows.reduce((sum, item) => sum + Number(item.price || 0), 0) / rows.length : 0;
  const totalSales = rows.reduce((sum, item) => sum + Number(item.sales || 0), 0);
  return { rows, topSignals, candidates, avoid, avgPrice, totalSales };
}

function renderSourcingAdvice() {
  const rows = filteredItems();
  if (!rows.length) {
    el.adviceSummary.textContent = "当前筛选没有商品，无法生成选品建议。";
    el.adviceSignal.textContent = "No Signals";
    el.adviceGrid.innerHTML = "";
    return;
  }
  const advice = buildSourcingAdvice(rows);
  const signalText = advice.topSignals.map(([label, count]) => `${label} ${count}`).join(" / ") || "信号不足";
  el.adviceSignal.textContent = signalText;
  el.adviceSummary.textContent = `基于当前 ${rows.length} 个商品：累计销量 ${advice.totalSales.toLocaleString()}，均价 ${formatMoney(advice.avgPrice)}。`;
  const cards = [
    {
      title: "主推方向",
      body: advice.candidates.length
        ? advice.candidates.map((item) => `${item.analysis.recommendation === "recommend" ? "推荐" : "观望"}：${escapeHtml(shortTitle(item.title))}｜${item.signals[0]?.label || "泛配饰"}｜${item.analysis.score}分`).join("<br>")
        : "当前没有适合直接主推的商品，建议扩大关键词或降低风险款占比。",
    },
    {
      title: "本地内容角度",
      body: advice.topSignals.length
        ? advice.topSignals.map(([label]) => signalCopy(label)).join("<br>")
        : "先用通勤、轻量、送礼三个方向测试素材。",
    },
    {
      title: "1688 搜货方向",
      body: sourcingKeywords(advice.candidates.length ? advice.candidates : rows).join(" / "),
    },
    {
      title: "谨慎点",
      body: advice.avoid.length
        ? advice.avoid.map((item) => `${escapeHtml(shortTitle(item.title))}：${tasteSignals(item).find((signal) => signal.key === "sensitive")?.reason || item.analysis.reasons[0]}`).join("<br>")
        : "暂无明显高风险款，但仍要检查材质、侵权词和物流破损率。",
    },
  ];
  el.adviceGrid.innerHTML = cards.map((card) => `
    <article class="advice-card">
      <h4>${card.title}</h4>
      <p>${card.body}</p>
    </article>
  `).join("");
}

function shortTitle(title) {
  const value = String(title || "Untitled product");
  return value.length > 42 ? `${value.slice(0, 42)}...` : value;
}

function signalCopy(label) {
  return {
    "通勤简约": "拍办公室穿搭、MRT 通勤、日常不夸张配饰。",
    "热带实用": "拍热天气整理头发、防滑轻量、出门快速造型。",
    "送礼场景": "拍生日/纪念日/朋友小礼物，强调包装和质感。",
    "甜美软感": "拍约会、学生党、soft girl，小珍珠/蝴蝶结/花朵元素。",
    "个性吸睛": "拍上身前后对比和近景特写，少量测款别重仓。",
    "复核风险": "先查材质、宗教/贵金属/证书表达，避免合规和信任风险。",
    "泛配饰": "先用价格带、销量和视频展示性筛，内容用通勤/送礼兜底。",
  }[label] || `${label}：先小量测视频素材。`;
}

function sourcingKeywords(items) {
  const text = items.map((item) => item.title).join(" ").toLowerCase();
  const words = [];
  if (/(hair|clip|claw)/.test(text)) words.push("新加坡热带 抓夹", "防滑大号抓夹", "醋酸抓夹");
  if (/(earring|stud|hoop)/.test(text)) words.push("防过敏耳环", "通勤耳钉", "轻奢耳环");
  if (/(necklace|pendant|chain)/.test(text)) words.push("钛钢项链女", "简约吊坠项链", "通勤项链");
  if (/(bag|card|strap|charm)/.test(text)) words.push("包包挂件", "通勤卡包", "手机挂绳");
  if (!words.length) words.push("新加坡女配饰", "通勤小众配饰", "TikTok 爆款配饰");
  return [...new Set(words)].slice(0, 6);
}

function detectSupplierPlatform(text) {
  const value = text.toLowerCase();
  if (value.includes("1688.com")) return "1688";
  if (value.includes("taobao.com") || value.includes("tmall.com")) return "Taobao/Tmall";
  if (value.includes("yangkeduo.com") || value.includes("pinduoduo.com") || value.includes("mobile.yangkeduo")) return "Pinduoduo";
  if (value.includes("alibaba.com")) return "Alibaba";
  if (/^https?:\/\//.test(value)) return "Other URL";
  return "Manual Text";
}

function reviewSupplierLine(text, fetchedDetails = null) {
  const value = text.trim();
  const detailText = fetchedDetails
    ? `${fetchedDetails.title || ""} ${fetchedDetails.description || ""} ${fetchedDetails.price || ""} ${fetchedDetails.moq || ""} ${fetchedDetails.shop || ""} ${fetchedDetails.textSample || ""}`
    : "";
  const lower = `${value} ${detailText}`.toLowerCase();
  const risks = [];
  const positives = [];
  const addRisk = (level, label, reason) => risks.push({ level, label, reason });
  const has = (words) => words.some((word) => lower.includes(word));
  const platform = detectSupplierPlatform(value);

  if (platform === "Pinduoduo") addRisk("medium", "Supply chain", "Pinduoduo 货源常见低价和质量波动，需重点看评价、实拍和退换政策。");
  if (platform === "Taobao/Tmall") addRisk("medium", "Resale stability", "淘宝/天猫更偏零售，需确认是否可稳定供货、是否支持代发和批量议价。");
  if (platform === "1688") positives.push("1688 更适合批发比价，但仍要看起批量、店铺年限和回头率。");

  if (has(["disney", "sanrio", "hello kitty", "kuromi", "mickey", "minnie", "pokemon", "labubu", "miniso", "barbie", "marvel", "nike", "adidas", "chanel", "dior", "lv", "gucci", "prada", "celine", "miu miu"])) {
    addRisk("high", "IP / trademark", "疑似品牌或 IP 相关词，TikTok Shop 上架和投流都有较高侵权风险。");
  }
  if (has(["同款", "大牌", "原单", "尾单", "复刻", "高仿", "logo", "dupe", "replica", "inspired"])) {
    addRisk("high", "Infringement wording", "含同款/复刻/logo/dupe 等表达，建议避开或要求供应商提供无品牌版本。");
  }
  if (has(["s925", "925", "silver", "gold", "18k", "14k", "916", "diamond", "moissanite", "gra", "certificate", "证书", "莫桑", "钻", "足金", "镀金"])) {
    addRisk("medium", "Jewelry claims", "贵金属、证书、莫桑钻等承诺需要材质证明；新店不建议首批重仓。");
  }
  if (has(["buddha", "amulet", "quran", "allah", "cross", "religious", "佛", "佛牌", "护身符", "经文", "宗教"])) {
    addRisk("medium", "Cultural sensitivity", "宗教/护身符/经文类在 SG 多族群市场要谨慎，内容表达和广告素材需人工复核。");
  }
  if (has(["儿童", "婴儿", "baby", "kids", "child", "小孩"])) {
    addRisk("medium", "Children safety", "儿童饰品涉及小零件、吞咽和材质安全，需更严格质检。");
  }
  if (has(["0.01", "一分钱", "亏本", "引流", "秒杀", "超低价"])) {
    addRisk("medium", "Price trap", "疑似低价引流或规格价不一致，需确认实际 SKU 价格和起批量。");
  }
  if (has(["清仓", "捡漏", "尾货", "库存", "clearance"])) {
    addRisk("medium", "Stock stability", "清仓/尾货类可能断货或批次不稳定，不适合作为长期主推款。");
  }
  if (has(["现货", "一件代发", "48小时", "7天无理由", "实力商家", "源头工厂"])) {
    positives.push("有现货/代发/工厂类信号，适合继续核验发货速度和样品质量。");
  }
  if (has(["防过敏", "hypoallergenic", "钛钢", "stainless steel", "轻量", "防滑", "anti slip", "strong grip"])) {
    positives.push("有 SG 配饰友好卖点：防过敏、轻量、防滑或热带实用。");
  }
  const reviewSignal = extractSupplierReviewSignals(fetchedDetails);
  if (reviewSignal.negativeText) {
    addRisk("medium", "Review feedback", `评论里疑似出现 ${reviewSignal.negativeText}，上架前要重点看实拍和差评原因。`);
  }

  const high = risks.filter((risk) => risk.level === "high").length;
  const medium = risks.filter((risk) => risk.level === "medium").length;
  const verdict = high ? "High Risk" : medium >= 2 ? "Medium Risk" : medium ? "Needs Review" : "Low Risk";
  return {
    text: value,
    details: fetchedDetails,
    platform,
    verdict,
    risks,
    positives,
    reviewSignal,
  };
}

function extractSupplierReviewSignals(details) {
  const raw = details?.raw || {};
  const pick = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");
  const reviewCount = pick(
    raw.review_count,
    raw.reviewCount,
    raw.feedback_count,
    raw.feedbackCount,
    raw.comment_count,
    raw.commentCount,
    raw.evaluation_count,
    raw.evaluationCount,
    raw.reviews?.length,
    raw.comments?.length
  );
  const rating = pick(raw.rating, raw.score, raw.shop_score, raw.shopScore, raw.seller?.rating, raw.seller?.score);
  const commentRows = [raw.reviews, raw.comments, raw.evaluations, raw.feedbacks]
    .find((value) => Array.isArray(value)) || [];
  const commentText = commentRows.slice(0, 5).map((row) => {
    if (typeof row === "string") return row;
    return row?.content || row?.comment || row?.text || row?.review || "";
  }).filter(Boolean).join(" ");
  const negativeWords = ["掉色", "断", "坏", "过敏", "质量差", "色差", "差评", "不好", "褪色", "break", "broken", "allergy", "poor quality", "bad"];
  const negativeText = negativeWords.filter((word) => commentText.toLowerCase().includes(word.toLowerCase())).slice(0, 4).join(" / ");
  return {
    label: reviewCount || rating
      ? `评论 ${reviewCount || "-"}${rating ? ` · 评分 ${rating}` : ""}`
      : "评论未获取",
    commentText,
    negativeText,
  };
}

function supplierListingDecision(item) {
  const riskLabels = item.risks.map((risk) => risk.label);
  if (item.verdict === "High Risk") {
    return {
      tag: "Do Not List",
      cn: "不建议上架",
      summary: "侵权、品牌词或高合规风险优先淘汰，除非供应商能提供无品牌版本和完整证明。",
      next: "跳过，或让供应商换无 logo、无同款表达、无敏感承诺的版本。",
    };
  }
  if (item.fetchStatus === "Blocked" || riskLabels.includes("Details unavailable")) {
    return {
      tag: "Need Details",
      cn: "暂不上架，先补详情",
      summary: "页面详情没读到，不能判断标题、价格、起批量、店铺、图片和评论风险。",
      next: "补充标题、价格、MOQ、店铺信息、主图和评论截图后再复核。",
    };
  }
  if (item.verdict === "Medium Risk" || item.verdict === "Needs Review") {
    return {
      tag: "Sample First",
      cn: "可拿样，不建议直接上架",
      summary: "有可测试空间，但需要先确认材质、文化表达、库存稳定或评论问题。",
      next: "先买样品，检查质感、掉色、扣件牢固、包装和实拍，再小量测款。",
    };
  }
  return {
    tag: "Can Test",
    cn: "可小量测试",
    summary: "未发现明显规则风险，仍需做样品、价格和物流复核。",
    next: "可进入样品比价和内容测试，不建议首批重仓。",
  };
}

function supplierAdviceBullets(item) {
  const labels = item.risks.map((risk) => risk.label);
  const bullets = [];
  if (labels.includes("Cultural sensitivity")) {
    bullets.push("本地文化：SG 是多族群市场，佛牌/护身符/宗教元素不要用功效化、冒犯式或猎奇化内容表达。");
  }
  if (labels.includes("Jewelry claims")) {
    bullets.push("材质证明：微镶钻、S925、镀金、莫桑钻、证书等词要有供应商证明，标题里尽量弱化绝对承诺。");
  }
  if (labels.includes("Stock stability")) {
    bullets.push("供货稳定：清仓/捡漏/尾货款容易断货，适合短测，不适合作为长期主推。");
  }
  if (labels.includes("Price trap")) {
    bullets.push("价格复核：低价要确认实际 SKU、起批量、包装、运费和是否有规格价陷阱。");
  }
  if (labels.includes("Supply chain") || labels.includes("Resale stability")) {
    bullets.push("供应链：确认是否支持一件代发/批发价/稳定补货，以及退换货规则。");
  }
  if (labels.includes("Review feedback")) {
    bullets.push("评论风险：如果评论有掉色、断裂、过敏、质量差，先换供应商或只做低预算测试。");
  }
  if (!bullets.length && item.positives.length) {
    bullets.push(...item.positives.slice(0, 2));
  }
  if (!bullets.length) {
    bullets.push("基础复核：看主图是否侵权、标题是否夸大、价格是否有利润、物流是否易破损。");
  }
  return bullets.slice(0, 4);
}

async function fetchSupplierDetails(lines) {
  const urls = lines.filter((line) => /^https?:\/\//i.test(line));
  if (!urls.length) return new Map();
  const response = await fetch("/api/admin/supplier-fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error || "Supplier page fetch failed");
  return new Map((payload.results || []).map((result) => [result.url, result]));
}

async function renderSupplierRiskReview() {
  const lines = el.supplierInput.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    el.supplierRiskBadge.textContent = "No Review";
    el.supplierRiskGrid.innerHTML = `
      <div class="risk-empty">
        <strong>Ready to review</strong>
        <span>Paste supplier links or titles. If a marketplace blocks fetching, paste the product title/specs manually.</span>
      </div>
    `;
    return;
  }
  el.reviewSupplierRisk.disabled = true;
  el.reviewSupplierRisk.textContent = "Fetching...";
  el.supplierRiskBadge.textContent = "Fetching";
  let fetched = new Map();
  try {
    fetched = await fetchSupplierDetails(lines.slice(0, 20));
  } catch (error) {
    el.supplierRiskBadge.textContent = "Fetch Failed";
    el.supplierRiskGrid.innerHTML = `
      <div class="risk-empty">
        <strong>Page fetch failed</strong>
        <span>${escapeHtml(error.message)}. You can paste the supplier title/details manually and run the review again.</span>
      </div>
    `;
    el.reviewSupplierRisk.disabled = false;
    el.reviewSupplierRisk.textContent = "Fetch & Review";
    return;
  }
  const reviews = lines.slice(0, 20).map((line) => {
    const fetchedResult = fetched.get(line);
    const review = reviewSupplierLine(line, fetchedResult?.ok ? fetchedResult.details : null);
    const fetchStatus = fetchedResult ? (fetchedResult.ok ? "Fetched" : "Blocked") : "Manual";
    const fetchError = fetchedResult?.ok ? "" : fetchedResult?.error || "";
    if (fetchStatus === "Blocked" && review.verdict === "Low Risk") {
      review.verdict = "Needs Review";
      review.risks.unshift({
        level: "medium",
        label: "Details unavailable",
        reason: "未读取到货源详情，不能判断标题、价格、起批量、店铺和图片风险。",
      });
    }
    return {
      ...review,
      fetchStatus,
      fetchError,
    };
  });
  const highCount = reviews.filter((item) => item.verdict === "High Risk").length;
  const mediumCount = reviews.filter((item) => item.verdict === "Medium Risk" || item.verdict === "Needs Review").length;
  const lowCount = reviews.length - highCount - mediumCount;
  el.supplierRiskBadge.textContent = highCount ? `High Risk ${highCount}` : mediumCount ? `Needs Review ${mediumCount}` : "Low Risk";
  const summaryText = highCount
    ? "Do not list high-risk items before manual review."
    : mediumCount
      ? "Review supplier proof, title wording, and sample quality before testing."
      : "No obvious rule-based risk found. Still check listing page and sample.";
  const rows = reviews.map((item, index) => {
    const decision = supplierListingDecision(item);
    const bullets = supplierAdviceBullets(item);
    const primaryRisk = item.risks[0];
    const mainSignal = primaryRisk
      ? `${primaryRisk.label}: ${primaryRisk.reason}`
      : item.positives[0] || "No obvious IP, material, cultural, or price-trap signal found.";
    return `
      <article class="risk-row ${item.verdict.toLowerCase().replace(/\s+/g, "-")}">
        <div class="risk-status">
          <span>${index + 1}</span>
          <strong>${item.verdict}</strong>
          <em>${decision.tag}</em>
        </div>
        <div class="risk-main">
          <div class="risk-title">${escapeHtml(shortTitle(item.details?.title || item.text))}</div>
          <div class="risk-meta">${item.platform} · ${item.fetchStatus}${item.fetchError ? `: ${escapeHtml(item.fetchError)}` : ""}</div>
          <div class="listing-decision">是否上架：${decision.cn}</div>
          <div class="risk-meta">${escapeHtml(decision.summary)}</div>
          <div class="risk-meta">主因：${escapeHtml(mainSignal)}</div>
          ${item.details?.price || item.details?.moq || item.details?.shop ? `<div class="risk-meta">${escapeHtml([item.details.price, item.details.moq, item.details.shop].filter(Boolean).join(" · "))}</div>` : ""}
          <div class="risk-meta">${escapeHtml(item.reviewSignal?.label || "评论未获取")}</div>
          <ul class="risk-bullets">${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
          <div class="risk-next">${escapeHtml(decision.next)}</div>
        </div>
      </article>
    `;
  }).join("");
  el.supplierRiskGrid.innerHTML = `
    <div class="risk-summary">
      <div><strong>${reviews.length}</strong><span>Checked</span></div>
      <div><strong>${highCount}</strong><span>High</span></div>
      <div><strong>${mediumCount}</strong><span>Review</span></div>
      <div><strong>${lowCount}</strong><span>Low</span></div>
    </div>
    <p class="risk-summary-note">${summaryText}</p>
    <div class="risk-list">${rows}</div>
  `;
  el.reviewSupplierRisk.disabled = false;
  el.reviewSupplierRisk.textContent = "Fetch & Review";
}

async function importSupplierLinksFromFeishu() {
  const feishuConfig = {
    ...readForm(),
    feishuSheetUrl: el.supplierFeishuSheetUrl.value.trim() || el.feishuSheetUrl.value.trim(),
    feishuSheetRange: el.supplierFeishuSheetRange.value.trim() || el.feishuSheetRange.value.trim(),
    feishuLinkColumn: el.supplierFeishuLinkColumn.value.trim() || el.feishuLinkColumn.value.trim() || "A",
  };
  if (!feishuConfig.feishuSheetUrl || !feishuConfig.feishuSheetRange) {
    el.supplierRiskBadge.textContent = "Need Setup";
    el.supplierRiskGrid.innerHTML = `
      <div class="risk-empty">
        <strong>先填写飞书表格信息</strong>
        <span>如果是 Base 链接，就填 Base URL，并在 Range / Field 填字段名，例如 1688商品链接；如果是普通 Sheet，再填 Sheet1!A2:A100 和列 A。</span>
      </div>
    `;
    return;
  }
  el.feishuSheetUrl.value = feishuConfig.feishuSheetUrl;
  el.feishuSheetRange.value = feishuConfig.feishuSheetRange;
  el.feishuLinkColumn.value = feishuConfig.feishuLinkColumn;
  await saveConfig();
  el.importSupplierLinks.disabled = true;
  el.importSupplierLinks.textContent = "Importing...";
  try {
    const response = await fetch("/api/admin/feishu-supplier-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feishuConfig),
    });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "飞书表格读取失败");
    const existing = el.supplierInput.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const merged = [...existing, ...(payload.links || [])].filter((value, index, array) => array.indexOf(value) === index);
    el.supplierInput.value = merged.join("\n");
    el.supplierRiskBadge.textContent = `${payload.links?.length || 0} Imported`;
    el.supplierRiskGrid.innerHTML = `
      <div class="risk-empty">
        <strong>Imported from Feishu</strong>
        <span>已从 ${escapeHtml(payload.range || "configured range")} 读取 ${payload.links?.length || 0} 条链接。确认后点 Fetch & Review 批量审核。</span>
      </div>
    `;
  } finally {
    el.importSupplierLinks.disabled = false;
    el.importSupplierLinks.textContent = "Import from Feishu";
  }
}

function filteredItems() {
  const query = el.search.value.trim().toLowerCase();
  const recommendation = el.recommendationFilter.value;
  const keyword = el.keywordFilter.value;
  const market = el.marketFilter.value;
  const type = el.typeFilter.value;
  return normalizeItems().filter((item) => {
    const analysis = scoreProduct(item);
    const haystack = `${item.title} ${item.shopName} ${item.keyword}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesRecommendation = recommendation === "all" || analysis.recommendation === recommendation;
    const matchesKeyword = keyword === "all" || item.keyword === keyword;
    const matchesMarket = market === "all" || item.sourceRegion === market;
    const matchesType = type === "all" || classifyItem(item) === type;
    return matchesSearch && matchesRecommendation && matchesKeyword && matchesMarket && matchesType;
  });
}

function syncKeywordFilter() {
  const current = el.keywordFilter.value;
  const keywords = keywordsFromItems();
  el.keywordFilter.innerHTML = `<option value="all">全部关键词</option>${keywords.map((keyword) => `<option value="${escapeAttr(keyword)}">${keyword}</option>`).join("")}`;
  el.keywordFilter.value = keywords.includes(current) ? current : "all";
}

function syncMarketFilter() {
  const current = el.marketFilter.value;
  const markets = marketsFromItems();
  el.marketFilter.innerHTML = `<option value="all">全部市场</option>${markets.map((market) => `<option value="${escapeAttr(market)}">${market}</option>`).join("")}`;
  el.marketFilter.value = markets.includes(current) ? current : "all";
}

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function firstImageFromItem(item) {
  const collections = [item.images, item.imageUrls, item.image_urls, item.media, item.medias, item.photos, item.productImages];
  for (const collection of collections) {
    if (!Array.isArray(collection) || !collection.length) continue;
    const first = collection[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      return first.url || first.imageUrl || first.image_url || first.thumbnailUrl || first.coverUrl || "";
    }
  }
  return "";
}

function renderRows() {
  const rows = filteredItems();
  el.rows.innerHTML = rows.length
    ? rows
        .map((item) => {
          const title = item.productUrl ? `<a href="${item.productUrl}" target="_blank" rel="noreferrer">${item.title}</a>` : item.title;
          return `
            <tr>
              <td>${renderImageCell(item)}</td>
              <td>${item.rank}</td>
              <td>
                <div class="product-title">${title}</div>
                <div class="shop">${item.shopName || "Unknown shop"}</div>
              </td>
              <td>${formatMoney(item.price)}</td>
              <td>${Number(item.sales || 0).toLocaleString()}</td>
              <td>${formatMoney(item.revenue)}${item.revenueEstimated ? '<div class="shop">估算</div>' : ""}</td>
              <td>${formatGrowth(item.growthRate)}</td>
              <td>
                <div>${item.rating ? `★ ${item.rating.toFixed(1)}` : "-"}</div>
                <div class="shop">${item.reviews ? `${item.reviews.toLocaleString()} reviews` : "无评论数"}${item.skuCount ? ` · ${item.skuCount} SKU` : ""}</div>
              </td>
              <td>${renderAnalysisCell(item)}</td>
              <td><span class="market-badge">${item.sourceRegion || "-"}</span></td>
              <td>
                <div class="keywords"><span>${item.keyword || "-"}</span></div>
                <div class="shop">${typeLabel(classifyItem(item))}${item.scrapedAt ? ` · ${new Date(item.scrapedAt).toLocaleString()}` : ""}</div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="10">还没有后台抓取结果。保存配置后点“按配置抓取”，或者先在前台载入演示数据。</td></tr>`;
}

function formatGrowth(value) {
  return value == null || value === "" ? "-" : `${Number(value || 0).toFixed(1)}%`;
}

function renderImageCell(item) {
  if (!item.imageUrl) return `<div class="product-image placeholder">No image</div>`;
  return `<img class="product-image" src="${item.imageUrl}" alt="${item.title}" loading="lazy" referrerpolicy="no-referrer" />`;
}

function renderAnalysisCell(item) {
  const analysis = scoreProduct(item);
  const label = analysis.recommendation === "recommend" ? "推荐" : analysis.recommendation === "watch" ? "观望" : "规避";
  return `
    <div class="analysis-cell">
      <span class="pill ${analysis.recommendation}">${label} ${analysis.score}</span>
      <small>${analysis.reasons.slice(0, 3).join(" / ")}</small>
    </div>
  `;
}

function updateAnalysisSummary() {
  const rows = filteredItems().map((item) => ({ ...item, analysis: scoreProduct(item) }));
  const allCount = normalizeItems().length;
  const keywordCount = keywordsFromItems().length || 1;
  const expectedCount = keywordCount * Number(state.config?.limitPerKeyword || 0);
  const recommend = rows.filter((item) => item.analysis.recommendation === "recommend").length;
  const watch = rows.filter((item) => item.analysis.recommendation === "watch").length;
  const avoid = rows.filter((item) => item.analysis.recommendation === "avoid").length;
  const avg = rows.length ? rows.reduce((sum, item) => sum + item.analysis.score, 0) / rows.length : 0;
  el.analysisSummary.textContent = rows.length
    ? `当前筛选 ${rows.length}/${allCount} 个商品：推荐 ${recommend}，观望 ${watch}，规避 ${avoid}，平均分 ${avg.toFixed(1)}。${expectedCount && allCount < expectedCount ? `预计最多 ${expectedCount} 条，数据源实际返回 ${allCount} 条。` : ""}`
    : "分析基于销量、GMV、增长、佣金、价格带、内容展示性和风险词。";
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv() {
  const rows = normalizeItems();
  if (!rows.length) {
    alert("还没有可下载的榜单数据。");
    return;
  }
  const header = ["rank", "title", "shopName", "price", "sales", "revenue", "revenueEstimated", "growthRate", "rating", "reviews", "skuCount", "sourceRegion", "scrapedAt", "keyword", "score", "recommendation", "reasons", "productUrl", "imageUrl"];
  const lines = [
    header.join(","),
    ...rows.map((item) => {
      const analysis = scoreProduct(item);
      return [
        item.rank,
        item.title,
        item.shopName,
        item.price,
        item.sales,
        item.revenue,
        item.revenueEstimated,
        item.growthRate,
        item.rating,
        item.reviews,
        item.skuCount,
        item.sourceRegion,
        item.scrapedAt,
        item.keyword,
        analysis.score,
        analysis.recommendation,
        analysis.reasons.join(" / "),
        item.productUrl,
        item.imageUrl,
      ].map(csvEscape).join(",");
    }),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `product-sourcing-${date}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setAdminPage(page) {
  const showConfig = page === "config";
  const showRanking = page === "ranking";
  const showTiktok = page === "tiktok";
  const showSupplier = page === "supplier";
  el.configPage.classList.toggle("hidden", !showConfig);
  el.rankingPage.classList.toggle("hidden", !showRanking);
  el.tiktokPage.classList.toggle("hidden", !showTiktok);
  el.supplierPage.classList.toggle("hidden", !showSupplier);
  el.configPageTab.classList.toggle("active", showConfig);
  el.rankingPageTab.classList.toggle("active", showRanking);
  el.tiktokPageTab.classList.toggle("active", showTiktok);
  el.supplierPageTab.classList.toggle("active", showSupplier);
}

function applyState(payload) {
  state.config = payload.config;
  state.stats = payload.stats;
  state.account = payload.account;
  state.lastResult = payload.lastResult;
  state.tiktok = payload.tiktok || state.tiktok;
  fillForm();
  syncKeywordFilter();
  syncMarketFilter();
  renderStats();
  renderRows();
  updateAnalysisSummary();
  renderSourcingAdvice();
  applyLanguage();
}

async function loadState() {
  const response = await fetch("/api/admin/state");
  const payload = await response.json();
  applyState(payload);
  el.saveStatus.textContent = "已读取";
}

async function saveConfig() {
  el.saveStatus.textContent = "保存中...";
  const response = await fetch("/api/admin/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(readForm()),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error || "保存失败");
  applyState(payload);
  el.saveStatus.textContent = "已保存";
}

async function runSearch() {
  await saveConfig();
  el.runSearch.disabled = true;
  el.runSearch.textContent = "抓取中...";
  try {
    const response = await fetch("/api/products/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: el.defaultRegion.value,
        category: el.defaultCategory.value,
        dateRange: el.dateRange.value,
      }),
    });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "抓取失败");
    await loadState();
    el.saveStatus.textContent = "抓取完成";
  } finally {
    el.runSearch.disabled = false;
    el.runSearch.textContent = "按配置抓取";
  }
}

async function runAsyncSearch() {
  await saveConfig();
  el.runAsyncSearch.disabled = true;
  el.runAsyncSearch.textContent = "启动中...";
  try {
    const response = await fetch("/api/products/search-async", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: el.defaultRegion.value,
        category: el.defaultCategory.value,
        dateRange: el.dateRange.value,
      }),
    });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "异步抓取启动失败");
    activeJobId = payload.jobId;
    el.jobStatus.textContent = `异步任务已启动：${activeJobId}，共 ${payload.runs.length} 个 run。`;
    pollJob();
  } finally {
    el.runAsyncSearch.disabled = false;
    el.runAsyncSearch.textContent = "异步抓取";
  }
}

async function pollJob() {
  if (!activeJobId) return;
  clearTimeout(jobTimer);
  try {
    const response = await fetch(`/api/admin/jobs/${encodeURIComponent(activeJobId)}`);
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "状态查询失败");
    el.jobStatus.textContent = `异步任务 ${payload.id}：${payload.status}，${payload.runs.map((run) => `${run.keyword}:${run.status}`).join(" / ")}`;
    renderRunRows(payload.runs);
    if (payload.status === "RUNNING") {
      jobTimer = setTimeout(pollJob, 5000);
    } else {
      await loadState();
      await loadRuns();
      el.saveStatus.textContent = "异步抓取完成";
    }
  } catch (error) {
    el.jobStatus.textContent = `异步状态查询失败：${error.message}`;
  }
}

async function loadLastRun() {
  el.loadLastRun.disabled = true;
  el.loadLastRun.textContent = "读取中...";
  try {
    const response = await fetch("/api/admin/apify-last", { method: "POST" });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "读取失败");
    applyState(payload);
    await loadRuns();
    el.saveStatus.textContent = "已读取上次成功结果";
  } finally {
    el.loadLastRun.disabled = false;
    el.loadLastRun.textContent = "读取上次成功结果";
  }
}

async function loadRuns() {
  const response = await fetch("/api/admin/runs?limit=20");
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error || "历史读取失败");
  renderRunRows(payload.runs || []);
}

function renderRunRows(runs) {
  el.runRows.innerHTML = runs.length
    ? runs.map((run) => `
      <tr>
        <td><code>${run.id || run.runId || "-"}</code></td>
        <td><span class="pill ${run.status === "SUCCEEDED" ? "recommend" : run.status === "RUNNING" || run.status === "READY" ? "watch" : "avoid"}">${run.status || "-"}</span></td>
        <td>${run.startedAt ? new Date(run.startedAt).toLocaleString() : "-"}</td>
        <td>${run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "-"}</td>
        <td><code>${run.defaultDatasetId || "-"}</code></td>
        <td>${run.usageUsd == null ? "-" : `$${Number(run.usageUsd).toFixed(4)}`}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="6">暂无运行历史。点“刷新历史”或完成一次抓取后再看。</td></tr>`;
}

el.configForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await saveConfig();
  } catch (error) {
    alert(`保存失败：${error.message}`);
    el.saveStatus.textContent = "保存失败";
  }
});

el.runSearch.addEventListener("click", async () => {
  if (!confirmPaidRun("sync")) return;
  try {
    await runSearch();
  } catch (error) {
    alert(`抓取失败：${error.message}`);
    await loadState();
  }
});

el.runAsyncSearch.addEventListener("click", async () => {
  if (!confirmPaidRun("async")) return;
  try {
    await runAsyncSearch();
  } catch (error) {
    alert(`异步抓取失败：${error.message}`);
  }
});

el.loadLastRun.addEventListener("click", async () => {
  try {
    await loadLastRun();
  } catch (error) {
    alert(`读取上次成功结果失败：${error.message}`);
  }
});

el.refreshRuns.addEventListener("click", async () => {
  try {
    await loadRuns();
    el.saveStatus.textContent = "历史已刷新";
  } catch (error) {
    alert(`刷新历史失败：${error.message}`);
  }
});

el.resetStats.addEventListener("click", async () => {
  const response = await fetch("/api/admin/reset-stats", { method: "POST" });
  const payload = await response.json();
  applyState(payload);
  el.saveStatus.textContent = "次数已重置";
});

function refreshRankingView() {
  renderRows();
  updateAnalysisSummary();
  renderSourcingAdvice();
}

el.search.addEventListener("input", refreshRankingView);
el.recommendationFilter.addEventListener("input", refreshRankingView);
el.keywordFilter.addEventListener("input", refreshRankingView);
el.marketFilter.addEventListener("input", refreshRankingView);
el.typeFilter.addEventListener("input", refreshRankingView);
el.analyzeProducts.addEventListener("click", () => {
  refreshRankingView();
  el.saveStatus.textContent = "分析完成";
});
el.downloadCsv.addEventListener("click", downloadCsv);
el.reviewSupplierRisk.addEventListener("click", renderSupplierRiskReview);
el.importSupplierLinks.addEventListener("click", async () => {
  try {
    await importSupplierLinksFromFeishu();
  } catch (error) {
    el.supplierRiskBadge.textContent = "Import Failed";
    el.supplierRiskGrid.innerHTML = `
      <div class="risk-empty">
        <strong>飞书导入失败</strong>
        <span>${escapeHtml(error.message)}。请确认表格链接、Range、链接列，以及后端 .env 里的 LARK_APP_ID / LARK_APP_SECRET。</span>
      </div>
    `;
  }
});
el.connectTikTokShop.addEventListener("click", async () => {
  try {
    await connectTikTokShop();
  } catch (error) {
    alert(`TikTok 授权入口打开失败：${error.message}`);
    await loadTikTokConnection().catch(() => {});
  }
});
el.refreshTikTokShops.addEventListener("click", async () => {
  try {
    await refreshTikTokShops();
  } catch (error) {
    alert(`TikTok 店铺读取失败：${error.message}`);
    await loadTikTokConnection().catch(() => {});
  }
});
el.syncTikTokProducts.addEventListener("click", async () => {
  try {
    await syncTikTokProducts();
  } catch (error) {
    alert(`TikTok 商品同步失败：${error.message}`);
    await loadTikTokConnection().catch(() => {});
  }
});
el.syncTikTokPromotions.addEventListener("click", async () => {
  try {
    await syncTikTokPromotions();
  } catch (error) {
    alert(`TikTok 促销同步失败：${error.message}`);
    await loadTikTokConnection().catch(() => {});
  }
});
el.resetTikTokAuth.addEventListener("click", async () => {
  try {
    await resetTikTokAuth();
  } catch (error) {
    alert(`TikTok 授权重置失败：${error.message}`);
    await loadTikTokConnection().catch(() => {});
  }
});
el.logoutButton.addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
  window.location.href = "/login";
});
el.configPageTab.addEventListener("click", () => setAdminPage("config"));
el.rankingPageTab.addEventListener("click", () => setAdminPage("ranking"));
el.tiktokPageTab.addEventListener("click", () => setAdminPage("tiktok"));
el.supplierPageTab.addEventListener("click", () => setAdminPage("supplier"));
el.languageSwitch.addEventListener("change", () => {
  currentLanguage = el.languageSwitch.value;
  localStorage.setItem("adminLanguage", currentLanguage);
  applyLanguage();
});

applyLanguage();

loadState().catch((error) => {
  el.saveStatus.textContent = "读取失败";
  alert(`后台读取失败：${error.message}`);
});

loadTikTokConnection().catch(() => {
  renderTikTokConnection({ configured: false, authorized: false, shops: [], products: [] });
});

loadRuns().catch(() => {
  renderRunRows([]);
});
