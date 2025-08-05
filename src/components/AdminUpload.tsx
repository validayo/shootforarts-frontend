import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Photo } from "../utils";

interface AdminUploadProps {
  onUploadComplete?: () => void;
}

const MAX_FILE_SIZE_MB = 5;

const AdminUpload: React.FC<AdminUploadProps> = ({ onUploadComplete }) => {
  const supabase = useSupabaseClient();
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [progressMap, setProgressMap] = useState<{ [filename: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const validFiles: File[] = [];
    const previews: string[] = [];
    const initialProgress: { [filename: string]: number } = {};

    Array.from(selectedFiles).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} is not a valid image.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`${file.name} exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
        return;
      }

      validFiles.push(file);
      initialProgress[file.name] = 0;

      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        setFilePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (validFiles.length === 0) {
      setFiles([]);
      return;
    }

    setProgressMap(initialProgress);
    setError("");
    setFiles(validFiles);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!files.length) {
      setError("Please select image files.");
      return;
    }

    if (!category) {
      setError("Please select a category.");
      return;
    }

    setUploading(true);
    setShowSuccess(false);
    setProgressMap({});

    try {
      const uploadedMetadata: Photo[] = [];

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to retrieve access token.");
      }

      const token = session.access_token;

      for (const file of files) {
        const formData = new FormData();
        formData.append("files", file);
        formData.append("category", category);

        const response = await fetch("https://your-vercel-backend.vercel.app/upload-photos", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Upload failed.");
        }

        const photo: Photo = await response.json();
        uploadedMetadata.push(photo);
        setProgressMap((prev) => ({ ...prev, [file.name]: 100 }));
      }

      setShowSuccess(true);
      setFiles([]);
      setFilePreviews([]);
      setCategory("");

      if (typeof onUploadComplete === "function") {
        onUploadComplete();
      }

      console.log("✅ Uploaded:", uploadedMetadata);
    } catch (err: any) {
      console.error("🚨 Upload error:", err.message);
      setError(err.message || "Something went wrong.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      className="container-custom py-16 mt-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-xl mx-auto">
        <h2 className="text-3xl font-serif mb-8">Upload Photos</h2>

        {error && <div className="bg-red-50 text-red-800 p-4 mb-6">{error}</div>}

        {showSuccess && (
          <motion.div
            className="bg-green-50 text-green-900 p-4 mb-6 rounded text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h3 className="text-xl font-semibold mb-2">✅ Upload Complete!</h3>
            <p>Your photos were uploaded successfully.</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-primary mb-2">Select Images*</label>
            <div
              className="border-2 border-dashed border-accent p-8 text-center cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
                multiple
              />
              <div className="flex flex-col items-center">
                <span className="text-3xl mb-2">+</span>
                <span>Drop files here or click to select</span>
              </div>
            </div>
          </div>

          {filePreviews.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              {filePreviews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt={`preview-${i}`} className="rounded border w-full" />
                  {uploading && (
                    <div className="absolute bottom-2 left-0 right-0 px-2">
                      <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <motion.div
                          className="bg-primary h-2.5 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressMap[files[i]?.name] || 0}%` }}
                          transition={{ ease: "easeOut", duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <label htmlFor="category" className="block text-primary mb-2">
              Category*
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-accent p-2"
              required
            >
              <option value="" disabled>Select category</option>
              <option value="PORTRAITS">Portraits</option>
              <option value="EVENTS">Events</option>
              <option value="WEDDINGS">Weddings</option>
              <option value="EXTRAS">Extras</option>
            </select>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={uploading}
              className="border border-primary px-6 py-2 text-primary hover:bg-primary hover:text-secondary transition-colors duration-300 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default AdminUpload;