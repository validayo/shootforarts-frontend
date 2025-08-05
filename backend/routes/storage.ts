import express from "express";
import multer from "multer";
import sharp from "sharp";
import crypto from "crypto";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
//import { verifyToken } from "../utils/verifyToken.js"; // ✅ Import middleware

const router = express.Router();
const upload = multer();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CORS setup
router.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

router.options("/", (_, res) => res.sendStatus(204));

// 🔧 Utility: Generate file name
const generateFileName = (originalName: string) => {
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  return `${crypto.randomUUID()}-${baseName}.webp`;
};

// 🔧 Utility: Upload image to Supabase Storage
const uploadToStorage = async (
  bucket: string,
  path: string,
  buffer: Buffer
) => {
  return supabase.storage.from(bucket).upload(path, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
};

// 🔧 Utility: Get public URL
const getPublicUrl = (bucket: string, path: string) => {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

// 🔧 Utility: Insert photo metadata
const insertPhotoRecord = async (data: Record<string, any>) => {
  return supabase.from("photos").insert(data).select().single();
};

// 📤 Upload route
router.post("/", upload.array("files"), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { category, title } = req.body;
    const userId = req.body.userId;

    if (!files?.length || !category || !userId) {
      return res.status(400).json({ error: "Missing files, category, or user" });
    }

    const uploadedAt = new Date().toISOString();

    const uploadedPhotos = await Promise.all(
      files.map(async (file) => {
        const fileName = generateFileName(file.originalname);
        const image = sharp(file.buffer);
        const metadata = await image.metadata();

        const fullSizeBuffer = await image
          .resize({ width: 1920, withoutEnlargement: true, fit: "inside" })
          .webp({ quality: 90 })
          .toBuffer();

        const thumbBuffer = await image
          .resize({ width: 300, withoutEnlargement: true, fit: "inside" })
          .webp({ quality: 80 })
          .toBuffer();

        if (fullSizeBuffer.byteLength < 5000) {
          throw new Error("Upload flagged as unsafe");
        }

        const fullPath = `fullsize/${category}/${userId}/${fileName}`;
        const thumbPath = `thumbnails/${category}/${userId}/${fileName}`;

        const [{ error: fullErr }, { error: thumbErr }] = await Promise.all([
          uploadToStorage("photos", fullPath, fullSizeBuffer),
          uploadToStorage("photos", thumbPath, thumbBuffer),
        ]);

        if (fullErr || thumbErr) throw fullErr || thumbErr;

        const fullUrl = getPublicUrl("photos", fullPath);
        const thumbUrl = getPublicUrl("photos", thumbPath);

        const { data: photo, error: dbError } = await insertPhotoRecord({
          category,
          title,
          full_url: fullUrl,
          thumb_url: thumbUrl,
          width: metadata.width,
          height: metadata.height,
          size: file.size,
          uploaded_at: uploadedAt,
          uploaded_by: userId,
        });

        if (dbError) throw dbError;

        return photo;
      })
    );

    res.status(200).json(uploadedPhotos);
  } catch (err: any) {
    console.error("🚨 Upload Error:", err.message);
    res.status(500).json({ error: err.message || "Upload failed." });
  }
});

export default router;