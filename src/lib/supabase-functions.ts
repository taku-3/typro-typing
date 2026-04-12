// src/lib/supabase-functions.ts
const FUNCTIONS_BASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL ??
  "";

function buildErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof (error as { error?: unknown }).error === "string"
  ) {
    return (error as { error: string }).error;
  }

  return "request_failed";
}

export async function postPublicFunction<TResponse>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<TResponse> {
  if (!FUNCTIONS_BASE_URL) {
    throw new Error("functions_base_url_missing");
  }

  const res = await fetch(`${FUNCTIONS_BASE_URL}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(buildErrorMessage(data));
  }

  return data as TResponse;
}