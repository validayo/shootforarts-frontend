const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildPrintableContractHtml = (title: string, renderedHtml: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page {
        size: letter;
        margin: 0.75in 0.7in 0.8in;
      }

      * {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #1c1917;
      }

      body {
        font-family: "Times New Roman", Times, serif;
        line-height: 2;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .contract-page {
        width: 100%;
        max-width: 6.8in;
        margin: 0 auto;
        font-size: 14px;
        line-height: 1.85;
      }

      .contract-logo {
        margin: 0 0 40px;
      }

      .contract-logo img {
        display: block;
        height: 96px;
        width: auto;
      }

      article {
        color: #1c1917;
      }

      h1 {
        margin: 8px 0 56px;
        text-align: center;
        font-size: 1.9rem;
        font-weight: 600;
        letter-spacing: -0.02em;
        text-decoration: underline;
        text-underline-offset: 6px;
      }

      h2 {
        margin: 48px 0 16px;
        font-size: 1.08rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      h3 {
        margin: 36px 0 12px;
        font-size: 1rem;
        font-weight: 700;
      }

      p {
        margin: 0;
      }

      p + p {
        margin-top: 16px;
      }

      ul,
      ol {
        margin: 16px 0;
        padding-left: 32px;
      }

      ul {
        list-style: disc;
      }

      ol {
        list-style: decimal;
      }

      li {
        margin-bottom: 12px;
        padding-left: 12px;
      }

      li::marker {
        font-size: 0.9em;
      }

      strong {
        font-weight: 700;
      }

      .contract-underlined-value {
        text-decoration: underline;
        text-underline-offset: 4px;
      }

      .contract-signatures {
        margin-top: 32px;
        padding-top: 24px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 40px;
      }

      .contract-signature-card {
        min-height: 8rem;
      }

      .contract-signature-script {
        margin-bottom: 8px;
        min-height: 2.75rem;
        font-family: "Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive;
        font-size: 1.35rem;
        line-height: 1;
        color: #1c1917;
      }

      .contract-signature-script--blank {
        color: transparent;
      }

      .contract-signature-line {
        border-bottom: 1px solid #d6d3d1;
      }

      .contract-signature-print {
        margin-top: 8px;
        font-size: 0.95rem;
        font-weight: 600;
      }

      .contract-signature-subprint {
        font-size: 0.95rem;
        color: #44403c;
      }

      .contract-signature-date {
        margin-top: 4px;
        font-size: 0.92rem;
        color: #78716c;
      }

      .contract-signature-date--blank {
        letter-spacing: 0.01em;
      }

      @media screen {
        body {
          padding: 24px 16px;
          background: #d6d3d1;
        }

        .contract-page {
          background: #ffffff;
          box-shadow: 0 24px 54px rgba(17, 24, 39, 0.18);
          padding: 48px 56px 56px;
        }
      }

      @media print {
        body {
          padding: 0;
          background: #ffffff;
        }

        .contract-page {
          max-width: none;
          box-shadow: none;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="contract-page">
      <div class="contract-logo">
        <img src="${window.location.origin}/branding/sfa-logo-legacy.png" alt="Shoot For Arts" />
      </div>
      ${renderedHtml}
    </div>
  </body>
</html>`;

const waitForFrameAssets = (frameWindow: Window, timeoutMs = 1500) =>
  new Promise<void>((resolve) => {
    const doc = frameWindow.document;
    const images = Array.from(doc.images);
    if (!images.length) {
      window.setTimeout(resolve, 100);
      return;
    }

    let resolved = false;
    let remaining = images.filter((image) => !image.complete).length;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };

    if (remaining === 0) {
      window.setTimeout(finish, 100);
      return;
    }

    const handleDone = () => {
      remaining -= 1;
      if (remaining <= 0) finish();
    };

    images.forEach((image) => {
      if (image.complete) return;
      image.addEventListener("load", handleDone, { once: true });
      image.addEventListener("error", handleDone, { once: true });
    });

    window.setTimeout(finish, timeoutMs);
  });

export const downloadContractPdf = async (title: string, renderedHtml: string) => {
  const printableHtml = buildPrintableContractHtml(title, renderedHtml);
  const blob = new Blob([printableHtml], { type: "text/html;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";

  const cleanup = () => {
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      iframe.remove();
    }, 1000);
  };

  iframe.onload = async () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      return;
    }

    await waitForFrameAssets(frameWindow);
    frameWindow.focus();
    frameWindow.print();
    cleanup();
  };

  iframe.src = objectUrl;
  document.body.appendChild(iframe);
};
