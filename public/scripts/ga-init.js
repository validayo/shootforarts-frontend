(async function () {
  if (typeof window === "undefined") return;
  if (window.__SFA_GA_INIT__) return;
  window.__SFA_GA_INIT__ = true;

  function isValidMeasurementId(value) {
    return typeof value === "string" && /^G-[A-Z0-9]+$/i.test(value.trim());
  }

  function getFromWindow() {
    var raw = window.__SFA_GA_MEASUREMENT_ID__;
    return isValidMeasurementId(raw) ? raw.trim() : "";
  }

  function getFromMeta(doc) {
    var meta = doc.querySelector("meta[name='sfa-ga-measurement-id']");
    var content = meta && meta.getAttribute("content");
    return isValidMeasurementId(content) ? content.trim() : "";
  }

  async function getFromIndexHtml() {
    try {
      var response = await fetch("/index.html", { cache: "no-store" });
      if (!response.ok) return "";
      var html = await response.text();
      var match = html.match(/<meta\s+name=["']sfa-ga-measurement-id["']\s+content=["']([^"']+)["']/i);
      return match && isValidMeasurementId(match[1]) ? match[1].trim() : "";
    } catch {
      return "";
    }
  }

  var measurementId = getFromWindow() || getFromMeta(document) || (await getFromIndexHtml());
  if (!measurementId) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });
})();
