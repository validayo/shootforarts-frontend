import React, { useState, useEffect, useCallback, useRef } from "react";
import Masonry from "react-masonry-css";
import { motion, AnimatePresence } from "framer-motion";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { ArrowUp } from "lucide-react";
import { Photo } from "../utils";
import { getPhotos } from "../lib/supabase";
import CategoryFilter from "./CategoryFilter";
import "lazysizes";

const PAGE_SIZE = 20;

const Gallery: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [page, setPage] = useState(0);
  const [finished, setFinished] = useState(false);

  // guards for racing / duplicates
  const inFlightRef = useRef(false);
  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const breakpointColumns = {
    default: 5,
    1536: 5,
    1280: 4,
    1024: 2,
    768: 2,
  };

  const bestThumb = (p: Photo) => p.url_thumb || p.url_medium || p.url_large || p.url;
  const bestMedium = (p: Photo) => p.url_medium || p.url_large || p.url;
  const bestLarge = (p: Photo) => p.url_large || p.url;
  const bestFull = (p: Photo) => p.url || p.url_large || p.url_medium || p.url_thumb;

  // Preload N upcoming full-size images for smoother lightbox
  const preloadFull = useCallback((src: string) => {
    const img = new Image();
    img.src = src;
  }, []);

  const preloadNextImages = useCallback(() => {
    if (!photos.length) return;
    for (let i = 1; i <= 3; i++) {
      const nextIndex = (currentImageIndex + i) % photos.length;
      preloadFull(bestFull(photos[nextIndex]));
    }
  }, [currentImageIndex, photos, preloadFull]);

  // De-dupe helper by id
  const mergeUnique = (prev: Photo[], incoming: Photo[]) => {
    const seen = new Set(prev.map((p) => p.id));
    const merged = [...prev];
    for (const p of incoming) {
      if (!seen.has(p.id)) {
        merged.push(p);
        seen.add(p.id);
      }
    }
    return merged;
  };

  // Fetch with pagination + race protection
  const fetchMorePhotos = useCallback(async () => {
    if (loading || finished || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    const thisRequest = ++requestIdRef.current;
    try {
      const categoryParam = activeCategory !== "ALL" ? activeCategory : undefined;
      const newPhotos = await getPhotos(categoryParam, page, PAGE_SIZE);

      // ignore stale responses (e.g., user changed category mid-flight)
      if (thisRequest !== requestIdRef.current) return;

      if (!newPhotos.length) {
        setFinished(true);
      } else {
        setPhotos((prev) => mergeUnique(prev, newPhotos));
        setPage((prev) => prev + 1);
        // warm up a few thumbnails (lazySizes will take over)
        newPhotos.slice(0, 5).forEach((p) => {
          const img = new Image();
          img.src = bestThumb(p);
        });
      }
    } catch (err) {
      console.error("Error fetching photos:", err);
      setError("Failed to load photos. Please try again later.");
    } finally {
      if (thisRequest === requestIdRef.current) {
        setLoading(false);
        inFlightRef.current = false;
      }
    }
  }, [activeCategory, page, finished, loading]);

  // Reset on category change
  useEffect(() => {
    // bump request id so any in-flight resolves are ignored
    requestIdRef.current++;
    inFlightRef.current = false;
    setPhotos([]);
    setPage(0);
    setFinished(false);
    setError(null);
  }, [activeCategory]);

  // Initial and subsequent loads
  useEffect(() => {
    if (page === 0 && !finished) {
      fetchMorePhotos();
    }
  }, [page, finished, fetchMorePhotos]);

  // Lightbox preloads
  useEffect(() => {
    preloadNextImages();
  }, [currentImageIndex, preloadNextImages]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 800);

      if (!containerRef.current || loading || finished) return;
      const { bottom } = containerRef.current.getBoundingClientRect();
      // ask earlier to avoid gaps
      if (bottom < window.innerHeight + 600) fetchMorePhotos();
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, finished, fetchMorePhotos]);

  // open lightbox
  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setIsLightboxOpen(true);
    preloadNextImages();
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // Lightbox slides use largest available URL
  const lightboxSlides = photos.map((p) => ({ src: bestFull(p) }));

  return (
    <div className="py-6 md:py-8 mt-20" ref={containerRef}>
      <CategoryFilter activeCategory={activeCategory} setActiveCategory={setActiveCategory} />

      {/* Loading state (initial) */}
      {loading && photos.length === 0 && (
        <div className="flex justify-center items-center py-20">
          <div className="loader" />
        </div>
      )}

      {/* Error */}
      {error && <div className="text-center py-20 text-red-500">{error}</div>}

      {/* Empty */}
      {!loading && !error && photos.length === 0 && <div className="text-center py-20">No photos found in this category.</div>}

      {/* Grid */}
      {photos.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="px-4">
          <Masonry breakpointCols={breakpointColumns} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
            {photos.map((photo, index) => {
              const thumb = bestThumb(photo);
              const med = bestMedium(photo);
              const large = bestLarge(photo);
              const full = bestFull(photo);

              return (
                <motion.div
                  key={photo.id}
                  className="my-masonry-grid_item"
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.4), duration: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="cursor-pointer overflow-hidden" onClick={() => handleImageClick(index)}>
                    {/* lazysizes with responsive sources */}
                    <img
                      // lazysizes expects data-* attributes
                      data-src={thumb}
                      data-srcset={`
                        ${thumb} 400w,
                        ${med} 800w,
                        ${large} 1600w,
                        ${full} 2400w
                      `}
                      sizes="(max-width: 768px) 100vw,
                             (max-width: 1280px) 50vw,
                             25vw"
                      className="lazyload w-full object-cover rounded shadow"
                      alt={`Shoot For Arts photography #${index + 1}`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </Masonry>
        </motion.div>
      )}

      {/* Lightbox */}
      {lightboxSlides.length > 0 && (
        <Lightbox
          open={isLightboxOpen}
          close={() => setIsLightboxOpen(false)}
          slides={lightboxSlides}
          index={currentImageIndex}
          plugins={[Zoom]}
          zoom={{ maxZoomPixelRatio: 5, zoomInMultiplier: 2 }}
          on={{
            click: () => {
              const nextIndex = (currentImageIndex + 1) % photos.length;
              setCurrentImageIndex(nextIndex);
              preloadNextImages();
            },
          }}
          carousel={{ finite: true, preload: 3 }}
          styles={{ container: { backgroundColor: "rgba(0,0,0,0.9)" } }}
        />
      )}

      {/* Scroll-to-top */}
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
