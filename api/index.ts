import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.resolve(__dirname, "../backend/.env") });
}

// routers
import contactFormRouter from "../backend/routes/contactForm.js";
import newsletterRouter from "../backend/routes/newsletter.js";
import storageRouter from "../backend/routes/storage.js";
import galleryRouter from "../backend/routes/gallery.js";

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Authorization", "Content-Type"],
}));
app.use(express.json());

app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", corsOrigin);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(204);
});

// Basic endpoints js to test 
app.get("/ping", (_, res) => {
  res.json({ message: "🏓 Pong from backend!" });
});
app.get("/health", (_, res) => {
  res.status(200).send("✅ Backend is healthy");
});
console.log("Loaded router file: <filename>");

// Mount routers
app.use("/contact-form", contactFormRouter);
app.use("/newsletter", newsletterRouter);
app.use("/upload-photos", storageRouter);
app.use("/images", galleryRouter);

// Error handler (with CORS)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", corsOrigin);
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.header("Access-Control-Allow-Credentials", "true");
  if (!res.headersSent) {
    res.status(err.status || 500).json({ error: err.message });
  }
});


export default app;