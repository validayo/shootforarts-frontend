import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Loader2, Save, Trash2 } from "lucide-react";
import type { Photo } from "../utils";
import {
  deletePhoto,
  getAllPhotos,
  getSeasonPhotos,
  getTopPhotos,
  saveSeasonOrder,
  saveTopOrder,
  setSeasonTag,
  setTop,
  type SeasonTag,
} from "../lib/services";

const TOP_LIMIT = 12;
const CATEGORY_OPTIONS = ["ALL", "Portraits", "Events", "Weddings", "Extras"] as const;
const SEASON_OPTIONS: SeasonTag[] = ["winter", "spring", "summer", "fall"];
const TOP_ITEM_TYPE = "top-photo";
const SEASON_ITEM_TYPE = "season-photo";

interface DragItem {
  index: number;
}

interface SortablePhotoCardProps {
  photo: Photo;
  index: number;
  dndType: string;
  onMove: (fromIndex: number, toIndex: number) => void;
  action: React.ReactNode;
}

const currentSeasonUTC = (): SeasonTag => {
  const month = new Date().getUTCMonth() + 1;
  if (month === 12 || month === 1 || month === 2) return "winter";
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  return "fall";
};

const moveArrayItem = <T,>(list: T[], fromIndex: number, toIndex: number): T[] => {
  const next = [...list];
  const [picked] = next.splice(fromIndex, 1);
  if (typeof picked === "undefined") return list;
  next.splice(toIndex, 0, picked);
  return next;
};

const photoSrc = (photo: Photo) => photo.transformed_url ?? photo.url;

const seasonLabel = (season: string) => season.charAt(0).toUpperCase() + season.slice(1);

const SortablePhotoCard: React.FC<SortablePhotoCardProps> = ({ photo, index, dndType, onMove, action }) => {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: dndType,
      item: { index } as DragItem,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [index, dndType]
  );

  const [, dropRef] = useDrop(
    () => ({
      accept: dndType,
      hover: (item: DragItem) => {
        if (item.index === index) return;
        onMove(item.index, index);
        item.index = index;
      },
    }),
    [index, onMove, dndType]
  );

  return (
    <div
      ref={(node) => {
        dragRef(dropRef(node));
      }}
      className={`rounded-xl border border-gray-200 bg-white p-2 shadow-sm transition-opacity ${isDragging ? "opacity-50" : "opacity-100"}`}
    >
      <img src={photoSrc(photo)} alt={photo.category || "photo"} className="h-28 w-full rounded-md object-cover" loading="lazy" />
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-600">
        <span className="truncate">{photo.category || "Uncategorized"}</span>
        <span className="rounded bg-gray-100 px-2 py-0.5">Drag</span>
      </div>
      <div className="mt-2">{action}</div>
    </div>
  );
};

const AdminGalleryManager: React.FC = () => {
  const currentSeason = useMemo(() => currentSeasonUTC(), []);
  const [topPhotos, setTopPhotos] = useState<Photo[]>([]);
  const [seasonPhotos, setSeasonPhotos] = useState<Photo[]>([]);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [browserCategory, setBrowserCategory] = useState<string>("ALL");
  const [loadingManagers, setLoadingManagers] = useState<boolean>(true);
  const [loadingAllPhotos, setLoadingAllPhotos] = useState<boolean>(true);
  const [savingTop, setSavingTop] = useState<boolean>(false);
  const [savingSeason, setSavingSeason] = useState<boolean>(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const topCount = topPhotos.length;

  const refreshManagers = useCallback(async () => {
    setLoadingManagers(true);
    try {
      const [top, season] = await Promise.all([getTopPhotos(), getSeasonPhotos(currentSeason)]);
      setTopPhotos(top);
      setSeasonPhotos(season);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to load Top/Season photos.";
      setError(text);
    } finally {
      setLoadingManagers(false);
    }
  }, [currentSeason]);

  const refreshAllPhotos = useCallback(async (category: string) => {
    setLoadingAllPhotos(true);
    try {
      const photos = await getAllPhotos(category);
      setAllPhotos(photos);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to load photos.";
      setError(text);
    } finally {
      setLoadingAllPhotos(false);
    }
  }, []);

  useEffect(() => {
    refreshManagers();
  }, [refreshManagers]);

  useEffect(() => {
    refreshAllPhotos(browserCategory);
  }, [browserCategory, refreshAllPhotos]);

  const moveTopPhoto = useCallback((fromIndex: number, toIndex: number) => {
    setTopPhotos((prev) => moveArrayItem(prev, fromIndex, toIndex));
  }, []);

  const moveSeasonPhoto = useCallback((fromIndex: number, toIndex: number) => {
    setSeasonPhotos((prev) => moveArrayItem(prev, fromIndex, toIndex));
  }, []);

  const handleToggleTop = useCallback(
    async (photo: Photo) => {
      const makeTop = !photo.is_top;
      if (makeTop && topCount >= TOP_LIMIT) {
        setError(`Top list is full (${TOP_LIMIT}/${TOP_LIMIT}). Remove one before adding another.`);
        return;
      }

      setBusyPhotoId(photo.id);
      setError(null);
      setMessage(null);
      try {
        await setTop(photo.id, makeTop);
        setAllPhotos((prev) =>
          prev.map((item) => (item.id === photo.id ? { ...item, is_top: makeTop, top_rank: makeTop ? item.top_rank ?? null : null } : item))
        );
        setTopPhotos((prev) => {
          if (makeTop) {
            if (prev.some((item) => item.id === photo.id)) return prev;
            const nextRank = prev.length + 1;
            return [...prev, { ...photo, is_top: true, top_rank: photo.top_rank ?? nextRank }];
          }
          return prev.filter((item) => item.id !== photo.id);
        });
        setSeasonPhotos((prev) => {
          const withoutCurrent = prev.filter((item) => item.id !== photo.id);
          if (makeTop) return withoutCurrent;
          const isCurrentSeason = (photo.season_tag ?? "").toLowerCase() === currentSeason;
          if (!isCurrentSeason) return withoutCurrent;
          const nextRank = withoutCurrent.length + 1;
          return [...withoutCurrent, { ...photo, is_top: false, season_tag: currentSeason, season_rank: photo.season_rank ?? nextRank }];
        });
        setMessage(makeTop ? "Added photo to Top list." : "Removed photo from Top list.");
      } catch (err) {
        const text = err instanceof Error ? err.message : "Failed to update Top status.";
        setError(text);
      } finally {
        setBusyPhotoId(null);
      }
    },
    [currentSeason, topCount]
  );

  const handleSeasonChange = useCallback(
    async (photo: Photo, season: string) => {
      const nextSeason = season ? (season as SeasonTag) : null;
      setBusyPhotoId(photo.id);
      setError(null);
      setMessage(null);
      try {
        await setSeasonTag(photo.id, nextSeason);
        setAllPhotos((prev) =>
          prev.map((item) => (item.id === photo.id ? { ...item, season_tag: nextSeason, season_rank: nextSeason ? item.season_rank ?? null : null } : item))
        );
        setSeasonPhotos((prev) => {
          const withoutCurrent = prev.filter((item) => item.id !== photo.id);
          if (photo.is_top) return withoutCurrent;
          if (nextSeason !== currentSeason) return withoutCurrent;
          const nextRank = withoutCurrent.length + 1;
          return [...withoutCurrent, { ...photo, season_tag: currentSeason, season_rank: photo.season_rank ?? nextRank }];
        });
        setMessage(nextSeason ? `Assigned photo to ${seasonLabel(nextSeason)}.` : "Cleared seasonal tag.");
      } catch (err) {
        const text = err instanceof Error ? err.message : "Failed to update season tag.";
        setError(text);
      } finally {
        setBusyPhotoId(null);
      }
    },
    [currentSeason]
  );

  const handleDeletePhoto = useCallback(
    async (photo: Photo) => {
      const ok = window.confirm("Delete this photo record? This cannot be undone.");
      if (!ok) return;

      setBusyPhotoId(photo.id);
      setError(null);
      setMessage(null);
      try {
        await deletePhoto(photo);
        setAllPhotos((prev) => prev.filter((item) => item.id !== photo.id));
        setTopPhotos((prev) => prev.filter((item) => item.id !== photo.id));
        setSeasonPhotos((prev) => prev.filter((item) => item.id !== photo.id));
        setMessage("Photo deleted.");
      } catch (err) {
        const text = err instanceof Error ? err.message : "Failed to delete photo.";
        setError(text);
      } finally {
        setBusyPhotoId(null);
      }
    },
    []
  );

  const handleSaveTopOrder = useCallback(async () => {
    setSavingTop(true);
    setError(null);
    setMessage(null);
    try {
      const updates = topPhotos.map((photo, index) => ({ id: photo.id, top_rank: index + 1 }));
      await saveTopOrder(updates);
      const rankMap = new Map(updates.map((item) => [item.id, item.top_rank]));
      setTopPhotos((prev) => prev.map((item) => ({ ...item, top_rank: rankMap.get(item.id) ?? item.top_rank ?? null })));
      setAllPhotos((prev) => prev.map((item) => ({ ...item, top_rank: rankMap.get(item.id) ?? item.top_rank ?? null })));
      setMessage("Top order saved.");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to save Top order.";
      setError(text);
    } finally {
      setSavingTop(false);
    }
  }, [topPhotos]);

  const handleSaveSeasonOrder = useCallback(async () => {
    setSavingSeason(true);
    setError(null);
    setMessage(null);
    try {
      const updates = seasonPhotos.map((photo, index) => ({ id: photo.id, season_rank: index + 1 }));
      await saveSeasonOrder(updates);
      const rankMap = new Map(updates.map((item) => [item.id, item.season_rank]));
      setSeasonPhotos((prev) => prev.map((item) => ({ ...item, season_rank: rankMap.get(item.id) ?? item.season_rank ?? null })));
      setAllPhotos((prev) => prev.map((item) => ({ ...item, season_rank: rankMap.get(item.id) ?? item.season_rank ?? null })));
      setMessage(`${seasonLabel(currentSeason)} order saved.`);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to save season order.";
      setError(text);
    } finally {
      setSavingSeason(false);
    }
  }, [currentSeason, seasonPhotos]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Gallery Manager</h1>
              <p className="mt-1 text-sm text-gray-600">Manage Top picks, {seasonLabel(currentSeason)} picks, and all photo flags.</p>
            </div>
            <div className="flex gap-2">
              <Link to="/admin/dashboard" className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Back to Dashboard
              </Link>
              <a href="/" className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Back to Site
              </a>
            </div>
          </div>

          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {message && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

          <section className="mb-6 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Top Picks Manager</h2>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">{`Top (${topCount}/${TOP_LIMIT})`}</span>
                <button
                  onClick={handleSaveTopOrder}
                  disabled={savingTop || topPhotos.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingTop ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Top Order
                </button>
              </div>
            </div>
            {loadingManagers ? (
              <div className="py-6 text-sm text-gray-500">Loading top picks...</div>
            ) : topPhotos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">No Top photos yet.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {topPhotos.map((photo, index) => (
                  <SortablePhotoCard
                    key={photo.id}
                    photo={photo}
                    index={index}
                    dndType={TOP_ITEM_TYPE}
                    onMove={moveTopPhoto}
                    action={
                      <button
                        onClick={() => handleToggleTop(photo)}
                        disabled={busyPhotoId === photo.id}
                        className="w-full rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        {busyPhotoId === photo.id ? "Working..." : "Remove from Top"}
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section className="mb-6 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{`${seasonLabel(currentSeason)} Manager`}</h2>
              <button
                onClick={handleSaveSeasonOrder}
                disabled={savingSeason || seasonPhotos.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingSeason ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Season Order
              </button>
            </div>
            {loadingManagers ? (
              <div className="py-6 text-sm text-gray-500">Loading season picks...</div>
            ) : seasonPhotos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                No {seasonLabel(currentSeason)} photos yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {seasonPhotos.map((photo, index) => (
                  <SortablePhotoCard
                    key={photo.id}
                    photo={photo}
                    index={index}
                    dndType={SEASON_ITEM_TYPE}
                    onMove={moveSeasonPhoto}
                    action={
                      <button
                        onClick={() => handleSeasonChange(photo, "")}
                        disabled={busyPhotoId === photo.id}
                        className="w-full rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {busyPhotoId === photo.id ? "Working..." : "Clear Season"}
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900">All Photos Browser</h2>
              <div className="flex items-center gap-2">
                <label htmlFor="browser-category" className="text-sm text-gray-600">
                  Category
                </label>
                <select
                  id="browser-category"
                  value={browserCategory}
                  onChange={(event) => setBrowserCategory(event.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingAllPhotos ? (
              <div className="py-6 text-sm text-gray-500">Loading photos...</div>
            ) : allPhotos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">No photos found.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                {allPhotos.map((photo) => {
                  const addingTopDisabled = !photo.is_top && topCount >= TOP_LIMIT;
                  const isBusy = busyPhotoId === photo.id;
                  return (
                    <div key={photo.id} className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                      <img src={photoSrc(photo)} alt={photo.category || "photo"} className="h-24 w-full rounded-md object-cover" loading="lazy" />
                      <div className="mt-2 space-y-2">
                        <button
                          onClick={() => handleToggleTop(photo)}
                          disabled={isBusy || addingTopDisabled || Boolean(photo.is_top)}
                          className={`w-full rounded-md px-2 py-1 text-xs ${
                            photo.is_top
                              ? "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                              : "border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {isBusy ? "Working..." : photo.is_top ? "Already Added to Top" : "Add to Top"}
                        </button>

                        <select
                          value={photo.season_tag ?? ""}
                          onChange={(event) => handleSeasonChange(photo, event.target.value)}
                          disabled={isBusy}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                        >
                          <option value="">No Season</option>
                          {SEASON_OPTIONS.map((season) => (
                            <option key={season} value={season}>
                              {seasonLabel(season)}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleDeletePhoto(photo)}
                          disabled={isBusy}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </DndProvider>
  );
};

export default AdminGalleryManager;
