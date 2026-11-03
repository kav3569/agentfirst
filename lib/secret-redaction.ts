// Publication redaction is defense in depth. Do not supply secrets to candidates.
export function redactSecrets(text: string, secrets: string[] = []): string {
  let value = text;
  for (const secret of [...secrets]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length))
    for (const variant of new Set([secret, encodeURIComponent(secret)]))
      value = value.split(variant).join("[REDACTED]");
  return value
    .replace(
      /(authorization["'\s]*[:=]["'\s]*)(?:Bearer\s+)?[^\s,;}"']+/gi,
      "$1[REDACTED]",
    )
    .replace(/([?&]token=)[^&\s"']+/gi, "$1[REDACTED]")
    .replace(/\bsk-(?:proj-)?[a-zA-Z0-9_-]{20,}\b/g, "[REDACTED]");
}
