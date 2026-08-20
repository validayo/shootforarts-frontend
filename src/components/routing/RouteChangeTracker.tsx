import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../../lib/analytics/events";
import { getRouteRobotsContent, isInvoiceRoutePath, ROUTES } from "../../config/routes";
import { hasValidContactThankYouAccess } from "../../features/contact/utils/contactThankYouAccess";

const RouteChangeTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === ROUTES.public.contactThankYou && !hasValidContactThankYouAccess()) {
      return;
    }
    if (isInvoiceRoutePath(location.pathname)) {
      return;
    }
    const path = location.pathname + location.search;
    const title = document.title;
    trackPageView(path, title);
  }, [location.pathname, location.search]);

  useEffect(() => {
    let robotsTag = document.querySelector<HTMLMetaElement>("meta[name='robots']");
    if (!robotsTag) {
      robotsTag = document.createElement("meta");
      robotsTag.setAttribute("name", "robots");
      document.head.appendChild(robotsTag);
    }
    robotsTag.setAttribute("content", getRouteRobotsContent(location.pathname));
  }, [location.pathname]);

  return null;
};

export default RouteChangeTracker;
