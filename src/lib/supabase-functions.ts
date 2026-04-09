const DEFAULT_FUNCTIONS_BASE_URL = "http://127.0.0.1:54321/functions/v1";

function getFunctionsBaseUrl() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL ??
    DEFAULT_FUNCTIONS_BASE_URL;

  return baseUrl.replace(/\/+$/, "");
}

export function buildFunctionUrl(functionName: string) {
  return `${getFunctionsBaseUrl()}/${functionName}`;
}

export async function postPublicFunction<TResponse>(
  functionName: string,
  body: unknown,
): Promise<TResponse> {
  const response = await fetch(buildFunctionUrl(functionName), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && data.error) ||
      `Request failed with status ${response.status}`;
    throw new Error(String(message));
  }

  return data as TResponse;
}