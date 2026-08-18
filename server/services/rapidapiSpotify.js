const fetch = require("node-fetch");

const API_HOST = "spotify-music-mp3-downloader-api.p.rapidapi.com";

// Direct Spotify -> MP3 resolver. Gives us the real Spotify title/artist AND
// a direct downloadable audio URL in one call — no need to search YouTube
// for a matching video like the old flow did.
function parseDuration(str) {
  // "4:08" -> 248 seconds
  if (!str || typeof str !== "string") return undefined;
  const parts = str.split(":").map(Number);
  if (parts.some(isNaN)) return undefined;
  return parts.reduce((acc, val) => acc * 60 + val, 0);
}

async function resolve(spotifyUrl) {
  if (!process.env.RAPIDAPI_KEY) throw new Error("RAPIDAPI_KEY belum diset");

  const res = await fetch(`https://${API_HOST}/download?link=${encodeURIComponent(spotifyUrl)}`, {
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": API_HOST,
      "x-rapidapi-key": process.env.RAPIDAPI_KEY,
    },
    timeout: 20000,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false || body.error) {
    throw new Error(`RapidAPI Spotify HTTP ${res.status}: ${body.message || JSON.stringify(body).slice(0, 150)}`);
  }

  const data = body.data;
  const media = data?.medias?.find((m) => m.type === "audio") || data?.medias?.[0];
  if (!data || !media?.url) throw new Error("RapidAPI Spotify gak balikin link audio yang valid");

  return {
    title: data.title || "Untitled",
    artist: data.author || "Unknown",
    thumbnail: data.thumbnail || "",
    duration: parseDuration(data.duration),
    directAudioUrl: media.url,
  };
}

module.exports = { resolve };
