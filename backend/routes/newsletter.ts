import express from "express";
import { supabase } from "../utils/supabaseServer.js";
import { sendNewsletterEmail } from "../utils/email.js";
//import { verifyToken } from "../utils/verifyToken.js";

const router = express.Router();

// POST: Handle newsletter subscription (public)
router.post("/", async (req, res) => {
  try {
    const { email } = req.body;

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

// ✅ GET: Fetch subscribers (protected)
router.get("/subscribers", async (req, res) => {
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