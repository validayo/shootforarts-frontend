/*import { Request, Response, NextFunction } from "express";
import { createClient, User } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Extend Express Request type globally
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Middleware to verify Supabase token
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: "Invalid token" });
  }
  req.user = user;
  next();
}; */