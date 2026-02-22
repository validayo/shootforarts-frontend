type LogLevel = "info" | "warn" | "error";
type LogPayload = Record<string, unknown>;

const formatPayload = (event: string, payload: LogPayload = {}) => ({
  event,
  at: new Date().toISOString(),
  ...payload,
});

const write = (level: LogLevel, event: string, payload: LogPayload = {}) => {
  const record = formatPayload(event, payload);

  if (!import.meta.env.DEV && level === "info") return;

  const message = `[sfa:${level}] ${event}`;
  if (level === "error") {
    console.error(message, record);
    return;
  }
  if (level === "warn") {
    console.warn(message, record);
    return;
  }
  console.info(message, record);
};

export const logAdminAction = (action: string, payload: LogPayload = {}) => {
  write("info", `admin.${action}`, payload);
};

export const logAdminWarning = (action: string, payload: LogPayload = {}) => {
  write("warn", `admin.${action}`, payload);
};

export const logAdminError = (action: string, payload: LogPayload = {}) => {
  write("error", `admin.${action}`, payload);
};
