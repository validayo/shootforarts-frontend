import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import "yet-another-react-lightbox/styles.css";
import { ArrowUp } from "lucide-react";

import { Photo } from "../../utils";
import { getGallery } from "../../lib/api/services";
import CategoryFilter from "./CategoryFilter";
import { trackGalleryLightboxOpen, trackGalleryView } from "../../lib/analytics/events";
import { toSupabaseRenderImageUrl } from "../../utils/supabaseImage";

const Masonry = lazy(() => import("react-masonry-css"));
const Lightbox = lazy(() => import("yet-another-react-lightbox"));

type MotionModule = typeof import("framer-motion");
type ZoomPlugin = typeof import("yet-another-react-lightbox/plugins/zoom")["default"];
type GalleryPhoto = Photo & { thumbnailUrl: string; thumbnailFallbackUrl: string; fullSizeUrl?: string };

const THUMB_TRANSFORM = { width: 480, quality: 70, format: "webp" } as const;
const FULL_TRANSFORM = { width: 1200, quality: 85, format: "webp" } as const;
const THUMB_RENDER_WIDTH = THUMB_TRANSFORM.width ?? 480;
const THUMB_RENDER_HEIGHT = Math.round((THUMB_RENDER_WIDTH * 4) / 3);

const normalizePhotos = (photos: Photo[]): GalleryPhoto[] => {
  const unique = new Map<string, Photo>();
  photos.forEach((photo) => {
    if (photo?.id && !unique.has(photo.id)) {
      unique.set(photo.id, photo);
    }
  });

  return Array.from(unique.values())
    .map((photo) => ({
      ...photo,
      // Prefer canonical storage URL for consistent render transforms across environments.
      thumbnailFallbackUrl: photo.url,
      thumbnailUrl: toSupabaseRenderImageUrl(photo.url, THUMB_TRANSFORM),
    }));
};

const Gallery: React.FC = () => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [columns, setColumns] = useState<number>(5);
  const [motionLib, setMotionLib] = useState<MotionModule | null>(null);
  const [zoomPlugin, setZoomPlugin] = useState<ZoomPlugin | null>(null);
  const [fullFetchStatus, setFullFetchStatus] = useState<"idle" | "loading" | "loaded">("idle");
  const [lightboxPreparing, setLightboxPreparing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeCategoryRef = useRef(activeCategory);
  const zoomImportRef = useRef<Promise<ZoomPlugin | null> | null>(null);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    try {
      trackGalleryView(activeCategory);
    } catch (_) {
      // no-op
    }
  }, [activeCategory]);

  const loadZoomPlugin = useCallback(async () => {
    if (zoomPlugin) return zoomPlugin;
    if (!zoomImportRef.current) {
      zoomImportRef.current = import("yet-another-react-lightbox/plugins/zoom")
        .then((mod) => mod.default)
        .catch((err) => {
          console.warn("Failed to load zoom plugin", err);
          return null;
        });
    }
    const plugin = await zoomImportRef.current;
    if (plugin && !zoomPlugin) {
      setZoomPlugin(() => plugin);
    }
    return plugin;
  }, [zoomPlugin, setZoomPlugin]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      loadZoomPlugin().catch(() => undefined);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [loadZoomPlugin]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const compute = () => {
      const width = el.clientWidth || window.innerWidth;
      let next = Math.max(2, Math.min(12, Math.round(width / 300)));
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

  useEffect(() => {
    let mounted = true;
    import("framer-motion")
      .then((mod) => {
        if (mounted) setMotionLib(mod);
      })
      .catch((err) => console.warn("Failed to load framer-motion", err));

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const categoryKey = activeCategory === "ALL" ? "ALL" : activeCategory;

    const loadPhotos = async () => {
      setLoading(true);
      setError(null);
      setFullFetchStatus("idle");

      try {
        const rawPhotos = await getGallery(categoryKey, THUMB_TRANSFORM);
        if (cancelled || activeCategoryRef.current !== categoryKey) return;
        setPhotos(normalizePhotos(Array.isArray(rawPhotos) ? rawPhotos : []));
      } catch (err) {
        console.error("Error loading gallery:", err);
        if (!cancelled) setError("Failed to load photos. Please try again later.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPhotos();

    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  const ensureFullResolution = useCallback(() => {
    if (fullFetchStatus !== "idle") return;
    setFullFetchStatus("loading");
    const categoryKey = activeCategoryRef.current === "ALL" ? "ALL" : activeCategoryRef.current;

    getGallery(categoryKey, FULL_TRANSFORM)
      .then((rawPhotos) => {
        if (activeCategoryRef.current !== categoryKey) {
          setFullFetchStatus("idle");
          return;
        }

        const fullMap = new Map<string, string>();
        (Array.isArray(rawPhotos) ? rawPhotos : []).forEach((photo) => {
          if (photo?.id) {
            fullMap.set(photo.id, photo.url);
          }
        });
        setPhotos((prev) =>
          prev.map((photo) => {
            const fullUrl = fullMap.get(photo.id);
            if (!fullUrl) return photo;
            return {
              ...photo,
              url: fullUrl,
              fullSizeUrl: fullUrl,
            };
          })
        );
        setFullFetchStatus("loaded");
      })
      .catch((err) => {
        console.warn("Failed to fetch high-res gallery", err);
        setFullFetchStatus("idle");
      });
  }, [fullFetchStatus]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 800);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleImageClick = (index: number) => {
    const selectedPhoto = photos[index];
    trackGalleryLightboxOpen({
      category: activeCategoryRef.current,
      index,
      photoId: selectedPhoto?.id,
    });
    ensureFullResolution();
    setCurrentImageIndex(index);
    setLightboxPreparing(true);
    loadZoomPlugin()
      .catch(() => null)
      .finally(() => {
        setIsLightboxOpen(true);
        setLightboxPreparing(false);
      });
  };

  const handleImageKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleImageClick(index);
    }
  };

  const scrollToTop = () =>
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  const motionComponents = motionLib
    ? {
        MotionDiv: motionLib.motion.div,
        MotionItem: motionLib.motion.div,
        MotionButton: motionLib.motion.button,
        AnimatePresence: motionLib.AnimatePresence,
      }
    : null;
  const MotionDiv = motionComponents?.MotionDiv;
  const MotionItem = motionComponents?.MotionItem;
  const MotionButton = motionComponents?.MotionButton;
  const AnimatePresence = motionComponents?.AnimatePresence;

  return (
    <div className="py-6 md:py-8 mt-16 md:mt-20" ref={containerRef}>
      <div className="container-custom">
        <CategoryFilter activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
      </div>

      {loading && photos.length === 0 && (
        <div className="flex justify-center items-center py-20">
          <div className="loader" />
        </div>
      )}

      {error && <div className="text-center py-20 text-red-500">{error}</div>}

      {!loading && !error && photos.length === 0 && <div className="text-center py-20">No photos found in this category.</div>}

      {photos.length > 0 && (
        MotionDiv ? (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="px-4">
            <Suspense fallback={<div className="py-10 text-center text-sm text-gray-500">Loading gallery...</div>}>
              <Masonry breakpointCols={columns} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
                {photos.map((photo, index) => {
                  const card = (
                    <div
                      className="relative cursor-pointer overflow-hidden rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                      onClick={() => handleImageClick(index)}
                      onKeyDown={(event) => handleImageKeyDown(event, index)}
                      role="button"
                      tabIndex={0}
                      aria-haspopup="dialog"
                      aria-label={`Open photo ${index + 1} in lightbox`}
                    >
                      <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" id={`skeleton-${photo.id}`} />
                      <img
                        src={photo.thumbnailUrl}
                        loading={index === 0 ? "eager" : "lazy"}
                        width={THUMB_RENDER_WIDTH}
                        height={THUMB_RENDER_HEIGHT}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        decoding="async"
                        className="w-full object-cover rounded shadow transition-opacity duration-300 opacity-0"
                        alt={`Shoot For Arts photography #${index + 1}`}
                        onLoad={(e) => {
                          e.currentTarget.classList.add("opacity-100");
                          const skeleton = document.getElementById(`skeleton-${photo.id}`);
                          if (skeleton) skeleton.style.display = "none";
                        }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.dataset.fallbackApplied === "1") return;
                          if (photo.thumbnailFallbackUrl && target.src !== photo.thumbnailFallbackUrl) {
                            target.dataset.fallbackApplied = "1";
                            target.src = photo.thumbnailFallbackUrl;
                          }
                        }}
                      />
                    </div>
                  );

                  return MotionItem ? (
                    <MotionItem
                      key={`${photo.id}-${index}`}
                      className="my-masonry-grid_item"
                      layout
                      initial={{ opacity: 0, y: 25 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.4), duration: 0.4 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      {card}
                    </MotionItem>
                  ) : (
                    <div key={`${photo.id}-${index}`} className="my-masonry-grid_item">
                      {card}
                    </div>
                  );
                })}
              </Masonry>
            </Suspense>
          </MotionDiv>
        ) : (
          <div className="px-4">
            <Suspense fallback={<div className="py-10 text-center text-sm text-gray-500">Loading gallery...</div>}>
              <Masonry breakpointCols={columns} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
                {photos.map((photo, index) => (
                  <div
                    key={`${photo.id}-${index}`}
                    className="my-masonry-grid_item focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 rounded"
                    onClick={() => handleImageClick(index)}
                    onKeyDown={(event) => handleImageKeyDown(event, index)}
                    role="button"
                    tabIndex={0}
                    aria-haspopup="dialog"
                    aria-label={`Open photo ${index + 1} in lightbox`}
                  >
                    <div className="relative cursor-pointer overflow-hidden rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2">
                      <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" id={`skeleton-${photo.id}`} />
                      <img
                        src={photo.thumbnailUrl}
                        loading={index === 0 ? "eager" : "lazy"}
                        width={THUMB_RENDER_WIDTH}
                        height={THUMB_RENDER_HEIGHT}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        decoding="async"
                        className="w-full object-cover rounded shadow transition-opacity duration-300 opacity-0"
                        alt={`Shoot For Arts photography #${index + 1}`}
                        onLoad={(e) => {
                          e.currentTarget.classList.add("opacity-100");
                          const skeleton = document.getElementById(`skeleton-${photo.id}`);
                          if (skeleton) skeleton.style.display = "none";
                        }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.dataset.fallbackApplied === "1") return;
                          if (photo.thumbnailFallbackUrl && target.src !== photo.thumbnailFallbackUrl) {
                            target.dataset.fallbackApplied = "1";
                            target.src = photo.thumbnailFallbackUrl;
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </Masonry>
            </Suspense>
          </div>
        )
      )}

      {isLightboxOpen && photos.length > 0 && (
        <Suspense fallback={null}>
          <Lightbox
            open={isLightboxOpen}
            close={() => setIsLightboxOpen(false)}
            slides={photos.map((p) => ({ src: p.fullSizeUrl || p.url || p.thumbnailUrl }))}
            index={currentImageIndex}
            plugins={zoomPlugin ? [zoomPlugin] : []}
            zoom={{ maxZoomPixelRatio: 5, zoomInMultiplier: 2 }}
            carousel={{ finite: true, preload: 3 }}
            styles={{
              container: { backgroundColor: "rgba(0,0,0,0.9)" },
            }}
          />
        </Suspense>
      )}

      {lightboxPreparing && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs font-medium text-white shadow-lg">
          Preparing photo...
        </div>
      )}

      {AnimatePresence ? (
        <AnimatePresence>
          {showScrollTop && MotionButton && (
            <MotionButton
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-accent-dark transition-colors duration-300"
              aria-label="Scroll to top"
            >
              <ArrowUp size={24} />
            </MotionButton>
          )}
        </AnimatePresence>
      ) : (
        showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-accent-dark transition-colors duration-300"
            aria-label="Scroll to top"
          >
            <ArrowUp size={24} />
          </button>
        )
      )}
    </div>
  );
};

export default Gallery;

