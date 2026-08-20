import { useEffect } from "react";

type SEOProps = {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalPath?: string | null; // path like "/about"
  privatePage?: boolean;
  robots?: string;
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

const removeMeta = (name: string, attr: "name" | "property" = "name") => {
  document.querySelectorAll<HTMLMetaElement>(`meta[${attr}='${name}']`).forEach((el) => el.remove());
};

const removeLink = (rel: string) => {
  document.querySelectorAll<HTMLLinkElement>(`link[rel='${rel}']`).forEach((el) => el.remove());
};

const removePublicSocialMeta = () => {
  ["og:title", "og:description", "og:site_name", "og:image", "og:url", "og:type"].forEach((name) => removeMeta(name, "property"));
  ["twitter:card", "twitter:title", "twitter:description", "twitter:image"].forEach((name) => removeMeta(name));
};

const SEO = ({ title, description, ogTitle, ogDescription, ogImage, canonicalPath, privatePage = false, robots }: SEOProps) => {
  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    if (robots) setMeta("robots", robots);

    if (privatePage) {
      removePublicSocialMeta();
      removeLink("canonical");
      return;
    }

    // Open Graph
    setMeta("og:title", ogTitle || title, "property");
    setMeta("og:description", ogDescription || description, "property");
    setMeta("og:site_name", "Shoot For Arts", "property");
    if (ogImage) setMeta("og:image", ogImage, "property");
    const url = `${window.location.origin}${canonicalPath || window.location.pathname}`;
    setMeta("og:url", url, "property");

    // Twitter basic
    setMeta("twitter:card", ogImage ? "summary_large_image" : "summary");
    setMeta("twitter:title", ogTitle || title);
    setMeta("twitter:description", ogDescription || description);
    if (ogImage) setMeta("twitter:image", ogImage);

    // Canonical link
    if (canonicalPath !== null) ensureLink("canonical", url);
  }, [title, description, ogTitle, ogDescription, ogImage, canonicalPath, privatePage, robots]);

  return null;
};

export default SEO;
