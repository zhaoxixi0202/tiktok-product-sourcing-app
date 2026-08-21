const demoItems = [
  {
    rank: 1,
    productId: "demo-sg-earring-001",
    title: "Hypoallergenic Pearl Hoop Earrings for Office Outfit",
    price: 12.9,
    sales: 860,
    revenue: 11094,
    growthRate: 42.5,
    commissionRate: 15,
    shopName: "Demo Accessories",
    launchDate: "2026-08-01",
  },
  {
    rank: 2,
    productId: "demo-sg-hairclip-002",
    title: "Large Acetate Hair Claw Clip for Hot Weather Hair Fix",
    price: 8.9,
    sales: 740,
    revenue: 6586,
    growthRate: 35.1,
    commissionRate: 18,
    shopName: "Demo Hair Studio",
    launchDate: "2026-07-26",
  },
  {
    rank: 3,
    productId: "demo-sg-cardholder-003",
    title: "Mini Card Holder With Phone Strap for MRT Commute",
    price: 14.9,
    sales: 390,
    revenue: 5811,
    growthRate: 22.4,
    commissionRate: 12,
    shopName: "Demo Daily Carry",
    launchDate: "2026-07-18",
  },
  {
    rank: 4,
    productId: "demo-sg-necklace-004",
    title: "Gold Layered Necklace Set Clean Girl Outfit",
    price: 18.9,
    sales: 310,
    revenue: 5859,
    growthRate: 18.2,
    commissionRate: 14,
    shopName: "Demo Minimal",
    launchDate: "2026-07-20",
  },
  {
    rank: 5,
    productId: "demo-sg-logo-005",
    title: "Designer Logo Inspired Bag Charm Dupe",
    price: 6.9,
    sales: 920,
    revenue: 6348,
    growthRate: 50.4,
    commissionRate: 20,
    shopName: "Demo Risky Goods",
    launchDate: "2026-08-05",
  },
];

const state = {
  source: "demo",
  currency: "SGD",
  items: demoItems,
  config: null,
};

const el = {
  region: document.querySelector("#region"),
  category: document.querySelector("#category"),
  dateRange: document.querySelector("#dateRange"),
  recommendationFilter: document.querySelector("#recommendationFilter"),
  loadDemo: document.querySelector("#loadDemo"),
  fetchBackend: document.querySelector("#fetchBackend"),
  fileInput: document.querySelector("#fileInput"),
  search: document.querySelector("#search"),
  rows: document.querySelector("#rows"),
  source: document.querySelector("#source"),
  recommendCount: document.querySelector("#recommendCount"),
  avgScore: document.querySelector("#avgScore"),
  priceBand: document.querySelector("#priceBand"),
};

function scoreItem(item) {
  const title = String(item.title || "").toLowerCase();
  const sales = Number(item.sales || item.sold_count || item.soldCount || item.sales_count || item.sales_volumn || 0);
  const revenue = Number(item.revenue || item.gmv || 0);
  const growth = Number(item.growthRate || item.revenue_growth_rate || 0);
  const commission = Number(item.commissionRate || item.commission_rate || 0);
  const price = Number(item.price || item.discounted_price || item.price_min || item.unit_price || 0);
  const rating = Number(item.rating || 0);
  const reviews = Number(item.reviews || item.reviewCount || item.review_count || item.rating_count || item.reviews_total || 0);
  const skuCount = Number(item.skuCount || item.sku_count || item.variant_count || 0);
  const contentWords = ["hair", "clip", "earring", "necklace", "bracelet", "ring", "charm", "strap", "bag", "card", "发夹", "抓夹", "耳环", "项链", "手链", "戒指", "挂件", "卡包"];
  const cheapTrapWords = ["moissanite", "diamond", "gold", "925", "916", "gra", "certificate"];
  const riskWords = ["replica", "dupe", "logo", "medical", "cure", "whitening", "slimming", "仿牌", "同款", "大牌", "治疗", "美白", "减肥"];

  const salesScore = Math.min(34, Math.log10(sales + 1) * 10);
  const revenueScore = Math.min(14, Math.log10(revenue + 1) * 3);
  const growthScore = growth ? Math.min(8, Math.max(0, growth) / 8) : 0;
  const commissionScore = commission ? Math.min(6, commission / 3) : 0;
  const priceScore = price >= 5.9 && price <= 29.9 ? 18 : price >= 1 && price < 5.9 ? 10 : price > 29.9 && price <= 99 ? 6 : 0;
  const visualScore = contentWords.some((word) => title.includes(word)) ? 18 : 0;
  const trustScore = rating >= 4.6 && (reviews >= 5 || sales >= 100) ? 8 : rating >= 4.3 || sales >= 50 ? 5 : 0;
  const skuPenalty = skuCount > 20 ? 4 : 0;
  const risky = riskWords.some((word) => title.includes(word));
  const cheapTrap = price <= 0.5 || cheapTrapWords.some((word) => title.includes(word));

  let score = salesScore + revenueScore + growthScore + commissionScore + priceScore + visualScore + trustScore;
  if (risky) score -= 25;
  if (cheapTrap) score -= 18;
  if (skuPenalty) score -= skuPenalty;
  score = Math.max(0, Math.min(100, score));

  const recommendation = risky || score < 38 ? "avoid" : score >= 62 && !cheapTrap ? "recommend" : "watch";
  return { ...item, score: Number(score.toFixed(1)), recommendation };
}

function keywords(item) {
  const title = String(item.title || "").toLowerCase();
  if (title.includes("hair") || title.includes("clip") || title.includes("抓夹")) return ["醋酸抓夹高级感", "大号鲨鱼夹女", "通勤抓夹"];
  if (title.includes("ear") || title.includes("耳")) return ["S925银针珍珠耳环", "韩系轻熟耳环", "防过敏耳钉"];
  if (title.includes("necklace") || title.includes("项链")) return ["钛钢项链女小众", "项链叠戴套装", "clean girl 项链"];
  if (title.includes("card") || title.includes("strap") || title.includes("卡包")) return ["通勤卡包女", "迷你卡包女", "手机挂绳斜挎"];
  return ["TikTok 爆款 配饰", "韩系轻熟 配件"];
}

function normalizePayload(payload) {
  const items = Array.isArray(payload) ? payload : payload.items || payload.data || payload.records || [];
  return {
    source: payload.source || "imported",
    currency: payload.currency || state.config?.currency || "SGD",
    items: items.map((item, index) => ({
      rank: item.rank || index + 1,
      productId: item.productId || item.product_id || item.id || `item-${index + 1}`,
      title: item.title || item.product_name || item.name || "Untitled product",
      price: Number(item.price || item.discounted_price || item.price_min || item.unit_price || 0),
      sales: Number(item.sales || item.sold_count || item.soldCount || item.sales_count || item.sales_volumn || item.sales_volume || 0),
      revenue: Number(item.revenue || item.gmv || 0) || Number(item.price || item.discounted_price || item.price_min || item.unit_price || 0) * Number(item.sales || item.sold_count || item.soldCount || item.sales_count || item.sales_volumn || item.sales_volume || 0),
      revenueEstimated: Boolean(item.revenueEstimated || item.revenue_estimated || !(Number(item.revenue || item.gmv || 0) > 0)),
      growthRate: item.growthRate ?? item.revenue_growth_rate ?? null,
      commissionRate: Number(item.commissionRate || item.commission_rate || 0),
      rating: Number(item.rating || 0),
      reviews: Number(item.reviews || item.reviewCount || item.review_count || item.rating_count || item.reviews_total || 0),
      skuCount: Number(item.skuCount || item.sku_count || item.variant_count || 0),
      shopName: item.shopName || item.shop_name || item.shop || "",
      launchDate: item.launchDate || item.launch_date || "",
      keyword: item.sourceQuery || item.keyword || payload.keyword || "",
      productUrl: item.productUrl || item.product_url || item.url || "",
      imageUrl: item.image || item.imageUrl || item.image_url || item.primaryImage || item.primary_image || item.thumbnailUrl || item.thumbnail_url || item.coverUrl || item.cover_url || firstImageFromItem(item),
    })),
  };
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

function formatMoney(value) {
  return `${state.currency} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
}

function formatGrowth(value) {
  return value == null || value === "" ? "-" : `${Number(value || 0).toFixed(1)}%`;
}

async function loadBackendState() {
  try {
    const response = await fetch("/api/admin/state");
    const payload = await response.json();
    state.config = payload.config || null;
    if (state.config) {
      el.region.value = state.config.defaultRegion || el.region.value;
      el.category.value = state.config.defaultCategory || el.category.value;
      el.dateRange.value = state.config.dateRange || el.dateRange.value;
      state.currency = state.config.currency || state.currency;
    }
    if (payload.lastResult?.items?.length) {
      const normalized = normalizePayload(payload.lastResult);
      state.source = normalized.source;
      state.currency = normalized.currency;
      state.items = normalized.items;
    }
  } catch {
    state.config = null;
  }
}

function render() {
  const query = el.search.value.trim().toLowerCase();
  const recommendationFilter = el.recommendationFilter.value;
  const scored = state.items.map(scoreItem);
  const filtered = scored.filter((item) => {
    const haystack = `${item.title} ${item.shopName} ${item.keyword || ""} ${keywords(item).join(" ")}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesRecommendation = recommendationFilter === "all" || item.recommendation === recommendationFilter;
    return matchesSearch && matchesRecommendation;
  });

  el.rows.innerHTML = filtered
    .map((item) => {
      const keyTags = keywords(item).map((keyword) => `<span>${keyword}</span>`).join("");
      const label = item.recommendation === "recommend" ? "推荐" : item.recommendation === "watch" ? "观望" : "规避";
      const title = item.productUrl ? `<a href="${item.productUrl}" target="_blank" rel="noreferrer">${item.title}</a>` : item.title;
      return `
        <tr>
          <td>${renderImageCell(item)}</td>
          <td>${item.rank}</td>
          <td>
            <div class="product-title">${title}</div>
            <div class="shop">${item.shopName || "Unknown shop"} ${item.keyword ? ` · ${item.keyword}` : ""} ${item.launchDate ? ` · ${item.launchDate}` : ""}</div>
          </td>
          <td>${formatMoney(item.price)}</td>
          <td>${Number(item.sales || 0).toLocaleString()}</td>
          <td>${formatMoney(item.revenue)}${item.revenueEstimated ? '<div class="shop">估算</div>' : ""}</td>
          <td>${formatGrowth(item.growthRate)}</td>
          <td>${item.score}</td>
          <td><span class="pill ${item.recommendation}">${label}</span></td>
          <td><div class="keywords">${keyTags}</div></td>
        </tr>
      `;
    })
    .join("");

  const recommend = filtered.filter((item) => item.recommendation === "recommend").length;
  const avg = filtered.length ? filtered.reduce((sum, item) => sum + item.score, 0) / filtered.length : 0;
  el.source.textContent = state.source;
  el.recommendCount.textContent = recommend;
  el.avgScore.textContent = avg.toFixed(1);
  el.priceBand.textContent = `${state.currency} 5.9-19.9`;
}

function renderImageCell(item) {
  if (!item.imageUrl) return `<div class="product-image placeholder">No image</div>`;
  return `<img class="product-image" src="${item.imageUrl}" alt="${item.title}" loading="lazy" referrerpolicy="no-referrer" />`;
}

el.loadDemo.addEventListener("click", () => {
  state.source = "demo";
  state.currency = "SGD";
  state.items = demoItems;
  render();
});

el.fetchBackend.addEventListener("click", async () => {
  el.fetchBackend.disabled = true;
  el.fetchBackend.textContent = "抓取中...";
  try {
    const response = await fetch("/api/products/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: el.region.value,
        category: el.category.value,
        dateRange: el.dateRange.value,
      }),
    });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "Backend request failed");
    const normalized = normalizePayload(payload);
    state.source = normalized.source;
    state.currency = normalized.currency;
    state.items = normalized.items;
    render();
  } catch (error) {
    alert(`后台抓取失败：${error.message}`);
  } finally {
    el.fetchBackend.disabled = false;
    el.fetchBackend.textContent = "后台抓取";
  }
});

el.fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const payload = JSON.parse(await file.text());
  const normalized = normalizePayload(payload);
  state.source = normalized.source;
  state.currency = normalized.currency;
  state.items = normalized.items;
  render();
});

[el.region, el.category, el.dateRange, el.recommendationFilter, el.search].forEach((node) => node.addEventListener("input", render));

loadBackendState().then(render);
