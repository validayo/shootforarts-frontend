import React, { useEffect, useMemo, useRef, useState } from "react";

import { ExternalLink, ImagePlus, Loader2, MessageSquarePlus, RefreshCcw, Sparkles, X } from "lucide-react";

import { askAdminAssistant, getContactSubmissions, uploadAdminAssistantAttachment } from "../../../../lib/api/services";
import { logAdminAction, logAdminError, logAdminWarning } from "../../../../lib/observability/logger";
import type {
  AdminGeneralAssistantAttachment,
  AdminGeneralAssistantInquiryReference,
  AdminGeneralAssistantLocationSuggestion,
  AdminGeneralAssistantPermitLikelihood,
  AdminGeneralAssistantQuickShootPracticality,
  AdminGeneralAssistantResponse,
  AdminGeneralAssistantSource,
  AdminGeneralAssistantTaskType,
  AdminGeneralAssistantTurn,
  Contact,
} from "../../../../utils";

const SESSION_STORAGE_PREFIX = "sfa_admin_general_assistant_session_v1";
const SELECTION_STORAGE_KEY = "sfa_admin_general_assistant_selection_v1";
const TASK_STORAGE_KEY = "sfa_admin_general_assistant_task_v1";
const RESEARCH_STORAGE_KEY = "sfa_admin_general_assistant_research_v1";
const MAX_RECENT_TURNS = 6;
const MAX_REQUEST_RECENT_TURNS_WITH_ATTACHMENTS_OR_RESEARCH = 4;
const MAX_REQUEST_RECENT_TURN_CHARS = 6000;
const MAX_REQUEST_RECENT_TURN_CHARS_WITH_ATTACHMENTS_OR_RESEARCH = 4000;
const MAX_IMAGE_ATTACHMENTS = 3;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const RESEARCH_ENABLED_TASK_TYPES = new Set<AdminGeneralAssistantTaskType>([
  "location_ideas",
  "shoot_planning",
  "timing_lighting_weather",
]);

const PERMIT_LIKELIHOOD_META: Record<
  AdminGeneralAssistantPermitLikelihood,
  { label: string; className: string }
> = {
  low: {
    label: "Permit low",
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
  unclear: {
    label: "Permit unclear",
    className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  likely: {
    label: "Permit likely",
    className: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  },
};

const QUICK_SHOOT_META: Record<
  AdminGeneralAssistantQuickShootPracticality,
  { label: string; className: string }
> = {
  easy: {
    label: "Easy for quick shoot",
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
  possible_with_care: {
    label: "Possible with care",
    className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  poor_fit: {
    label: "Poor fit for quick shoot",
    className: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  },
};

type ComposerAttachmentStatus = "uploading" | "uploaded" | "error";

type ComposerAttachment = AdminGeneralAssistantAttachment & {
  localId: string;
  expiresAt: string | null;
  previewUrl: string | null;
  uploadStatus: ComposerAttachmentStatus;
  error: string | null;
};

const taskOptions: Array<{
  taskType: AdminGeneralAssistantTaskType;
  label: string;
  placeholder: string;
}> = [
  {
    taskType: "pricing_help",
    label: "Pricing Help",
    placeholder: "Help me think through pricing direction for this kind of shoot.",
  },
  {
    taskType: "wording_help",
    label: "Wording Help",
    placeholder: "Help me word this in a way that feels warm, clear, and professional.",
  },
  {
    taskType: "shoot_planning",
    label: "Shoot Planning",
    placeholder: "Help me think through the planning details for this shoot.",
  },
  {
    taskType: "location_ideas",
    label: "Location Ideas",
    placeholder: "What kinds of Toronto locations would fit this concept?",
  },
  {
    taskType: "timing_lighting_weather",
    label: "Timing / Light / Weather",
    placeholder: "What timing, lighting, and weather considerations should I think about?",
  },
  {
    taskType: "general_internal_support",
    label: "General Support",
    placeholder: "Help me think this through from a creative and business perspective.",
  },
];

const taskLabelByType = taskOptions.reduce<Record<AdminGeneralAssistantTaskType, string>>((acc, option) => {
  acc[option.taskType] = option.label;
  return acc;
}, {
  pricing_help: "Pricing Help",
  wording_help: "Wording Help",
  shoot_planning: "Shoot Planning",
  location_ideas: "Location Ideas",
  timing_lighting_weather: "Timing / Light / Weather",
  general_internal_support: "General Support",
});

const getStorageKey = (contactSubmissionId?: string | null) =>
  contactSubmissionId ? `${SESSION_STORAGE_PREFIX}:${contactSubmissionId}` : `${SESSION_STORAGE_PREFIX}:general`;

const trimTurns = (turns: AdminGeneralAssistantTurn[]) => turns.slice(-MAX_RECENT_TURNS);

const buildRequestRecentTurns = (
  turns: AdminGeneralAssistantTurn[],
  options: { maxTurns: number; maxChars: number },
) => {
  const candidates = turns.slice(-options.maxTurns);
  if (candidates.length === 0) return [];

  const selected: AdminGeneralAssistantTurn[] = [];
  let totalChars = 0;

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const turn = candidates[index];
    const turnChars = turn.content.length;

    if (selected.length === 0) {
      selected.push(turn);
      totalChars += turnChars;
      continue;
    }

    if (totalChars + turnChars > options.maxChars) {
      break;
    }

    selected.push(turn);
    totalChars += turnChars;
  }

  return selected.reverse();
};

const formatDateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
    : null;

const formatBytes = (value: number) => {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${value} B`;
};

const INLINE_MARKDOWN_PATTERN = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;

const renderInlineMarkdown = (text: string) => {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;
  INLINE_MARKDOWN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = INLINE_MARKDOWN_PATTERN.exec(text);

  while (match) {
    const fullMatch = match[0];
    const matchStart = match.index ?? 0;
    if (matchStart > lastIndex) {
      nodes.push(text.slice(lastIndex, matchStart));
    }

    if (match[2]) {
      nodes.push(<strong key={`bold-${matchIndex}`}>{match[2]}</strong>);
    } else if (match[3] && match[4]) {
      nodes.push(
        <a
          key={`link-${matchIndex}`}
          href={match[4]}
          target="_blank"
          rel="noreferrer"
          className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
        >
          {match[3]}
        </a>,
      );
    } else {
      nodes.push(fullMatch);
    }

    lastIndex = matchStart + fullMatch.length;
    matchIndex += 1;
    match = INLINE_MARKDOWN_PATTERN.exec(text);
  }
  INLINE_MARKDOWN_PATTERN.lastIndex = 0;

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};

const RichAssistantText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="space-y-1 pl-5 text-sm text-gray-800 list-disc">
        {listItems.map((item, index) => (
          <li key={`item-${index}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push(
      <p key={`paragraph-${blocks.length}`} className="whitespace-pre-wrap break-words text-sm text-gray-800">
        {renderInlineMarkdown(paragraphLines.join(" "))}
      </p>,
    );
    paragraphLines = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushParagraph();
      return;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      listItems.push(bulletMatch[1]);
      return;
    }

    flushList();
    paragraphLines.push(trimmed);
  });

  flushList();
  flushParagraph();

  if (blocks.length === 0) {
    return <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{text}</p>;
  }

  return <div className="space-y-3">{blocks}</div>;
};

const CompactList: React.FC<{
  title: string;
  items: string[];
  itemClassName: string;
}> = ({ title, items, itemClassName }) => {
  if (items.length === 0) return null;

  return (
    <div className="mt-3">
      <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">{title}</h4>
      <ul className="mt-2 space-y-1.5 text-xs text-gray-700">
        {items.map((item) => (
          <li key={`${title}-${item}`} className={`rounded-lg px-2.5 py-1.5 ${itemClassName}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

const makeLocalAttachmentId = () =>
  `assistant-attachment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const sanitizeAttachment = (value: unknown): AdminGeneralAssistantAttachment | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  return (
      typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.mimeType === "string" &&
      typeof candidate.sizeBytes === "number"
    )
    ? {
      id: candidate.id,
      name: candidate.name,
      mimeType: candidate.mimeType,
      sizeBytes: candidate.sizeBytes,
    }
    : null;
};

const sanitizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()));
  return items.length > 0 ? items : undefined;
};

const getRequestErrorMessage = (error: unknown, fallback: string) => {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  return message || fallback;
};

const sanitizeSource = (value: unknown): AdminGeneralAssistantSource | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.url !== "string" ||
    typeof candidate.domain !== "string" ||
    typeof candidate.sourceType !== "string" ||
    typeof candidate.whyRelevant !== "string"
  ) {
    return null;
  }
  return {
    id: candidate.id,
    title: candidate.title,
    url: candidate.url,
    domain: candidate.domain,
    sourceType: candidate.sourceType as AdminGeneralAssistantSource["sourceType"],
    whyRelevant: candidate.whyRelevant,
  };
};

const sanitizeLocationSuggestion = (value: unknown): AdminGeneralAssistantLocationSuggestion | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.label !== "string" ||
    typeof candidate.whyFit !== "string" ||
    !Array.isArray(candidate.cautions)
  ) {
    return null;
  }
  return {
    label: candidate.label,
    area: typeof candidate.area === "string" ? candidate.area : null,
    whyFit: candidate.whyFit,
    bestUseWindow: typeof candidate.bestUseWindow === "string" ? candidate.bestUseWindow : null,
    cautions: candidate.cautions.filter((entry): entry is string => typeof entry === "string"),
    bestShootWindows: sanitizeStringArray(candidate.bestShootWindows),
    locationFeatures: sanitizeStringArray(candidate.locationFeatures),
    permitLikelihood:
      candidate.permitLikelihood === "low" ||
      candidate.permitLikelihood === "unclear" ||
      candidate.permitLikelihood === "likely"
        ? candidate.permitLikelihood
        : undefined,
    permitBasis: typeof candidate.permitBasis === "string" ? candidate.permitBasis : null,
    permitSourceRef: typeof candidate.permitSourceRef === "string" ? candidate.permitSourceRef : null,
    quickShootPracticality:
      candidate.quickShootPracticality === "easy" ||
      candidate.quickShootPracticality === "possible_with_care" ||
      candidate.quickShootPracticality === "poor_fit"
        ? candidate.quickShootPracticality
        : undefined,
    accessCautions: sanitizeStringArray(candidate.accessCautions),
    frictionNotes: sanitizeStringArray(candidate.frictionNotes),
    sourceRefs: Array.isArray(candidate.sourceRefs)
      ? candidate.sourceRefs.filter((entry): entry is string => typeof entry === "string")
      : [],
    sourceUrls: Array.isArray(candidate.sourceUrls)
      ? candidate.sourceUrls.filter((entry): entry is string => typeof entry === "string")
      : undefined,
  };
};

const sanitizeStoredTurn = (value: unknown): AdminGeneralAssistantTurn | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    (candidate.role !== "admin" && candidate.role !== "assistant") ||
    typeof candidate.content !== "string" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.taskType !== "string"
  ) {
    return null;
  }

  return {
    role: candidate.role as "admin" | "assistant",
    content: candidate.content,
    taskType: candidate.taskType as AdminGeneralAssistantTaskType,
    createdAt: candidate.createdAt,
    enableResearch: candidate.enableResearch === true,
    attachments: Array.isArray(candidate.attachments)
      ? candidate.attachments.map(sanitizeAttachment).filter(Boolean) as AdminGeneralAssistantAttachment[]
      : undefined,
    answer: typeof candidate.answer === "string" ? candidate.answer : undefined,
    imageObservations: sanitizeStringArray(candidate.imageObservations),
    locationSuggestions: Array.isArray(candidate.locationSuggestions)
      ? candidate.locationSuggestions.map(sanitizeLocationSuggestion).filter(Boolean) as AdminGeneralAssistantLocationSuggestion[]
      : undefined,
    sources: Array.isArray(candidate.sources)
      ? candidate.sources.map(sanitizeSource).filter(Boolean) as AdminGeneralAssistantSource[]
      : undefined,
    suggestedNextSteps: sanitizeStringArray(candidate.suggestedNextSteps),
    suggestedQuestions: sanitizeStringArray(candidate.suggestedQuestions),
    cautions: sanitizeStringArray(candidate.cautions),
    referencedCatalogSlugs: sanitizeStringArray(candidate.referencedCatalogSlugs),
  };
};

const normalizeAssistantTurn = (
  response: AdminGeneralAssistantResponse,
  createdAt: string,
): AdminGeneralAssistantTurn => ({
  role: "assistant",
  content: response.answer,
  answer: response.answer,
  taskType: response.taskType,
  createdAt,
  imageObservations: response.imageObservations,
  locationSuggestions: response.locationSuggestions,
  sources: response.sources,
  suggestedNextSteps: response.suggestedNextSteps,
  suggestedQuestions: response.suggestedQuestions,
  cautions: response.cautions,
  referencedCatalogSlugs: response.referencedCatalogSlugs,
});

const revokePreview = (previewUrl: string | null) => {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }
};

const AdminAssistant: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedTaskType, setSelectedTaskType] = useState<AdminGeneralAssistantTaskType>("general_internal_support");
  const [enableResearch, setEnableResearch] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [recentTurns, setRecentTurns] = useState<AdminGeneralAssistantTurn[]>([]);
  const [composingAttachments, setComposingAttachments] = useState<ComposerAttachment[]>([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentsRef = useRef<ComposerAttachment[]>([]);

  useEffect(() => {
    attachmentsRef.current = composingAttachments;
  }, [composingAttachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((attachment) => revokePreview(attachment.previewUrl));
    };
  }, []);

  useEffect(() => {
    try {
      const storedSelection = window.localStorage.getItem(SELECTION_STORAGE_KEY);
      if (storedSelection) {
        setSelectedContactId(storedSelection);
      }

      const storedTask = window.localStorage.getItem(TASK_STORAGE_KEY);
      if (storedTask && taskOptions.some((option) => option.taskType === storedTask)) {
        setSelectedTaskType(storedTask as AdminGeneralAssistantTaskType);
      }

      const storedResearch = window.localStorage.getItem(RESEARCH_STORAGE_KEY);
      if (storedResearch === "true") {
        setEnableResearch(true);
      }
    } catch (storageError) {
      logAdminWarning("admin_assistant.preferences_restore_failed", { reason: String(storageError) });
    }
  }, []);

  useEffect(() => {
    try {
      if (selectedContactId) {
        window.localStorage.setItem(SELECTION_STORAGE_KEY, selectedContactId);
      } else {
        window.localStorage.removeItem(SELECTION_STORAGE_KEY);
      }
    } catch (storageError) {
      logAdminWarning("admin_assistant.selection_persist_failed", { reason: String(storageError) });
    }
  }, [selectedContactId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TASK_STORAGE_KEY, selectedTaskType);
    } catch (storageError) {
      logAdminWarning("admin_assistant.task_persist_failed", { reason: String(storageError) });
    }
  }, [selectedTaskType]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RESEARCH_STORAGE_KEY, String(enableResearch));
    } catch (storageError) {
      logAdminWarning("admin_assistant.research_persist_failed", { reason: String(storageError) });
    }
  }, [enableResearch]);

  useEffect(() => {
    let cancelled = false;

    const hydrateContacts = async () => {
      setContactsLoading(true);
      try {
        const rows = await getContactSubmissions();
        if (!cancelled) {
          setContacts(rows);
        }
      } catch (fetchError) {
        if (!cancelled) {
          logAdminWarning("admin_assistant.contacts_load_failed", { reason: String(fetchError) });
        }
      } finally {
        if (!cancelled) {
          setContactsLoading(false);
        }
      }
    };

    void hydrateContacts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(getStorageKey(selectedContactId || null));
      if (!raw) {
        setRecentTurns([]);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        setRecentTurns([]);
        return;
      }
      const sanitized = parsed.map(sanitizeStoredTurn).filter(Boolean) as AdminGeneralAssistantTurn[];
      setRecentTurns(trimTurns(sanitized));
    } catch (storageError) {
      setRecentTurns([]);
      logAdminWarning("admin_assistant.session_restore_failed", {
        contactSubmissionId: selectedContactId || null,
        reason: String(storageError),
      });
    }
  }, [selectedContactId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(getStorageKey(selectedContactId || null), JSON.stringify(trimTurns(recentTurns)));
    } catch (storageError) {
      logAdminWarning("admin_assistant.session_persist_failed", {
        contactSubmissionId: selectedContactId || null,
        reason: String(storageError),
      });
    }
  }, [recentTurns, selectedContactId]);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );

  const inquiryReference = useMemo<AdminGeneralAssistantInquiryReference | null>(() => {
    if (!selectedContactId || !selectedContact) return null;
    return {
      contactSubmissionId: selectedContactId,
    };
  }, [selectedContact, selectedContactId]);

  const activePlaceholder =
    taskOptions.find((option) => option.taskType === selectedTaskType)?.placeholder ??
    "Ask for help with pricing, wording, planning, or creative direction.";

  const researchSupported = RESEARCH_ENABLED_TASK_TYPES.has(selectedTaskType);
  const activeComposerAttachmentCount = composingAttachments.filter((attachment) => attachment.uploadStatus !== "error").length;
  const hasUploadingAttachments = composingAttachments.some((attachment) => attachment.uploadStatus === "uploading");
  const canSubmit = Boolean(prompt.trim()) && !asking && !hasUploadingAttachments;

  const clearComposerAttachments = () => {
    setComposingAttachments((prev) => {
      prev.forEach((attachment) => revokePreview(attachment.previewUrl));
      return [];
    });
  };

  const removeAttachment = (localId: string) => {
    setComposingAttachments((prev) => {
      const target = prev.find((attachment) => attachment.localId === localId);
      if (target) {
        revokePreview(target.previewUrl);
      }
      return prev.filter((attachment) => attachment.localId !== localId);
    });
  };

  const uploadSingleAttachment = async (
    file: File,
    localId: string,
    linkedContactId: string | null,
  ) => {
    try {
      const response = await uploadAdminAssistantAttachment(file, linkedContactId);
      setComposingAttachments((prev) =>
        prev.map((attachment) =>
          attachment.localId === localId
            ? {
              ...attachment,
              id: response.attachment.id,
              mimeType: response.attachment.mimeType,
              sizeBytes: response.attachment.sizeBytes,
              expiresAt: response.attachment.expiresAt,
              uploadStatus: "uploaded",
              error: null,
            }
            : attachment
        )
      );
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Upload failed";
      setComposingAttachments((prev) =>
        prev.map((attachment) =>
          attachment.localId === localId
            ? {
              ...attachment,
              uploadStatus: "error",
              error: message,
            }
            : attachment
        )
      );
      logAdminError("admin_assistant.attachment_upload_failed", {
        contactSubmissionId: linkedContactId,
        reason: message,
      });
    }
  };

  const addComposerFiles = (files: File[]) => {
    if (files.length === 0) return;

    setError(null);

    let activeCount = composingAttachments.filter((attachment) => attachment.uploadStatus !== "error").length;
    let activeBytes = composingAttachments
      .filter((attachment) => attachment.uploadStatus !== "error")
      .reduce((total, attachment) => total + attachment.sizeBytes, 0);

    const nextAttachments: ComposerAttachment[] = [];
    const uploads: Array<{ file: File; localId: string }> = [];

    for (const file of files) {
      const localId = makeLocalAttachmentId();

      if (activeCount >= MAX_IMAGE_ATTACHMENTS) {
        nextAttachments.push({
          localId,
          id: localId,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          previewUrl: null,
          expiresAt: null,
          uploadStatus: "error",
          error: `You can attach up to ${MAX_IMAGE_ATTACHMENTS} images per turn.`,
        });
        continue;
      }

      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        nextAttachments.push({
          localId,
          id: localId,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          previewUrl: null,
          expiresAt: null,
          uploadStatus: "error",
          error: "Only JPEG, PNG, and WEBP images are supported.",
        });
        continue;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        nextAttachments.push({
          localId,
          id: localId,
          name: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          previewUrl: null,
          expiresAt: null,
          uploadStatus: "error",
          error: "Image must be 4 MB or smaller.",
        });
        continue;
      }

      if (activeBytes + file.size > MAX_TOTAL_IMAGE_BYTES) {
        nextAttachments.push({
          localId,
          id: localId,
          name: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          previewUrl: null,
          expiresAt: null,
          uploadStatus: "error",
          error: "Image selection exceeds the 8 MB total limit.",
        });
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      nextAttachments.push({
        localId,
        id: localId,
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        previewUrl,
        expiresAt: null,
        uploadStatus: "uploading",
        error: null,
      });
      uploads.push({ file, localId });
      activeCount += 1;
      activeBytes += file.size;
    }

    setComposingAttachments((prev) => [...prev, ...nextAttachments]);

    uploads.forEach(({ file, localId }) => {
      void uploadSingleAttachment(file, localId, selectedContactId || null);
    });
  };

  const handleAttachmentSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    addComposerFiles(files);
  };

  const handlePromptPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    event.preventDefault();
    addComposerFiles(files);
  };

  const handleComposerDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const files = Array.from(event.dataTransfer.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    addComposerFiles(files);
  };

  const handleSubmit = async () => {
    const message = prompt.trim();
    if (!message || asking || hasUploadingAttachments) return;

    const attachedImages = composingAttachments
      .filter((attachment) => attachment.uploadStatus === "uploaded")
      .map<AdminGeneralAssistantAttachment>((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      }));

    const nextAdminTurn: AdminGeneralAssistantTurn = {
      role: "admin",
      content: message,
      taskType: selectedTaskType,
      createdAt: new Date().toISOString(),
      enableResearch: researchSupported ? enableResearch : false,
      attachments: attachedImages.length > 0 ? attachedImages : undefined,
    };
    const requestUsesScopedBudget = attachedImages.length > 0 || (researchSupported && enableResearch);
    const requestRecentTurns = buildRequestRecentTurns(recentTurns, {
      maxTurns: requestUsesScopedBudget ? MAX_REQUEST_RECENT_TURNS_WITH_ATTACHMENTS_OR_RESEARCH : MAX_RECENT_TURNS,
      maxChars: requestUsesScopedBudget
        ? MAX_REQUEST_RECENT_TURN_CHARS_WITH_ATTACHMENTS_OR_RESEARCH
        : MAX_REQUEST_RECENT_TURN_CHARS,
    });

    setRecentTurns((prev) => trimTurns([...prev, nextAdminTurn]));
    setPrompt("");
    setError(null);
    setAsking(true);

    try {
      const response = await askAdminAssistant({
        taskType: selectedTaskType,
        message,
        recentTurns: requestRecentTurns,
        inquiryReference,
        attachmentIds: attachedImages.map((attachment) => attachment.id),
        enableResearch: researchSupported ? enableResearch : false,
      });

      setRecentTurns((prev) =>
        trimTurns([
          ...prev,
          normalizeAssistantTurn(response, new Date().toISOString()),
        ])
      );
      clearComposerAttachments();
      logAdminAction("admin_assistant.response_received", {
        taskType: response.taskType,
        contactSubmissionId: selectedContactId || null,
        attachmentCount: attachedImages.length,
        researchEnabled: researchSupported ? enableResearch : false,
        candidateRecentTurnCount: recentTurns.length,
        sentRecentTurnCount: requestRecentTurns.length,
        candidateRecentTurnChars: recentTurns.reduce((total, turn) => total + turn.content.length, 0),
        sentRecentTurnChars: requestRecentTurns.reduce((total, turn) => total + turn.content.length, 0),
      });
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Assistant response could not be generated."));
      setPrompt(message);
      setRecentTurns((prev) => prev.filter((turn) => turn !== nextAdminTurn));
      logAdminError("admin_assistant.response_failed", {
        taskType: selectedTaskType,
        contactSubmissionId: selectedContactId || null,
        reason: String(requestError),
        attachmentCount: attachedImages.length,
        researchEnabled: researchSupported ? enableResearch : false,
      });
    } finally {
      setAsking(false);
    }
  };

  const clearChat = () => {
    setRecentTurns([]);
    setError(null);
    clearComposerAttachments();
    try {
      window.localStorage.removeItem(getStorageKey(selectedContactId || null));
    } catch (storageError) {
      logAdminWarning("admin_assistant.session_clear_failed", {
        contactSubmissionId: selectedContactId || null,
        reason: String(storageError),
      });
    }
  };

  return (
    <div className="grid gap-6 lg:h-[calc(100vh-13rem)] lg:min-h-0 lg:overflow-hidden xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
      <aside className="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">General Assistant</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">Internal advisory help</h2>
            </div>
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Internal guidance only. Does not send, quote, or create drafts automatically.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {taskOptions.map((option) => {
              const isSelected = option.taskType === selectedTaskType;
              return (
                <button
                  key={option.taskType}
                  type="button"
                  disabled={asking}
                  onClick={() => {
                    setSelectedTaskType(option.taskType);
                    if (!prompt.trim()) {
                      setPrompt(option.placeholder);
                    }
                  }}
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    isSelected
                      ? "bg-gray-900 text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Inquiry Reference</p>
              <p className="mt-1 text-sm text-gray-600">Optionally ground this chat to one inquiry.</p>
            </div>
            {selectedContact && (
              <button
                type="button"
                onClick={() => setSelectedContactId("")}
                className="inline-flex items-center rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Link inquiry</span>
            <select
              aria-label="Link inquiry"
              value={selectedContactId}
              onChange={(event) => setSelectedContactId(event.target.value)}
              disabled={asking || contactsLoading}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">No linked inquiry</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.firstName} {contact.lastName} · {contact.service}
                </option>
              ))}
            </select>
          </label>

          {selectedContact && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <p className="text-sm font-medium text-gray-900">
                {selectedContact.firstName} {selectedContact.lastName}
              </p>
              <p className="mt-1 text-xs text-gray-600">{selectedContact.service}</p>
              {selectedContact.created_at && (
                <p className="mt-1 text-xs text-gray-500">Submitted {formatDateTime(selectedContact.created_at)}</p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Session</p>
              <p className="mt-1 text-sm text-gray-600">Lightweight local memory only.</p>
            </div>
            <button
              type="button"
              onClick={clearChat}
              disabled={asking || recentTurns.length === 0}
              className="inline-flex items-center rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Clear chat
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            This assistant keeps only recent text turns in browser storage to stay cheap and efficient.
          </p>
        </section>
      </aside>

      <section className="flex min-h-[42rem] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm lg:min-h-0 lg:h-full lg:overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Assistant</p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900">Creative and scouting support</h2>
              <p className="mt-1 text-sm text-gray-600">
                Use this for pricing, wording, planning, location scouting, and broader internal guidance.
              </p>
            </div>
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
              {taskLabelByType[selectedTaskType]}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 lg:min-h-0">
          {recentTurns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
              <MessageSquarePlus className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-4 text-sm font-medium text-gray-900">Start a new advisory chat</p>
              <p className="mt-2 text-sm text-gray-600">
                Ask for help with pricing, wording, shoot planning, location scouting, or timing/light/weather considerations.
              </p>
            </div>
          ) : (
            recentTurns.map((turn, index) => {
              const isAssistant = turn.role === "assistant";
              const sourceLookup = new Map((turn.sources ?? []).map((source) => [source.id, source]));
              return (
                <div
                  key={`${turn.createdAt}-${index}`}
                  className={`max-w-3xl rounded-2xl border px-4 py-3 ${
                    isAssistant
                      ? "border-blue-200 bg-blue-50"
                      : "ml-auto border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
                      {isAssistant ? "Assistant" : "You"}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                        {taskLabelByType[turn.taskType]}
                      </span>
                      {!isAssistant && turn.enableResearch ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                          Research on
                        </span>
                      ) : null}
                      <span className="text-[11px] text-gray-500">{formatDateTime(turn.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mt-2">
                    {turn.role === "assistant"
                      ? <RichAssistantText text={turn.answer ?? turn.content} />
                      : <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{turn.content}</p>}
                  </div>

                  {turn.attachments && turn.attachments.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {turn.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700"
                        >
                          <span className="font-medium">{attachment.name}</span>
                          <span className="text-gray-500">{formatBytes(attachment.sizeBytes)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {isAssistant && turn.imageObservations && turn.imageObservations.length > 0 ? (
                    <div className="mt-4">
                      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Image observations</h3>
                      <ul className="mt-2 space-y-1 text-sm text-gray-800">
                        {turn.imageObservations.map((observation) => (
                          <li key={observation} className="rounded-xl bg-white/80 px-3 py-2">
                            {observation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {isAssistant && turn.locationSuggestions && turn.locationSuggestions.length > 0 ? (
                    <div className="mt-4">
                      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Location suggestions</h3>
                      <div className="mt-2 space-y-3">
                        {turn.locationSuggestions.map((suggestion, suggestionIndex) => (
                          <div key={`${suggestion.label}-${suggestionIndex}`} className="rounded-2xl border border-blue-200 bg-white px-4 py-3">
                            {(() => {
                              const quickShootMeta = suggestion.quickShootPracticality
                                ? QUICK_SHOOT_META[suggestion.quickShootPracticality]
                                : null;
                              const permitMeta = suggestion.permitLikelihood
                                ? PERMIT_LIKELIHOOD_META[suggestion.permitLikelihood]
                                : null;
                              const permitSource = suggestion.permitSourceRef
                                ? sourceLookup.get(suggestion.permitSourceRef) ?? null
                                : null;
                              const resolvedSourceIds = (
                                suggestion.sourceRefs.length > 0
                                  ? suggestion.sourceRefs
                                  : (suggestion.sourceUrls ?? [])
                                    .map((sourceUrl) => (turn.sources ?? []).find((source) => source.url === sourceUrl)?.id)
                                    .filter((sourceId): sourceId is string => Boolean(sourceId))
                              );

                              return (
                                <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-900">{suggestion.label}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                {suggestion.area ? (
                                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                                    {suggestion.area}
                                  </span>
                                ) : null}
                                {quickShootMeta ? (
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${quickShootMeta.className}`}>
                                    {quickShootMeta.label}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-gray-700">{suggestion.whyFit}</p>
                            {suggestion.bestUseWindow ? (
                              <p className="mt-2 text-xs text-gray-500">Best use window: {suggestion.bestUseWindow}</p>
                            ) : null}
                            {((suggestion.permitLikelihood ?? suggestion.permitBasis) ? true : false) ? (
                              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">Permit</span>
                                  {permitMeta ? (
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${permitMeta.className}`}>
                                      {permitMeta.label}
                                    </span>
                                  ) : null}
                                  {permitSource ? (
                                    <a
                                      href={permitSource.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                                    >
                                      Permit source: {permitSource.title}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ) : null}
                                </div>
                                {suggestion.permitBasis ? (
                                  <p
                                    className="mt-2 text-xs text-gray-600"
                                    style={{
                                      display: "-webkit-box",
                                      WebkitLineClamp: 3,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {suggestion.permitBasis}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                            {suggestion.bestShootWindows && suggestion.bestShootWindows.length > 0 ? (
                              <div className="mt-3">
                                <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">Best shoot windows</h4>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {suggestion.bestShootWindows.map((window) => (
                                    <span
                                      key={window}
                                      className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200"
                                    >
                                      {window}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {suggestion.locationFeatures && suggestion.locationFeatures.length > 0 ? (
                              <div className="mt-3">
                                <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">Location features</h4>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {suggestion.locationFeatures.map((feature) => (
                                    <span
                                      key={feature}
                                      className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-200"
                                    >
                                      {feature}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            <CompactList
                              title="Access notes"
                              items={suggestion.accessCautions ?? []}
                              itemClassName="bg-gray-50 text-gray-700"
                            />
                            <CompactList
                              title="Friction notes"
                              items={suggestion.frictionNotes ?? []}
                              itemClassName="bg-amber-50 text-amber-900"
                            />
                            <CompactList
                              title="Other cautions"
                              items={suggestion.cautions}
                              itemClassName="bg-rose-50 text-rose-700"
                            />
                            {resolvedSourceIds.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {resolvedSourceIds.map((sourceRef) => {
                                  const source = sourceLookup.get(sourceRef);
                                  if (!source) return null;
                                  return (
                                    <a
                                      key={source.id}
                                      href={source.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                                    >
                                      {source.title}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  );
                                })}
                              </div>
                            ) : null}
                                </>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {isAssistant && turn.suggestedNextSteps && turn.suggestedNextSteps.length > 0 ? (
                    <div className="mt-4">
                      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Suggested next steps</h3>
                      <ul className="mt-2 space-y-1 text-sm text-gray-800">
                        {turn.suggestedNextSteps.map((step) => (
                          <li key={step} className="rounded-xl bg-white/80 px-3 py-2">
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {isAssistant && turn.sources && turn.sources.length > 0 ? (
                    <div className="mt-4">
                      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Sources</h3>
                      <div className="mt-2 space-y-2">
                        {turn.sources.map((source) => (
                          <a
                            key={source.id}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-col gap-1 rounded-2xl border border-blue-200 bg-white px-4 py-3 hover:bg-blue-50"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{source.title}</span>
                              <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                {source.domain}
                              </span>
                              <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                {source.sourceType.replace(/_/g, " ")}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{source.whyRelevant}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          {asking && (
            <div className="max-w-3xl rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-blue-900">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking through this…</span>
              </div>
            </div>
          )}
        </div>

        <div
          className={`border-t border-gray-200 px-5 py-4 transition ${
            isDragActive ? "bg-blue-50/60" : ""
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            if (!isDragActive) {
              setIsDragActive(true);
            }
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
            setIsDragActive(false);
          }}
          onDrop={(event) => {
            void handleComposerDrop(event);
          }}
        >
          {error && (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            aria-label="Attach images"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleAttachmentSelection(event);
            }}
          />

          {composingAttachments.length > 0 ? (
            <div className="mb-3 space-y-2">
              {composingAttachments.map((attachment) => (
                <div
                  key={attachment.localId}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${
                    attachment.uploadStatus === "error"
                      ? "border-rose-200 bg-rose-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  {attachment.previewUrl ? (
                    <img
                      src={attachment.previewUrl}
                      alt={attachment.name}
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-gray-400">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{attachment.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(attachment.sizeBytes)}
                      {attachment.uploadStatus === "uploading" ? " · Uploading…" : null}
                      {attachment.uploadStatus === "uploaded" && attachment.expiresAt
                        ? ` · Expires ${formatDateTime(attachment.expiresAt)}`
                        : null}
                    </p>
                    {attachment.error ? (
                      <p className="mt-1 text-xs text-rose-700">{attachment.error}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.localId)}
                    className="inline-flex items-center rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Prompt</span>
            <textarea
              aria-label="Prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onPaste={handlePromptPaste}
              rows={4}
              disabled={asking}
              className={`mt-1 w-full rounded-2xl border px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100 ${
                isDragActive ? "border-blue-400 bg-blue-50/40" : "border-gray-300"
              }`}
              placeholder={activePlaceholder}
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={asking || activeComposerAttachmentCount >= MAX_IMAGE_ATTACHMENTS}
              className="inline-flex items-center rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              Attach images
            </button>

            <p className="text-xs text-gray-500">
              Up to 3 images · 4 MB each · 8 MB total · Drag, drop, or paste images into the prompt
            </p>
          </div>

          {researchSupported ? (
            <label className="mt-3 flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3">
              <input
                type="checkbox"
                aria-label="Use research for scouting"
                checked={enableResearch}
                onChange={(event) => setEnableResearch(event.target.checked)}
                disabled={asking}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">Use research for scouting</span>
                <span className="mt-1 block text-xs text-gray-500">
                  Searches for grounded location/context sources when helpful.
                </span>
              </span>
            </label>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              {selectedContact
                ? `Linked to ${selectedContact.firstName} ${selectedContact.lastName} for extra context`
                : "No inquiry linked"}
            </div>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => {
                void handleSubmit();
              }}
              className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {asking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {asking ? "Asking..." : "Ask Assistant"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminAssistant;
