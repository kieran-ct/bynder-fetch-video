// fetchBynderVideos.js

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BYNDER_TOKEN = process.env.BYNDER_TOKEN;
const BYNDER_BASE_URL = process.env.BYNDER_BASE_URL;
const SKU = 'EXAMPLE_SKU'; // Replace as needed

function getTodayISODate() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
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

function buildQueryParams() {
  const today = getTodayISODate();
  return new URLSearchParams({
    type: 'video',
    'property[Usage Rights]': 'online',
    'property[organic expiry date][from]': today,
  });
}

async function fetchFilteredVideos() {
  const perPage = 100;
  let page = 1;
  let allAssets = [];
  const queryParams = buildQueryParams();

  while (true) {
    const url = `${BYNDER_BASE_URL}/api/v4/media/?${queryParams.toString()}&page=${page}&limit=${perPage}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${BYNDER_TOKEN}` }
    });

    if (!res.ok) {
      console.error(`❌ Error fetching page ${page}:`, res.status, await res.text());
      break;
    }

    const pageAssets = await res.json();
    console.log(`📦 Page ${page}: Received ${pageAssets.length} assets`);
    if (pageAssets.length === 0) break;

    for (const asset of pageAssets) {
      const detailUrl = `${BYNDER_BASE_URL}/api/v4/media/${asset.id}/`;
      const detailRes = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${BYNDER_TOKEN}` }
      });

      if (detailRes.ok) {
        const fullAsset = await detailRes.json();
        allAssets.push(fullAsset);
      } else {
        console.warn(`⚠️ Failed to fetch details for asset ${asset.id}`);
      }
    }

    if (pageAssets.length < perPage) break;
    page++;
  }

  console.log(`📊 Total filtered assets from API: ${allAssets.length}`);
  return allAssets;
}

function isValidAsset(asset, targetSku) {
  const skuList = asset?.property_SKU || [];
  return Array.isArray(skuList) && skuList.includes(targetSku);
}

async function saveStreamUrlsToFile(sku, assets) {
  const outputPath = path.join(__dirname, `bynder-streams-${sku}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(assets, null, 2));
  console.log(`💾 Saved ${assets.length} streamable video(s) to ${outputPath}`);
}

async function run() {
  console.log(`🚀 Fetching videos for SKU "${SKU}"...`);
  const allAssets = await fetchFilteredVideos();
  const filtered = [];

  const withMatchingSku = allAssets.filter(asset => isValidAsset(asset, SKU));
  console.log(`🎯 ${withMatchingSku.length} video(s) match SKU "${SKU}"`);

  for (const asset of withMatchingSku) {
    const name = asset.mediaName || asset.name || asset.id;
    console.log(`🧪 Checking asset: ${name}`);

    const vodUrl = getVodStreamUrl(asset.id);
    if (!vodUrl) continue;

    console.log(`🔗 VOD URL: ${vodUrl}`);
    const res = await fetch(vodUrl, { method: 'HEAD' });

    if (res.ok) {
      console.log(`✅ Public stream: ${name}`);
      filtered.push({ id: asset.id, name, streamUrl: vodUrl });
    } else {
      console.log(`❌ Not streamable or private: ${name}`);
    }
  }

  await saveStreamUrlsToFile(SKU, filtered);
}

run().catch(console.error);
