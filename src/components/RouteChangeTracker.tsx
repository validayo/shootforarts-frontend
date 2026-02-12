import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../lib/analytics";

const RouteChangeTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname + location.search;
    const title = document.title;
    trackPageView(path, title);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const isAdminRoute = location.pathname.startsWith("/admin");
    let robotsTag = document.querySelector<HTMLMetaElement>("meta[name='robots']");
    if (!robotsTag) {
      robotsTag = document.createElement("meta");
      robotsTag.setAttribute("name", "robots");
      document.head.appendChild(robotsTag);
    }
    robotsTag.setAttribute("content", isAdminRoute ? "noindex,nofollow" : "index,follow");
  }, [location.pathname]);

  return null;
};

export default RouteChangeTracker;
