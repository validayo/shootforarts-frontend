import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import SEO from "../../components/seo/SEO";
import { trackPageNotFound } from "../../lib/analytics/events";

const NotFoundPage: React.FC = () => {
  useEffect(() => {
    trackPageNotFound(window.location.pathname);

    let robotsTag = document.querySelector<HTMLMetaElement>("meta[name='robots']");
    if (!robotsTag) {
      robotsTag = document.createElement("meta");
      robotsTag.setAttribute("name", "robots");
      document.head.appendChild(robotsTag);
    }
    const previous = robotsTag.getAttribute("content");
    robotsTag.setAttribute("content", "noindex,nofollow");

    return () => {
      robotsTag?.setAttribute("content", previous || "index,follow");
    };
  }, []);

  return (
    <div className="container-custom flex min-h-[70vh] flex-col items-center justify-center px-6 py-20 text-center">
      <SEO
        title="Page Not Found - Shoot For Arts"
        description="The page you requested could not be found."
        canonicalPath="/404"
      />
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent-dark">404</p>
      <h1 className="mt-3 text-4xl font-serif text-primary sm:text-5xl">Page not found</h1>
      <p className="mt-4 max-w-xl text-sm text-accent-dark sm:text-base">
        The link may be outdated or the page may have moved. Use one of the options below to continue.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          to="/"
          className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-secondary transition-colors hover:bg-accent-dark"
        >
          Back to Home
        </Link>
        <Link
          to="/contact"
          className="inline-flex min-w-[200px] items-center justify-center rounded-full border border-primary px-6 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-secondary"
        >
          Start Your Inquiry
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
