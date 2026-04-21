import type { AdminContractDetail, AdminContractTemplateDefinition } from "../../../../utils";

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();
const PLACEHOLDER_PATTERN = /\bTBD\b|to be determined/i;
const SPECIAL_NOTES_PATTERN = /^special notes currently recorded\s*:/i;
const DEFAULT_PHOTOGRAPHER_SIGNATURE_NAME = "Ayodeji Adigun";
const DEFAULT_PHOTOGRAPHER_BUSINESS_NAME = "Shoot For Arts";

const toText = (value: unknown): string => {
  if (value == null) return "";
  if (Array.isArray(value))
    return value
      .map((item) => String(item))
      .filter(Boolean)
      .join(", ");
  return String(value).trim();
};

const toNumberText = (value: unknown) => {
  const text = toText(value);
  return text && !PLACEHOLDER_PATTERN.test(text) ? text : "";
};

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  const text = toText(value);
  return text ? [text] : [];
};

const hasText = (value: unknown) => {
  const text = normalizeWhitespace(toText(value));
  return Boolean(text) && !PLACEHOLDER_PATTERN.test(text);
};

const hasTrue = (value: unknown) => value === true;

const formatDate = (value: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
};

const formatDateTime = (value: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
};

const renderUnderlinedValue = (value: string) => `<span class="contract-underlined-value">${escapeHtml(value)}</span>`;

const renderParagraph = (value: string) => `<p>${escapeHtml(value)}</p>`;

const renderBullet = (value: string) => `<li>${escapeHtml(value)}</li>`;

const renderLabeledBullet = (label: string, value: string) => `<li><strong>${escapeHtml(label)}:</strong> ${renderUnderlinedValue(value)}</li>`;

const renderSection = (heading: string, innerHtml: string) => (innerHtml ? `<section><h2>${escapeHtml(heading)}</h2>${innerHtml}</section>` : "");

const renderBulletList = (items: string[]) => {
  const safeItems = items.map((item) => normalizeWhitespace(item)).filter(Boolean);
  if (!safeItems.length) return "";
  return `<ul>${safeItems.map(renderBullet).join("")}</ul>`;
};

const getPhotographerDisplayName = (contract: AdminContractDetail) =>
  toText(contract.photographerDisplayName) || DEFAULT_PHOTOGRAPHER_SIGNATURE_NAME;

const getPhotographerScriptName = (contract: AdminContractDetail) => {
  const displayName = getPhotographerDisplayName(contract);
  const raw =
    displayName ||
    toText(contract.photographerSignatureName) ||
    toText(contract.fieldValues.photographerSignatureName) ||
    DEFAULT_PHOTOGRAPHER_SIGNATURE_NAME;
  return raw.split(",")[0]?.trim() || DEFAULT_PHOTOGRAPHER_SIGNATURE_NAME;
};

const getDeliveryWindow = (contractType: AdminContractDetail["contractType"]) => {
  if (contractType === "portrait" || contractType === "portrait_branding") {
    return { min: 5, max: 10 };
  }

  return { min: 5, max: 14 };
};

const getContractHeading = (contract: AdminContractDetail, template: AdminContractTemplateDefinition | null) => {
  switch (contract.contractType) {
    case "event_conference":
    case "event":
      return "Photography Contract (Event Coverage)";
    case "portrait_branding":
    case "portrait":
      return "Photography Contract";
    default:
      return template?.label ?? contract.title;
  }
};

const getDetailHeading = (contractType: AdminContractDetail["contractType"]) => {
  switch (contractType) {
    case "event":
    case "event_conference":
      return "EVENT DETAILS";
    case "portrait":
    case "portrait_branding":
      return "SESSION DETAILS";
    default:
      return "DETAILS";
  }
};

const getDetailsItems = (contract: AdminContractDetail) => {
  const values = contract.fieldValues;

  if (contract.contractType === "event_conference") {
    const coverageDays = toNumberText(values.coverageDays);
    return [
      ["Event", toText(values.eventName)],
      ["Dates", toText(values.eventDates)],
      ["Location", toText(values.location)],
      ["Coverage", coverageDays ? `Multi-day event coverage across ${coverageDays} day(s)` : ""],
      ["Package", toText(values.packageName)],
    ].filter(([, value]) => hasText(value));
  }

  if (contract.contractType === "event") {
    const eventDate = toText(values.eventDate);
    const eventStart = toText(values.eventStartTime);
    const eventEnd = toText(values.eventEndTime);
    const when = [eventDate && formatDate(eventDate), eventStart, eventEnd && `to ${eventEnd}`].filter(Boolean).join(" ");

    return [
      ["Event", toText(values.eventName)],
      ["Date", when],
      ["Location", toText(values.location)],
      ["Coverage", toText(values.coverageHours)],
      ["Package", toText(values.packageName)],
    ].filter(([, value]) => hasText(value));
  }

  const addOns = toList(values.addOns).join(", ");
  const packageLine = [toText(values.packageName), addOns && `Add-ons: ${addOns}`].filter(Boolean).join(" | ");

  return [
    ["Session Type", toText(values.sessionType)],
    ["Date and Time", formatDateTime(toText(values.sessionDateTime))],
    ["Location", toText(values.location)],
    ["Session Length", toText(values.sessionLength)],
    ["Package and Add-ons", packageLine],
  ].filter(([, value]) => hasText(value));
};

const parseBodyTextToHtml = (value: string) => {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const blocks = normalized.split(/\n\s*\n/);

  return blocks
    .map((block) => {
      const normalizedBlock = normalizeWhitespace(block);
      if (SPECIAL_NOTES_PATTERN.test(normalizedBlock)) return "";

      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => Boolean(line) && !PLACEHOLDER_PATTERN.test(line) && !SPECIAL_NOTES_PATTERN.test(line));

      if (!lines.length) return "";

      const isBulletBlock = lines.every((line) => /^([-*•]|\d+\.)\s+/.test(line));
      if (isBulletBlock) {
        const items = lines
          .map((line) => line.replace(/^([-*•]|\d+\.)\s+/, ""))
          .map((line) => `<li>${escapeHtml(line)}</li>`)
          .join("");
        const ordered = lines.every((line) => /^\d+\.\s+/.test(line));
        return ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
      }

      return lines.map((line) => renderParagraph(line)).join("");
    })
    .join("");
};

const renderTermsSection = (contract: AdminContractDetail) => {
  if (contract.contractType === "event" || contract.contractType === "event_conference") {
    return renderSection(
      "TERMS",
      renderParagraph(
        "This agreement is between the Client and the Photographer (Shoot For Arts). It outlines the services, deliverables, and policies for event photography coverage.",
      ),
    );
  }

  return renderSection(
    "TERMS",
    renderParagraph(
      "This agreement is between the Client and the Photographer (Shoot For Arts). It outlines the services, deliverables, and policies for the photography session.",
    ),
  );
};

const renderDetailsSection = (contract: AdminContractDetail) => {
  const items = getDetailsItems(contract)
    .map(([label, value]) => renderLabeledBullet(label, value))
    .join("");
  return items ? renderSection(getDetailHeading(contract.contractType), `<ul>${items}</ul>`) : "";
};

const renderScopeSection = (contract: AdminContractDetail) => {
  const values = contract.fieldValues;
  const toggles = contract.toggleValues;

  if (contract.contractType === "event_conference") {
    const scopeItems = [
      "Photographer will provide comprehensive event coverage across all scheduled days.",
      "Coverage includes key sessions, speakers, networking, candid moments, and overall event highlights.",
      "Coverage is based on a single photographer capturing the event across locations and rooms.",
    ];
    const noteItems = [
      !hasTrue(toggles.simultaneousCoverageIncluded) ? "Simultaneous multi-room coverage is not guaranteed with a single photographer." : "",
      hasTrue(toggles.includeAdditionalPhotographerClause) || hasTrue(values.additionalPhotographerAvailable)
        ? "If full simultaneous coverage is required, an additional photographer can be arranged at an additional cost."
        : "",
    ].filter(Boolean);

    return renderSection(
      "SCOPE OF COVERAGE",
      `${renderBulletList(scopeItems)}${noteItems.length ? `${renderParagraph("Note:")}${renderBulletList(noteItems)}` : ""}`,
    );
  }

  if (contract.contractType === "event") {
    const coverageHours = toText(values.coverageHours);
    return renderSection(
      "SCOPE OF COVERAGE",
      renderBulletList(
        [
          coverageHours ? `Photographer will provide event coverage for approximately ${coverageHours}.` : "",
          "Coverage includes key moments, candid interactions, atmosphere, and major milestones from the event.",
          "Coverage is based on one photographer unless otherwise agreed in writing.",
        ].filter(Boolean),
      ),
    );
  }

  return renderSection(
    "CREATIVE DIRECTION",
    renderBulletList([
      "Photographer will provide posing guidance and direction throughout the session.",
      "Client may provide inspiration images and priorities before the session.",
      "Photographer will make best efforts to capture requested concepts but does not guarantee any specific pose, background, or shot if conditions or restrictions prevent it.",
    ]),
  );
};

const renderDeliverablesSection = (contract: AdminContractDetail) => {
  const values = contract.fieldValues;
  const toggles = contract.toggleValues;

  if (contract.contractType === "event" || contract.contractType === "event_conference") {
    return renderSection(
      "DELIVERABLES",
      renderBulletList(
        [
          "A curated gallery of professionally edited, high-resolution images.",
          "Web-optimized versions when applicable.",
          "Images will reflect the overall event experience rather than every individual or session.",
          hasTrue(toggles.includeProofGallery) ? "A proof gallery will be provided for review when included in the selected package." : "",
        ].filter(Boolean),
      ),
    );
  }

  const addOns = toList(values.addOns);
  return renderSection(
    "DELIVERABLES",
    renderBulletList(
      [
        "Photographer will capture and deliver the agreed number of professionally edited images as stated in the booking details.",
        "Images will be delivered in high resolution, plus web-optimized versions when applicable.",
        addOns.some((item) => /video|reel|highlight/i.test(item))
          ? "If a highlight reel add-on is included, Photographer will deliver the agreed reel optimized for social platforms."
          : "",
      ].filter(Boolean),
    ),
  );
};

const renderDeliveryTimelineSection = (contract: AdminContractDetail) => {
  const window = getDeliveryWindow(contract.contractType);
  const toggles = contract.toggleValues;

  if (contract.contractType === "event" || contract.contractType === "event_conference") {
    return renderSection(
      "DELIVERY TIMELINE",
      renderBulletList(
        [
          `Final gallery will be delivered within ${window.min}-${window.max} days after the final event day.`,
          "Delivery timeline may vary depending on total volume and event scale.",
          hasTrue(toggles.includeProofGallery) ? "If a proof gallery is included, proof delivery will occur before final delivery." : "",
        ].filter(Boolean),
      ),
    );
  }

  return renderSection(
    "PROOFS, SELECTIONS, AND DELIVERY",
    renderBulletList(
      [
        `Final edited images will be delivered within ${window.min}-${window.max} days after the session or after client selections if selections are required.`,
        hasTrue(toggles.includeProofGallery) ? "A proof gallery will be delivered after the session when included in the package." : "",
        hasTrue(toggles.includeSelectionsDeadline) ? "Client agrees to submit selections promptly so the delivery timeline can be maintained." : "",
      ].filter(Boolean),
    ),
  );
};

const renderCreativeApproachSection = (contract: AdminContractDetail) => {
  if (contract.contractType === "event" || contract.contractType === "event_conference") {
    return renderSection(
      "CREATIVE APPROACH",
      renderBulletList([
        "Photographer will document the event in a candid, documentary style while also capturing key moments and important individuals.",
        "Client may provide a priority list such as speakers, VIPs, specific sessions, or must-have moments.",
        "Photographer will make best efforts to capture requested moments but does not guarantee coverage of all individuals or sessions.",
      ]),
    );
  }

  return renderSection(
    "CREATIVE DIRECTION",
    renderBulletList([
      "Photographer will provide posing guidance and direction throughout the session.",
      "Client may provide inspiration images and priorities before the session.",
      "Photographer will make best efforts to capture requested concepts but does not guarantee any specific pose, background, or shot if conditions, restrictions, or time constraints prevent it.",
    ]),
  );
};

const renderPaymentTermsSection = (contract: AdminContractDetail) => {
  const values = contract.fieldValues;
  const fee = toText(values.totalFee);
  const currency = toText(values.currency);
  const retainer = toText(values.retainerPercent) || "50";
  const remaining = toText(values.remainingBalanceDue);
  const dueLine =
    remaining ||
    (contract.contractType === "event" || contract.contractType === "event_conference"
      ? "On or before the final day of coverage."
      : "On the session date prior to the start of photography.");

  return renderSection(
    "PAYMENT TERMS",
    `<ul>${[
      fee ? renderLabeledBullet("Total Fee", [fee, currency].filter(Boolean).join(" ")) : "",
      `<li><strong>Retainer:</strong> ${renderUnderlinedValue(`${retainer}%`)} is required to confirm booking.</li>`,
      renderLabeledBullet("Remaining Balance Due", dueLine),
      renderBullet("No final images will be delivered until payment is received in full."),
    ]
      .filter(Boolean)
      .join("")}</ul>`,
  );
};

const renderHoursAndCoverageSection = (contract: AdminContractDetail) => {
  const values = contract.fieldValues;
  if (contract.contractType !== "event" && contract.contractType !== "event_conference") return "";

  const estimatedCoverageHours = toText(values.estimatedCoverageHours);
  const coverageHours = toText(values.coverageHours);
  const mainRange = estimatedCoverageHours || coverageHours;

  return renderSection(
    "HOURS AND COVERAGE LIMITS",
    renderBulletList([
      mainRange
        ? `Pricing is based on a reasonable event schedule of approximately ${mainRange} total coverage.`
        : "Pricing is based on a reasonable event schedule across the agreed coverage period.",
      "If event hours significantly exceed the agreed range, additional coverage time may be billed or adjusted.",
      "Extended hours, schedule changes, or additional coverage requests may require an adjustment in scope or pricing.",
      "Photographer will prioritize coverage based on event flow, schedule, and key moments.",
    ]),
  );
};

const renderClientResponsibilitiesSection = (contract: AdminContractDetail) => {
  if (contract.contractType === "event" || contract.contractType === "event_conference") {
    return renderSection(
      "CLIENT RESPONSIBILITIES",
      `${renderParagraph("Client agrees to:")}${renderBulletList([
        "Provide event schedule in advance once available.",
        "Communicate priority sessions, speakers, and moments.",
        "Ensure Photographer has appropriate access to all required areas.",
      ])}`,
    );
  }

  return renderSection(
    "CLIENT RESPONSIBILITIES",
    `${renderParagraph("Client agrees to:")}${renderBulletList([
      "Arrive on time and prepared with outfits and any props they want included.",
      "Ensure clothing, accessories, and featured items are clean and presentation-ready.",
      "Communicate any must-have shots or priorities before or during the session.",
    ])}`,
  );
};

const renderLocationAccessSection = (contract: AdminContractDetail) => {
  const toggles = contract.toggleValues;

  if (contract.contractType === "event" || contract.contractType === "event_conference") {
    return renderSection(
      "ACCESS AND LOGISTICS",
      renderBulletList([
        "Client is responsible for securing any required permissions, credentials, or access passes.",
        "Photographer is not responsible for missed coverage due to restricted access or scheduling conflicts beyond their control.",
      ]),
    );
  }

  return renderSection(
    "LOCATION ACCESS AND RESTRICTIONS",
    renderBulletList(
      [
        "Some locations may have rules, restrictions, or security that limit photography.",
        hasTrue(toggles.includePermitResponsibilityClause)
          ? "Any permits, location fees, or permissions required for a specific location are the Client’s responsibility unless otherwise agreed in writing."
          : "",
        "If access is restricted or Photographer is asked to move, Photographer will pivot to a nearby alternative location and continue the session where possible.",
      ].filter(Boolean),
    ),
  );
};

const renderEditingSection = (contract: AdminContractDetail) => {
  const toggles = contract.toggleValues;
  return renderSection(
    contract.contractType === "portrait" || contract.contractType === "portrait_branding" ? "EDITING AND RETOUCHING" : "EDITING",
    renderBulletList(
      [
        "Images will be edited in Photographer’s consistent style.",
        "Basic color correction and light retouching are included.",
        hasTrue(toggles.includeRevisions) ? "One round of minor revisions is included when requested within a reasonable time after delivery." : "",
        "Advanced retouching or additional edits are not included unless agreed in writing.",
      ].filter(Boolean),
    ),
  );
};

const renderCopyrightUsageSection = (contract: AdminContractDetail) => {
  const toggles = contract.toggleValues;
  const portrait = contract.contractType === "portrait" || contract.contractType === "portrait_branding";
  return renderSection(
    "COPYRIGHT AND USAGE",
    [
      renderParagraph("Copyright"),
      renderBulletList(["Photographer retains full copyright of all images."]),
      renderParagraph("Client Usage License"),
      renderBulletList([
        portrait
          ? "Client is granted a non-transferable license to use the delivered images for personal branding, promotion, social media, websites, speaking materials, media kits, and related professional use."
          : "Client is granted a non-exclusive license to use images for promotional, marketing, social media, internal, and educational purposes.",
      ]),
      hasTrue(toggles.includeThirdPartyUsageRestriction)
        ? `${renderParagraph("Third-Party Use")}${renderBulletList([
            "Images may not be sold or licensed to third parties without Photographer’s written permission.",
          ])}`
        : "",
    ]
      .filter(Boolean)
      .join(""),
  );
};

const renderPortfolioPrivacySection = (contract: AdminContractDetail) => {
  const values = contract.fieldValues;
  const privacyRequested = hasTrue(values.portfolioOptOut);

  return renderSection(
    contract.contractType === "event" || contract.contractType === "event_conference" ? "PORTFOLIO USE" : "PORTFOLIO USE AND PRIVACY",
    renderBulletList([
      "Photographer may use images for portfolio, website, and promotional purposes.",
      privacyRequested
        ? "Client has requested privacy in writing prior to delivery or event coverage."
        : "Client may request privacy in writing prior to the session or event.",
    ]),
  );
};

const renderCancellationSection = (contract: AdminContractDetail) => {
  const portrait = contract.contractType === "portrait" || contract.contractType === "portrait_branding";
  const toggles = contract.toggleValues;
  return renderSection(
    portrait ? "CANCELLATION AND RESCHEDULING" : "CANCELLATION",
    [
      renderParagraph("Client Cancellation"),
      renderBulletList(["Retainer is non-refundable.", "Cancellation within 7 days may result in additional fees."]),
      portrait && hasTrue(toggles.includeWeatherClause)
        ? `${renderParagraph("Rescheduling and Weather")}${renderBulletList([
            "Outdoor sessions are subject to weather conditions and may be rescheduled if conditions are unsafe or materially affect the session.",
            "If weather conditions are unsafe, the retainer will be applied to a rescheduled date.",
          ])}`
        : "",
      renderParagraph("Photographer Cancellation"),
      renderBulletList(["In case of emergency, Photographer will reschedule or refund all payments received.", "Refund is the limit of liability."]),
    ]
      .filter(Boolean)
      .join(""),
  );
};

const renderLimitationSection = (contract: AdminContractDetail) =>
  renderSection(
    "LIMITATION OF LIABILITY",
    renderBulletList(
      contract.contractType === "event" || contract.contractType === "event_conference"
        ? [
            "Photographer is not responsible for missed moments due to scheduling conflicts, restricted access, or event conditions.",
            "In case of equipment failure or data loss, liability is limited to refund of payments received.",
          ]
        : [
            "Photographer is not responsible for factors beyond their control including weather changes, public interference, restricted access, or unforeseen conditions.",
            "In the rare event of data loss or equipment failure, liability is limited to refund of payments received for the affected portion of services.",
          ],
    ),
  );

const renderForceMajeureSection = () =>
  renderSection(
    "FORCE MAJEURE",
    renderParagraph(
      "Neither party is liable for failure to perform due to events beyond their control such as weather, emergencies, illness, venue closure, transportation disruption, or similar force majeure events. Both parties will work to reschedule where possible.",
    ),
  );

const renderEntireAgreementSection = () =>
  renderSection(
    "ENTIRE AGREEMENT",
    renderParagraph("This agreement represents the full understanding between both parties. Any changes must be agreed upon in writing."),
  );

const getAutoSignedDate = (contract: AdminContractDetail) => formatDate(contract.updatedAt ?? new Date().toISOString());

const renderSignatureSection = (contract: AdminContractDetail) => {
  const photographerName = getPhotographerScriptName(contract);
  const photographerDisplayName = getPhotographerDisplayName(contract);
  const photographerBusiness =
    toText(contract.photographerBusinessName) ||
    toText(contract.fieldValues.photographerName) ||
    DEFAULT_PHOTOGRAPHER_BUSINESS_NAME;
  const photographerPrintLine = [photographerDisplayName, photographerBusiness].filter(Boolean).join(", ");
  const clientName = toText(contract.fieldValues.clientSignatureName) || toText(contract.fieldValues.clientName) || "Client";
  const clientBusinessName = toText(contract.fieldValues.clientBusinessName);
  const clientPrintLine = [clientName, clientBusinessName].filter(Boolean).join(", ");
  const signedOn = getAutoSignedDate(contract);

  return [
    `<section class="contract-signatures-section" data-photographer-name="${escapeHtml(photographerName)}" data-photographer-business="${escapeHtml(photographerBusiness)}" data-client-name="${escapeHtml(clientName)}" data-signed-on="${escapeHtml(signedOn)}">`,
    `<h2>SIGNATURES</h2>`,
    `<div class="contract-signatures">`,
    `<div class="contract-signature-card">`,
    `<div class="contract-signature-script">${escapeHtml(photographerName)}</div>`,
    `<div class="contract-signature-line"></div>`,
    `<div class="contract-signature-print">${escapeHtml(photographerPrintLine)}</div>`,
    `<div class="contract-signature-date">Signed on ${escapeHtml(signedOn)}</div>`,
    `</div>`,
    `<div class="contract-signature-card">`,
    `<div class="contract-signature-script contract-signature-script--blank"></div>`,
    `<div class="contract-signature-line"></div>`,
    `<div class="contract-signature-print">${escapeHtml(clientPrintLine || clientName)}</div>`,
    `<div class="contract-signature-date contract-signature-date--blank">Signed on _____________</div>`,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join("");
};

const renderStructuredSection = (contract: AdminContractDetail, sectionKey: string) => {
  switch (sectionKey) {
    case "terms":
      return renderTermsSection(contract);
    case "details":
      return renderDetailsSection(contract);
    case "scope":
      return renderScopeSection(contract);
    case "deliverables":
      return renderDeliverablesSection(contract);
    case "delivery_timeline":
      return renderDeliveryTimelineSection(contract);
    case "creative_approach":
      return renderCreativeApproachSection(contract);
    case "payment_terms":
      return renderPaymentTermsSection(contract);
    case "hours_and_coverage_limits":
      return renderHoursAndCoverageSection(contract);
    case "client_responsibilities":
      return renderClientResponsibilitiesSection(contract);
    case "location_access":
    case "access_and_logistics":
      return renderLocationAccessSection(contract);
    case "editing":
      return renderEditingSection(contract);
    case "copyright_usage":
      return renderCopyrightUsageSection(contract);
    case "portfolio_privacy":
    case "portfolio_use":
      return renderPortfolioPrivacySection(contract);
    case "cancellation":
    case "cancellation_and_rescheduling":
      return renderCancellationSection(contract);
    case "limitation_of_liability":
      return renderLimitationSection(contract);
    case "force_majeure":
      return renderForceMajeureSection();
    case "entire_agreement":
      return renderEntireAgreementSection();
    case "signatures":
    case "signature":
    case "signature_block":
      return renderSignatureSection(contract);
    default:
      return "";
  }
};

const renderSectionHtml = (contract: AdminContractDetail) =>
  contract.sections
    .filter((section) => section.included)
    .map((section) => {
      const key = normalizeWhitespace(section.key).toLowerCase();
      const structured = renderStructuredSection(contract, key);
      if (structured) return structured;

      const bodyHtml = parseBodyTextToHtml(section.bodyText);
      if (!bodyHtml) return "";

      return renderSection(section.title.toUpperCase(), bodyHtml);
    })
    .filter(Boolean)
    .join("");

export const buildContractDocumentHtml = (contract: AdminContractDetail, template: AdminContractTemplateDefinition | null) => {
  const heading = getContractHeading(contract, template);
  const sectionsHtml = renderSectionHtml(contract);

  return [
    "<article>",
    `<h1>${escapeHtml(heading)}</h1>`,
    sectionsHtml || renderTermsSection(contract),
    !sectionsHtml.includes("contract-signatures-section") ? renderSignatureSection(contract) : "",
    "</article>",
  ].join("");
};
