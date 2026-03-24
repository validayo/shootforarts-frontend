import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const HASH_SCROLL_OFFSET_PX = 120;
const HASH_SCROLL_MAX_ATTEMPTS = 12;
const HASH_SCROLL_RETRY_MS = 80;

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace("#", "");
      let attempts = 0;
      let timeoutId: number | null = null;

      const scrollToHashTarget = () => {
        const element = document.getElementById(targetId);
        if (!element) return false;
        const top = window.scrollY + element.getBoundingClientRect().top - HASH_SCROLL_OFFSET_PX;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        return true;
      };

      if (!scrollToHashTarget()) {
        const retryScroll = () => {
          attempts += 1;
          if (scrollToHashTarget() || attempts >= HASH_SCROLL_MAX_ATTEMPTS) return;
          timeoutId = window.setTimeout(retryScroll, HASH_SCROLL_RETRY_MS);
        };

        timeoutId = window.setTimeout(retryScroll, HASH_SCROLL_RETRY_MS);
      }

      return () => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      };
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
