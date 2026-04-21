import React, { useLayoutEffect, useMemo, useRef, useState } from "react";

interface AdminContractPreviewProps {
  renderedHtml: string;
  loading?: boolean;
  onDownloadPdf?: () => void;
}

interface PreviewBlock {
  key: string;
  html: string;
}

const PAGE_HEIGHT_PX = 1120;
const PAGE_VERTICAL_PADDING_PX = 112;
const PAGE_CONTENT_HEIGHT_PX = PAGE_HEIGHT_PX - PAGE_VERTICAL_PADDING_PX;

const PREVIEW_PAGE_CLASSNAME =
  "contract-preview-page mx-auto min-h-[1120px] w-[820px] bg-white px-12 py-14 text-[16px] leading-8 text-stone-900 shadow-[0_24px_54px_rgba(17,24,39,0.18)]";

const PREVIEW_DOCUMENT_CLASSNAME = `
  [&_.signature]:mt-14
  [&_article]:text-stone-900
  [&_article]:leading-8
  [&_h1]:mb-14
  [&_h1]:mt-2
  [&_h1]:text-center
  [&_h1]:text-[1.9rem]
  [&_h1]:font-semibold
  [&_h1]:underline
  [&_h1]:underline-offset-[6px]
  [&_h1]:tracking-[-0.02em]
  [&_h2]:mb-4
  [&_h2]:mt-12
  [&_h2]:text-[1.08rem]
  [&_h2]:font-semibold
  [&_h2]:uppercase
  [&_h2]:tracking-[0.03em]
  [&_h3]:mb-3
  [&_h3]:mt-9
  [&_h3]:text-base
  [&_h3]:font-semibold
  [&_p]:my-0
  [&_p+P]:mt-4
  [&_ul]:my-4
  [&_ul]:list-disc
  [&_ul]:pl-8
  [&_ul]:marker:text-[0.9em]
  [&_ul]:marker:text-stone-900
  [&_ul>li]:mb-3
  [&_ul>li]:pl-2
  [&_ol]:my-4
  [&_ol]:list-decimal
  [&_ol]:pl-8
  [&_ol>li]:mb-3
  [&_ol>li]:pl-2
  [&_strong]:font-semibold
  [&_.contract-underlined-value]:underline
  [&_.contract-underlined-value]:underline-offset-[4px]
  [&_.contract-signatures]:mt-8
  [&_.contract-signatures]:grid
  [&_.contract-signatures]:gap-10
  [&_.contract-signatures]:pt-6
  [&_.contract-signatures]:md:grid-cols-2
  [&_.contract-signature-card]:min-h-[8rem]
  [&_.contract-signature-script]:mb-2
  [&_.contract-signature-script]:min-h-[2.75rem]
  [&_.contract-signature-script]:text-[1.35rem]
  [&_.contract-signature-script]:leading-none
  [&_.contract-signature-script]:text-stone-900
  [&_.contract-signature-script]:[font-family:'Brush_Script_MT','Segoe_Script','Lucida_Handwriting',cursive]
  [&_.contract-signature-script--blank]:text-transparent
  [&_.contract-signature-line]:border-b
  [&_.contract-signature-line]:border-stone-300
  [&_.contract-signature-print]:mt-2
  [&_.contract-signature-print]:text-sm
  [&_.contract-signature-print]:font-medium
  [&_.contract-signature-subprint]:text-sm
  [&_.contract-signature-subprint]:text-stone-700
  [&_.contract-signature-date]:mt-1
  [&_.contract-signature-date]:text-sm
  [&_.contract-signature-date]:text-stone-500
  [&_.contract-signature-date--blank]:tracking-[0.01em]
  [&_hr]:my-10
  [&_hr]:border-stone-300
`;

const parsePreviewBlocks = (renderedHtml: string): PreviewBlock[] => {
  if (!renderedHtml || typeof window === "undefined") return [];

  const parser = new DOMParser();
  const document = parser.parseFromString(renderedHtml, "text/html");
  const article = document.body.querySelector("article");
  if (!article) return [];

  return [
    {
      key: "logo",
      html: `
        <div class="contract-preview-logo-block mb-10">
          <img src="/branding/sfa-logo-legacy.png" alt="Shoot For Arts" class="h-24 w-auto object-contain" />
        </div>
      `,
    },
    ...Array.from(article.children).map((child, index) => ({
      key: `${child.tagName.toLowerCase()}-${index}`,
      html: child.outerHTML,
    })),
  ];
};

const buildPageGroups = (blocks: PreviewBlock[], measureRoot: HTMLDivElement | null) => {
  if (!blocks.length || !measureRoot) return blocks.length ? [blocks] : [];

  const measuredBlocks = Array.from(measureRoot.querySelectorAll<HTMLElement>("[data-preview-block]"));
  if (!measuredBlocks.length) return [blocks];

  const groups: PreviewBlock[][] = [];
  let currentGroup: PreviewBlock[] = [];
  let currentGroupStartTop = 0;

  measuredBlocks.forEach((node) => {
    const key = node.dataset.previewBlock;
    const block = blocks.find((item) => item.key === key);
    if (!block) return;

    const top = node.offsetTop;
    const bottom = top + node.offsetHeight;
    const groupHeight = bottom - currentGroupStartTop;

    if (currentGroup.length > 0 && groupHeight > PAGE_CONTENT_HEIGHT_PX) {
      groups.push(currentGroup);
      currentGroup = [block];
      currentGroupStartTop = top;
      return;
    }

    if (!currentGroup.length) {
      currentGroupStartTop = top;
    }

    currentGroup.push(block);
  });

  if (currentGroup.length) {
    groups.push(currentGroup);
  }

  return groups.length ? groups : [blocks];
};

const AdminContractPreview: React.FC<AdminContractPreviewProps> = ({ renderedHtml, loading = false, onDownloadPdf }) => {
  const blocks = useMemo(() => parsePreviewBlocks(renderedHtml), [renderedHtml]);
  const measureRootRef = useRef<HTMLDivElement | null>(null);
  const [pageGroups, setPageGroups] = useState<PreviewBlock[][]>(blocks.length ? [blocks] : []);

  useLayoutEffect(() => {
    if (!blocks.length) {
      setPageGroups([]);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setPageGroups(buildPageGroups(blocks, measureRootRef.current));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [blocks]);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-stone-300 bg-stone-200 shadow-[0_22px_60px_rgba(17,24,39,0.12)]">
      <div className="flex items-start justify-between gap-4 border-b border-stone-300 bg-stone-100 px-5 py-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Preview</h3>
          <p className="mt-1 text-sm text-stone-700">Read-only contract preview</p>
        </div>
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={!renderedHtml || loading}
          className="inline-flex shrink-0 rounded-xl border border-stone-400 bg-stone-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save as PDF
        </button>
      </div>

      <div className="h-[930px] overflow-auto overscroll-contain bg-stone-300/60 p-4 sm:h-[990px] sm:p-6 xl:h-[1010px]">
        {loading ? (
          <div className="mx-auto w-[820px] rounded-sm bg-white p-10 shadow-[0_18px_40px_rgba(17,24,39,0.16)]" aria-label="Contract preview loading">
            <div className="animate-pulse space-y-4">
              <div className="h-5 w-40 rounded bg-stone-200" />
              <div className="h-4 w-full rounded bg-stone-100" />
              <div className="h-4 w-5/6 rounded bg-stone-100" />
              <div className="h-4 w-3/4 rounded bg-stone-100" />
              <div className="pt-8">
                <div className="h-4 w-32 rounded bg-stone-200" />
                <div className="mt-3 h-4 w-2/3 rounded bg-stone-100" />
              </div>
            </div>
          </div>
        ) : renderedHtml ? (
          <>
            <div
              ref={measureRootRef}
              aria-hidden="true"
              className={`pointer-events-none fixed left-[-9999px] top-0 w-[820px] opacity-0 ${PREVIEW_PAGE_CLASSNAME} ${PREVIEW_DOCUMENT_CLASSNAME}`}
              style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: 2 }}
            >
              {blocks.map((block) => (
                <div key={block.key} data-preview-block={block.key} dangerouslySetInnerHTML={{ __html: block.html }} />
              ))}
            </div>

            <div aria-label="Contract preview" className="mx-auto w-[820px] space-y-6">
              {pageGroups.map((group, pageIndex) => (
                <div
                  key={`page-${pageIndex}`}
                  className={`${PREVIEW_PAGE_CLASSNAME} ${PREVIEW_DOCUMENT_CLASSNAME}`}
                  style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: 2 }}
                >
                  {group.map((block) => (
                    <div key={block.key} dangerouslySetInnerHTML={{ __html: block.html }} />
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mx-auto w-[820px] rounded-sm border border-dashed border-stone-400 bg-white px-6 py-10 text-sm text-stone-600 shadow-[0_18px_40px_rgba(17,24,39,0.12)]">
            Preview will appear here after a contract draft is loaded.
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminContractPreview;
