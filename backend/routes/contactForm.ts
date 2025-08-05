import express, { Request, Response } from "express";
import { supabase } from "../utils/supabaseServer.js";
import { sendNewsletterEmail } from "../utils/email.js";
//import { verifyToken } from "../utils/verifyToken.js";

const router = express.Router();

// 📬 POST: Public newsletter subscription
router.post("/", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert([{ email, subscribedAt: new Date().toISOString() }]);

    if (error) throw error;

    await sendNewsletterEmail(email);

    res.json({ message: "Newsletter notification sent" });
  } catch (err: any) {
    console.error("❌ Error subscribing to newsletter:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 🔐 GET: Protected route to fetch subscribers
router.get("/subscribers", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribedAt", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err: any) {
    console.error("❌ Error fetching subscribers:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;