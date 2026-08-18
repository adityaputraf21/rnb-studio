const ytdlp = require("../ytdlp");
const rapidapiYoutube = require("../rapidapiYoutube");

// Prefer the RapidAPI-based resolver when configured — it bypasses yt-dlp
// entirely for YouTube (which is what's been getting blocked as a "bot" on
// datacenter server IPs), since the API provider does the fetching on their
// own infrastructure instead of ours. Falls back to yt-dlp if not
// configured, or if the API call fails for any reason.
async function resolve(url) {
  if (process.env.RAPIDAPI_KEY) {
    try {
      const info = await rapidapiYoutube.getInfo(url);
      return { ...info, provider: "youtube" };
    } catch (err) {
      console.error("RapidAPI YouTube resolve gagal, fallback ke yt-dlp:", err.message);
    }
  }
  const info = await ytdlp.getInfo(url);
  return { ...info, provider: "youtube" };
}

module.exports = { resolve };
