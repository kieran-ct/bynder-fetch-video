const fetch = require('node-fetch');
require('dotenv').config();

const BYNDER_TOKEN = process.env.BYNDER_TOKEN;
const BYNDER_BASE_URL = process.env.BYNDER_BASE_URL;

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

async function getStreamableVideosBySku(sku) {
  console.log(`🚀 Fetching videos for SKU "${sku}"...`);
  const allAssets = await fetchFilteredVideos();
  const filtered = [];

  const withMatchingSku = allAssets.filter(asset => isValidAsset(asset, sku));
  console.log(`🎯 ${withMatchingSku.length} video(s) match SKU "${sku}"`);

  for (const asset of withMatchingSku) {
    const name = asset.mediaName || asset.name || asset.id;
    const vodUrl = getVodStreamUrl(asset.id);
    if (!vodUrl) continue;

    const res = await fetch(vodUrl, { method: 'HEAD' });
    if (res.ok) {
      console.log(`✅ Public stream: ${name}`);
      filtered.push({ 
        id: asset.id, 
        name, 
        streamUrl: vodUrl,
        thumbnails: asset.thumbnails,
        dateCreated: asset.dateCreated,
        dateModified: asset.dateModified
      });
    } else {
      console.log(`❌ Not streamable or private: ${name}`);
    }
  }

  return filtered;
}

module.exports = {
  getStreamableVideosBySku
};