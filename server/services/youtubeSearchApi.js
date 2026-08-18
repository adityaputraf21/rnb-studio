const fetch = require("node-fetch");

// Official Google API — much more reliable than yt-dlp's search (which uses
// scraping and is subject to the same bot-detection issues we've been
// fighting). Free tier: 10,000 quota units/day, search.list costs 100 units
// each (~100 free searches/day). Get a key at https://console.cloud.google.com
// (enable "YouTube Data API v3", then Credentials -> Create API Key).
async function searchFirst(query) {
  if (!process.env.YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY belum diset");

  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "1",
    key: process.env.YOUTUBE_API_KEY,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { timeout: 15000 });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const reason = body.error?.message || JSON.stringify(body).slice(0, 150);
    throw new Error(`YouTube Data API HTTP ${res.status}: ${reason}`);
  }

  const item = body.items?.[0];
  if (!item) throw new Error(`Gak nemu hasil YouTube buat pencarian: "${query}"`);

  return {
    title: item.snippet.title,
    artist: item.snippet.channelTitle || "Unknown",
    duration: undefined, // search.list doesn't include duration (would need a 2nd videos.list call)
    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || "",
    sourceUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  };
}

module.exports = { searchFirst };
