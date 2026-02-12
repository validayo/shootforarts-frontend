import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace("#", "");
      const scrollToHashTarget = () => {
        const element = document.getElementById(targetId);
        if (!element) return false;
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      };

      if (!scrollToHashTarget()) {
        requestAnimationFrame(() => {
          scrollToHashTarget();
        });
      }
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
