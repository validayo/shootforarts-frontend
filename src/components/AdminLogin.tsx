import React, { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../utils/supabaseClient"; // Adjust the path if your supabaseClient file is elsewhere
import { useNavigate } from 'react-router-dom';

const AdminLogin: React.FC = () => {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      navigate("/admin/"); // Redirect to admin dashboard on successful login
    } catch (err) {
      if (err instanceof Error) {
        console.error("Login error:", err.message);
        setError(err.message);
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="container-custom py-20 mt-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="max-w-md mx-auto">
        <h2 className="text-3xl font-serif mb-8 text-center">Admin Login</h2>

        {error && <div className="bg-red-50 text-red-800 p-4 mb-6 text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-primary mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              required
              className="w-full border border-accent p-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-primary mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              className="w-full border border-accent p-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-primary px-6 py-3 text-primary hover:bg-primary hover:text-secondary transition-colors duration-300"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="loader mr-2"></span> Logging in...
              </span>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default AdminLogin;
