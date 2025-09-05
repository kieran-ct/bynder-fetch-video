const fetch = require('node-fetch');
require('dotenv').config();

const BYNDER_TOKEN = process.env.BYNDER_TOKEN;
const BYNDER_BASE_URL = process.env.BYNDER_BASE_URL;

// In-memory cache
let videosCache = [];
let lastCacheUpdate = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getTodayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function formatAsUuid(rawId) {
  const hex = rawId.replace(/-/g, '').toLowerCase();
  if (hex.length !== 32) {
    console.warn(`❌ Invalid ID for UUID formatting: ${rawId}`);
    return null;
  }
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20)
  ].join('-');
}

function getVodStreamUrl(id) {
  const uuid = formatAsUuid(id);
  if (!uuid) return null;
  return `${BYNDER_BASE_URL}/vod-stream/${uuid}/play-hls2.m3u8`;
}

function isNotExpired(asset) {
  const expiryDate = asset?.property_Organic_expiry_date;
  if (!expiryDate) return true;
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  return expiry >= today;
}

function hasWebsiteUsageRights(asset) {
  const usageRights = asset?.property_Usage_Rights || [];
  return Array.isArray(usageRights) && usageRights.includes('Website');
}

function isValidAsset(asset, targetSku) {
  const skuList = asset?.property_SKU || [];
  return Array.isArray(skuList) && skuList.includes(targetSku);
}

async function fetchFilteredVideos() {
  const perPage = 100;
  let page = 1;
  let allAssets = [];

  while (true) {
    const url = `${BYNDER_BASE_URL}/api/v4/media/?type=video&page=${page}&limit=${perPage}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${BYNDER_TOKEN}` }
    });

    if (!res.ok) {
      console.error(`❌ Error fetching page ${page}:`, res.status, await res.text());
      break;
    }

    const pageAssets = await res.json();
    
    for (const asset of pageAssets) {
      const detailUrl = `${BYNDER_BASE_URL}/api/v4/media/${asset.id}/`;
      const detailRes = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${BYNDER_TOKEN}` }
      });

      if (detailRes.ok) {
        const fullAsset = await detailRes.json();
        if (isNotExpired(fullAsset) && hasWebsiteUsageRights(fullAsset)) {
          allAssets.push(fullAsset);
        }
      }
    }

    if (pageAssets.length < perPage) break;
    page++;
  }

  return allAssets;
}

async function refreshCache() {
  console.log('🔄 Refreshing video cache...');
  const startTime = Date.now();
  
  const allAssets = await fetchFilteredVideos();
  videosCache = [];

  for (const asset of allAssets) {
    const name = asset.mediaName || asset.name || asset.id;
    const vodUrl = getVodStreamUrl(asset.id);
    if (!vodUrl) continue;

    const res = await fetch(vodUrl, { method: 'HEAD' });
    if (res.ok) {
      videosCache.push({ 
        id: asset.id, 
        name, 
        streamUrl: vodUrl,
        thumbnails: asset.thumbnails,
        dateCreated: asset.dateCreated,
        dateModified: asset.dateModified,
        skus: asset.property_SKU || []
      });
    }
  }

  lastCacheUpdate = Date.now();
  const duration = Date.now() - startTime;
  console.log(`✅ Cache refreshed: ${videosCache.length} streamable videos (${duration}ms)`);
}

function isCacheStale() {
  return !lastCacheUpdate || (Date.now() - lastCacheUpdate) > CACHE_TTL_MS;
}

async function getStreamableVideosBySku(sku) {
  console.log(`🚀 Getting videos for SKU "${sku}"...`);
  
  // Refresh cache if stale
  if (isCacheStale()) {
    await refreshCache();
  }

  // Filter cached videos by SKU
  const filtered = videosCache.filter(video => 
    video.skus.includes(sku)
  );

  console.log(`🎯 ${filtered.length} video(s) match SKU "${sku}" (from cache)`);
  return filtered.map(video => ({
    id: video.id,
    name: video.name,
    streamUrl: video.streamUrl,
    thumbnails: video.thumbnails,
    dateCreated: video.dateCreated,
    dateModified: video.dateModified
  }));
}

// Background refresh job
function startBackgroundRefresh() {
  console.log('🕐 Starting background cache refresh (every 8 minutes)');
  setInterval(async () => {
    try {
      await refreshCache();
    } catch (error) {
      console.error('❌ Background cache refresh failed:', error.message);
    }
  }, 8 * 60 * 1000); // 8 minutes
}

module.exports = {
  getStreamableVideosBySku,
  startBackgroundRefresh
};