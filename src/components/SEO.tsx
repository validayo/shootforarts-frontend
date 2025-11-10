import { useEffect } from "react";

type SEOProps = {
  title: string;
  description: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalPath?: string; // path like "/about"
};

const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}='${name}']`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const ensureLink = (rel: string, href: string) => {
  let el = document.querySelector<HTMLLinkElement>(`link[rel='${rel}']`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const SEO = ({ title, description, keywords, ogTitle, ogDescription, ogImage, canonicalPath }: SEOProps) => {
  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    if (keywords?.length) setMeta("keywords", keywords.join(", "));

    // Open Graph
    setMeta("og:title", ogTitle || title, "property");
    setMeta("og:description", ogDescription || description, "property");
    if (ogImage) setMeta("og:image", ogImage, "property");
    const url = `${window.location.origin}${canonicalPath || window.location.pathname}`;
    setMeta("og:url", url, "property");

    // Twitter basic
    setMeta("twitter:card", ogImage ? "summary_large_image" : "summary");
    setMeta("twitter:title", ogTitle || title);
    setMeta("twitter:description", ogDescription || description);
    if (ogImage) setMeta("twitter:image", ogImage);

    // Canonical link
    ensureLink("canonical", url);
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, canonicalPath]);

  return null;
};

export default SEO;

