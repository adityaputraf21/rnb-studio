const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const router = express.Router();
const ytdlp = require("../services/ytdlp");
const ffmpeg = require("../services/ffmpeg");
const db = require("../services/db");
const { requireAuth } = require("../middleware/auth");
const { checkUsageLimit } = require("../middleware/usageLimit");

const TMP_DIR = process.env.TMP_DIR || "./tmp";
const upload = multer({ dest: TMP_DIR, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB cap

// Link-based convert: `url` here should be the actual downloadable source.
// For YouTube/SoundCloud/TikTok that's the original link (or a RapidAPI
// direct MP3 link for YouTube, handled inside ytdlp.downloadAudio). For
// Spotify, `direct: true` means the resolver already got us a ready-to-fetch
// MP3 URL — but those links can be short-lived/single-use, so if we have the
// original Spotify URL we re-resolve fresh right before downloading instead
// of reusing the (possibly stale) link from the earlier /api/resolve call.
router.post("/", requireAuth, checkUsageLimit, async (req, res) => {
  const { url, speed, amplifyDb, pitch, format, title, artist, direct, platform, originUrl } = req.body;
  if (!url) return res.status(400).json({ error: "url wajib diisi" });

  let rawPath;
  try {
    let downloadUrl = url;
    if (direct && platform === "spotify" && originUrl) {
      try {
        const rapidapiSpotify = require("../services/rapidapiSpotify");
        const fresh = await rapidapiSpotify.resolve(originUrl);
        downloadUrl = fresh.directAudioUrl;
      } catch (err) {
        console.error("Gagal re-resolve link Spotify fresh, pakai link lama:", err.message);
      }
    }

    rawPath = direct ? await ytdlp.downloadDirect(downloadUrl) : await ytdlp.downloadAudio(downloadUrl);
    const { outPath, pitchApplied } = await ffmpeg.process(rawPath, {
      speed: Number(speed) || 1.0,
      amplifyDb: Number(amplifyDb) || 0,
      pitchSemitones: Number(pitch) || 0,
      format: format === "ogg" ? "ogg" : "mp3",
    });

    const stats = fs.statSync(outPath);
    const fileId = path.basename(outPath);
    await db.incrementUsage(req.user.id);

    res.json({
      fileId,
      sizeMb: (stats.size / (1024 * 1024)).toFixed(2),
      title: title || "Untitled",
      artist: artist || "Unknown",
      format: format === "ogg" ? "ogg" : "mp3",
      pitchApplied,
      usage: req.usageInfo,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (rawPath && fs.existsSync(rawPath)) fs.unlink(rawPath, () => {});
  }
});

// Direct file upload convert ("Upload MP3" tab) — skips resolve/download
// entirely, goes straight to ffmpeg processing of whatever was uploaded.
router.post("/upload-file", requireAuth, checkUsageLimit, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File audio wajib diupload" });

  const { speed, amplifyDb, pitch, format, title, artist } = req.body;
  const rawPath = req.file.path;

  try {
    const { outPath, pitchApplied } = await ffmpeg.process(rawPath, {
      speed: Number(speed) || 1.0,
      amplifyDb: Number(amplifyDb) || 0,
      pitchSemitones: Number(pitch) || 0,
      format: format === "ogg" ? "ogg" : "mp3",
    });

    const stats = fs.statSync(outPath);
    const fileId = path.basename(outPath);
    await db.incrementUsage(req.user.id);

    res.json({
      fileId,
      sizeMb: (stats.size / (1024 * 1024)).toFixed(2),
      title: title || req.file.originalname.replace(/\.[^.]+$/, "") || "Untitled",
      artist: artist || "Unknown",
      format: format === "ogg" ? "ogg" : "mp3",
      pitchApplied,
      usage: req.usageInfo,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (rawPath && fs.existsSync(rawPath)) fs.unlink(rawPath, () => {});
  }
});

// Download/preview the converted file before uploading to Roblox
router.get("/file/:fileId", requireAuth, (req, res) => {
  const filePath = path.resolve(TMP_DIR, req.params.fileId);
  if (!filePath.startsWith(path.resolve(TMP_DIR))) return res.status(400).end();
  if (!fs.existsSync(filePath)) return res.status(404).end();

  const ext = path.extname(filePath);
  const safeName = (req.query.name || "audio").replace(/[^a-z0-9 _-]/gi, "").trim() || "audio";
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}${ext}"`);
  res.sendFile(path.resolve(filePath));
});

module.exports = router;
