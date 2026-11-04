import { RefreshSchedule } from "./types";

export function formatRelativeTime(dateString?: string, prefix = ""): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Unknown";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return `${prefix}just now`.trim();
  if (diffMin < 60) return `${prefix}${diffMin} min ago`.trim();
  if (diffHours < 24) return `${prefix}${diffHours} h ago`.trim();
  if (diffDays === 1) return `${prefix}Yesterday`.trim();
  if (diffDays < 7) return `${prefix}${diffDays} days ago`.trim();

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatRunDateTime(dateString?: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeString = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today, ${timeString}`;
  if (isYesterday) return `Yesterday, ${timeString}`;

  const monthDay = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${monthDay}, ${timeString}`;
}

export function formatNextSchedule(schedule?: RefreshSchedule | null): string {
  if (!schedule || !schedule.enabled || !schedule.times || schedule.times.length === 0) {
    return "On demand";
  }

  // Parse time strings like "06:00", "12:00", "18:00"
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const sortedMinutes = schedule.times
    .map((t) => {
      const [h, m] = t.split(":").map(Number);
      return { original: t, totalMinutes: (h || 0) * 60 + (m || 0) };
    })
    .sort((a, b) => a.totalMinutes - b.totalMinutes);

  const nextTime =
    sortedMinutes.find((t) => t.totalMinutes > currentMinutes) || sortedMinutes[0];

  if (!nextTime) return "On demand";

  const [hoursStr, minsStr] = nextTime.original.split(":");
  let hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const mins = minsStr === "00" ? "" : `:${minsStr}`;

  return `Next ${hours}${mins} ${ampm}`;
}

export function formatScheduleSummary(schedule?: RefreshSchedule | null): string {
  if (!schedule || !schedule.enabled || !schedule.times || schedule.times.length === 0) {
    return "Refreshes on demand · No automatic schedule configured";
  }

  const timesFormatted = schedule.times.map((t) => {
    const [hStr, mStr] = t.split(":");
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const m = mStr === "00" ? "" : `:${mStr}`;
    return `${h}${m} ${ampm}`;
  });

  let timeList = "";
  if (timesFormatted.length === 1) {
    timeList = timesFormatted[0];
  } else if (timesFormatted.length === 2) {
    timeList = `${timesFormatted[0]} and ${timesFormatted[1]}`;
  } else {
    const last = timesFormatted[timesFormatted.length - 1];
    timeList = `${timesFormatted.slice(0, -1).join(", ")} and ${last}`;
  }

  const freq =
    schedule.days && schedule.days.length === 7
      ? "Daily"
      : schedule.days && schedule.days.length > 0
      ? schedule.days.join(", ")
      : "Daily";

  const tz = schedule.localTimeZoneId || "India Standard Time";
  return `${freq} at ${timeList} - ${tz}`;
}

export type ParsedErrorInfo = {
  code: string;
  message: string;
  advice: string;
  raw: string;
};

export function parsePowerBiErrorDetails(errorInput?: string | null): ParsedErrorInfo {
  if (!errorInput) {
    return {
      code: "RefreshFailed",
      message: "The refresh failed in Power BI.",
      advice: "Check Power BI service dataset settings and refresh again.",
      raw: "",
    };
  }

  let code = "RefreshFailed";
  let message = "";
  const raw = errorInput;

  try {
    const trimmed = errorInput.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      code = parsed?.errorCode || parsed?.error?.code || parsed?.code || code;
      message =
        parsed?.error?.pbi?.error?.message ||
        parsed?.error?.message ||
        parsed?.message ||
        "";
    }
  } catch {
    // Not strictly valid JSON, fallback to regex search
  }

  if ((!code || code === "RefreshFailed") && errorInput.includes("errorCode")) {
    const match = errorInput.match(/"errorCode"\s*:\s*"([^"]+)"/);
    if (match?.[1]) {
      code = match[1];
    }
  }

  let advice = "Ask the dataset owner to update data source credentials in Power BI service settings.";

  if (code.includes("CredentialsNotSpecified") || code.includes("CredentialNotSpecified")) {
    message = message || "Data source credentials are not specified or have expired.";
    advice = "The dataset cannot connect to the data source. Open Power BI settings, re-enter the credentials, and refresh again.";
  } else if (code.includes("Gateway")) {
    message = message || "The on-premises data gateway is offline or unreachable.";
    advice = "Ensure your on-premises data gateway is running and connected to the Power BI service.";
  } else if (code.includes("Timeout")) {
    message = message || "The refresh operation exceeded the maximum timeout duration.";
    advice = "Optimize heavy DAX queries, partition the tables, or increase the timeout limit.";
  } else if (code.includes("Disabled")) {
    message = message || "Scheduled refresh was disabled due to consecutive failures.";
    advice = "Re-enable scheduled refresh in Power BI Dataset settings once credentials/gateways are fixed.";
  } else if (!message) {
    message = code.replace(/([A-Z])/g, " $1").replace(/_/g, " - ").trim();
  }

  return {
    code,
    message,
    advice,
    raw,
  };
}
