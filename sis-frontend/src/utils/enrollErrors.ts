// ─── Enroll & Unenroll error parsing ─────────────────────────────────────────

export function parseEnrollError(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const data = (err as { response?: { data?: unknown } })?.response?.data;

  if (status === 409) {
    if (data && typeof data === "object" && "detail" in data && typeof (data as { detail?: string }).detail === "string") {
      return (data as { detail: string }).detail;
    }
    return "Schedule conflict or class/group is already full.";
  }

  if (status === 400 && data) {
    if (typeof data === "string") return data;
    if (typeof data === "object") {
      if ("detail" in data && typeof (data as { detail?: string }).detail === "string") {
        return (data as { detail: string }).detail;
      }
      const messages: string[] = [];
      for (const key of Object.keys(data)) {
        const val = (data as Record<string, unknown>)[key];
        if (Array.isArray(val)) {
          messages.push(...val.map(String));
        } else if (typeof val === "string") {
          messages.push(val);
        }
      }
      if (messages.length > 0) return messages.join(" ");
    }
    return "Operation validation failed.";
  }

  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail?: string }).detail === "string") {
    return (data as { detail: string }).detail;
  }

  return "Something went wrong. Please try again.";
}
