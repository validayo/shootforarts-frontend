import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    // Map to a simple structure for frontend
    const images = data.map((img) => ({
      url: img.url,
      category: img.category,
      id: img.id,
      uploaded_at: img.uploaded_at,
    }));

    res.json(images);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
