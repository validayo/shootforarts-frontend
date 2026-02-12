(function () {
  if (typeof window === "undefined") return;
  if (window.__SFA_GA_INIT__) return;
  window.__SFA_GA_INIT__ = true;

  var measurementId = "G-2WZ8G4PZ88";
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
