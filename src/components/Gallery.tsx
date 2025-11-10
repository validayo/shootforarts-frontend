import React, { useState, useEffect, useRef } from "react";
import Masonry from "react-masonry-css";
import { motion, AnimatePresence } from "framer-motion";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { ArrowUp } from "lucide-react";
import { Photo } from "../utils";
import { getPhotos } from "../lib/supabase";
import CategoryFilter from "./CategoryFilter";
import Skeleton from "../components/Skeleton";
import { trackGalleryView } from "../lib/analytics";

import "lazysizes";

const Gallery: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamically compute columns so zooming out reveals more columns
  const [columns, setColumns] = useState<number>(5);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const width = el.clientWidth || window.innerWidth;
      // Target ~300px per column; clamp between 2 and 12
      let next = Math.max(2, Math.min(12, Math.round(width / 300)));
      // Keep exactly 5 columns until 1900px wide, then allow 6+
      if (next >= 6 && width < 1980) next = 5;
      setColumns(next);
    };
    compute();
    let ro: ResizeObserver | null = null;
    if ("ResizeObserver" in window) {
      ro = new ResizeObserver(compute);
      ro.observe(el);
    }
    return () => {
      if (ro) ro.disconnect();
    };
  }, []);

  

  // Track gallery view when category changes (including initial load)
  useEffect(() => {
    try {
      trackGalleryView(activeCategory);
    } catch (_) {
      // no-op
    }
  }, [activeCategory]);

  // Fetch all photos (no pagination)
  useEffect(() => {
    const loadPhotos = async () => {
      setLoading(true);
      setError(null);
      try {
        const categoryParam = activeCategory !== "ALL" ? activeCategory : undefined;
        const newPhotos = await getPhotos(categoryParam);

        // Avoid duplicates, sort newest first
        const unique = Array.from(new Map(newPhotos.map((p) => [p.id, p])).values()).sort((a, b) => {
          const dateA = new Date(a.uploaded_at || "").getTime();
          const dateB = new Date(b.uploaded_at || "").getTime();
          return dateB - dateA;
        });

        setPhotos(unique);
        
      } catch (err) {
        console.error("❌ Error loading gallery:", err);
        setError("Failed to load photos. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [activeCategory]);

  // Show scroll-to-top button
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 800);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setIsLightboxOpen(true);
  };

  const scrollToTop = () =>
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  return (
    <div className="py-6 md:py-8 mt-16 md:mt-20" ref={containerRef}>
      <div className="container-custom">
        <CategoryFilter activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
      </div>

      {/* Loading State */}
      {loading && photos.length === 0 && (
        <div className="flex justify-center items-center py-20">
          <div className="loader" />
        </div>
      )}

      {/* Error */}
      {error && <div className="text-center py-20 text-red-500">{error}</div>}

      {/* Empty */}
      {!loading && !error && photos.length === 0 && <div className="text-center py-20">No photos found in this category.</div>}

      {/* Gallery Grid */}
      {photos.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="px-4">
          <Masonry breakpointCols={columns} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
            {photos.map((photo, index) => (
              <motion.div
                key={`${photo.id}-${index}`}
                className="my-masonry-grid_item"
                layout
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(index * 0.02, 0.4),
                  duration: 0.4,
                }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative cursor-pointer overflow-hidden rounded" onClick={() => handleImageClick(index)}>
                  {/* Skeleton placeholder */}
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" id={`skeleton-${photo.id}`} />

                  <img
                    data-src={photo.url}
                    className="lazyload w-full object-cover rounded shadow transition-opacity duration-300 opacity-0"
                    alt={`Shoot For Arts photography #${index + 1}`}
                    onLoad={(e) => {
                      e.currentTarget.classList.add("opacity-100");
                      const skeleton = document.getElementById(`skeleton-${photo.id}`);
                      if (skeleton) skeleton.style.display = "none";
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </Masonry>
        </motion.div>
      )}

      {/* Lightbox */}
      {photos.length > 0 && (
        <Lightbox
          open={isLightboxOpen}
          close={() => setIsLightboxOpen(false)}
          slides={photos.map((p) => ({ src: p.url }))}
          index={currentImageIndex}
          plugins={[Zoom]}
          zoom={{ maxZoomPixelRatio: 5, zoomInMultiplier: 2 }}
          carousel={{ finite: true, preload: 3 }}
          styles={{
            container: { backgroundColor: "rgba(0,0,0,0.9)" },
          }}
        />
      )}

      {/* Scroll-to-Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-accent-dark transition-colors duration-300"
            aria-label="Scroll to top"
          >
            <ArrowUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gallery;



