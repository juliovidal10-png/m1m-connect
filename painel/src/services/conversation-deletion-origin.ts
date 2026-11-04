// Public URL comes only from server configuration, never forwarded request headers.
export function deletionRequestOriginAllowed(
  request: { headers: { get(name: string): string | null }; nextUrl: { origin: string } },
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const origin = request.headers.get('origin');
  // Preserve authenticated non-browser callers, which previously omitted Origin.
  if (origin === null) return true;
  const configured = env.M1M_CONVERSATION_DELETION_ORIGIN?.trim();
  if (!configured && env.NODE_ENV === 'production') return false;
  try {
    const target = new URL(configured || request.nextUrl.origin);
    const source = new URL(origin);
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) return false;
    if (configured && configured !== target.origin) return false;
    if (!['http:', 'https:'].includes(source.protocol) || source.username || source.password) return false;
    // Origin must be a serialized origin, not a URL with a path/query/fragment.
    return origin === source.origin && source.origin === target.origin;
  } catch {
    return false;
  }
}
