const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const TMP_DIR = process.env.TMP_DIR || "./tmp";
const API_HOST = "youtube-mp36.p.rapidapi.com";

function extractYoutubeId(url) {
  // Handles youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, etc.
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function callApi(videoId) {
  const res = await fetch(`https://${API_HOST}/dl?id=${videoId}`, {
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": API_HOST,
      "x-rapidapi-key": process.env.RAPIDAPI_KEY,
    },
    timeout: 15000,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`RapidAPI HTTP ${res.status}: ${body.slice(0, 150)}`);
  }
  return res.json();
}

// The API sometimes returns status "processing" while it converts server-side
// — poll until it's "ok" (has the download link) or we give up.
async function getInfo(url) {
  if (!process.env.RAPIDAPI_KEY) throw new Error("RAPIDAPI_KEY belum diset");

  const videoId = extractYoutubeId(url);
  if (!videoId) throw new Error("Gak bisa extract video ID dari URL YouTube ini");

  let data;
  for (let attempt = 0; attempt < 10; attempt++) {
    data = await callApi(videoId);
    if (data.status === "ok" && data.link) break;
    if (data.status === "fail" || data.status === "error") {
      throw new Error(`RapidAPI gagal proses video: ${data.msg || JSON.stringify(data)}`);
    }
    await new Promise((r) => setTimeout(r, 2000)); // still "processing" — wait and retry
  }
  if (!data || data.status !== "ok" || !data.link) {
    throw new Error("RapidAPI timeout — video terlalu lama diproses server mereka");
  }

  return {
    title: data.title || "Untitled",
    artist: "Unknown", // this API doesn't provide a separate artist/channel field
    duration: data.duration ? Math.round(data.duration) : undefined,
    thumbnail: "",
    downloadUrl: data.link,
    sourceUrl: url,
  };
}

async function downloadAudio(url) {
  const info = await getInfo(url);
  const res = await fetch(info.downloadUrl, { timeout: 60000 });
  if (!res.ok) throw new Error(`Gagal download file MP3 dari RapidAPI (HTTP ${res.status})`);

  const id = uuid();
  const outPath = path.join(TMP_DIR, `${id}.raw.mp3`);
  await new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(outPath);
    res.body.pipe(dest);
    res.body.on("error", reject);
    dest.on("finish", resolve);
    dest.on("error", reject);
  });

  return outPath;
}

module.exports = { extractYoutubeId, getInfo, downloadAudio };
