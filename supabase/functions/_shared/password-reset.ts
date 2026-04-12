export const PASSWORD_RESET_DEFAULT_EXPIRES_MINUTES = 15;

export function getPasswordResetExpiresMinutes(): number {
  const raw = Deno.env.get("PASSWORD_RESET_EXPIRES_MINUTES");
  const value = Number(raw ?? PASSWORD_RESET_DEFAULT_EXPIRES_MINUTES);

  if (!Number.isFinite(value) || value <= 0) {
    return PASSWORD_RESET_DEFAULT_EXPIRES_MINUTES;
  }

  return Math.floor(value);
}

export function generatePasswordResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function buildPasswordResetUrl(token: string): string {
  const appBaseUrl = Deno.env.get("APP_BASE_URL");
  if (!appBaseUrl) {
    throw new Error("APP_BASE_URL is not set");
  }

  const url = new URL("/reset-password", appBaseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export function getPasswordResetExpiryDate(now = new Date()): Date {
  const minutes = getPasswordResetExpiresMinutes();
  return new Date(now.getTime() + minutes * 60 * 1000);
}

export function buildPasswordResetMail(params: {
  username: string;
  resetUrl: string;
  expiresMinutes: number;
}) {
  const { username, resetUrl, expiresMinutes } = params;

  const subject = "【Typro】パスワード再設定のご案内";

  const text = [
    `${username} さん`,
    "",
    "Typro のパスワード再設定を受け付けました。",
    "下記リンクから新しいパスワードを設定してください。",
    "",
    resetUrl,
    "",
    `このリンクの有効期限は ${expiresMinutes} 分です。`,
    "このリンクは1回のみ有効です。",
    "この操作に心当たりがない場合は、このメールを破棄してください。",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #111827;">
      <p>${escapeHtml(username)} さん</p>
      <p>Typro のパスワード再設定を受け付けました。</p>
      <p>下記ボタンから新しいパスワードを設定してください。</p>
      <p style="margin: 24px 0;">
        <a
          href="${escapeHtml(resetUrl)}"
          style="
            display: inline-block;
            padding: 12px 20px;
            background: #0ea5e9;
            color: #ffffff;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 700;
          "
        >
          パスワードを再設定する
        </a>
      </p>
      <p>リンクの有効期限は <strong>${expiresMinutes} 分</strong> です。</p>
      <p>このリンクは <strong>1回のみ有効</strong> です。</p>
      <p>この操作に心当たりがない場合は、このメールを破棄してください。</p>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">
        ボタンが開けない場合は、以下のURLをブラウザに貼り付けてください。<br />
        ${escapeHtml(resetUrl)}
      </p>
    </div>
  `;

  return { subject, text, html };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function b64(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function randomSaltBytes(len = 16) {
  const salt = new Uint8Array(len);
  crypto.getRandomValues(salt);
  return salt;
}

export async function hashPasswordPbkdf2(plain: string): Promise<string> {
  const iterations = 210_000;
  const salt = randomSaltBytes(16);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(plain),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    256,
  );

  const saltB64 = b64(salt.buffer);
  const hashB64 = b64(bits);

  return `pbkdf2_sha256$${iterations}$${saltB64}$${hashB64}`;
}

function fromB64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export async function verifyPasswordPbkdf2(
  plain: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split("$");

  if (parts.length !== 4) {
    throw new Error("Invalid password hash format.");
  }

  const [algorithm, iterationsText, saltB64, hashB64] = parts;

  if (algorithm !== "pbkdf2_sha256") {
    throw new Error("Unsupported password hash algorithm.");
  }

  const iterations = Number(iterationsText);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    throw new Error("Invalid PBKDF2 iteration count.");
  }

  const salt = fromB64(saltB64);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(plain),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    256,
  );

  const actualHashB64 = b64(bits);

  return actualHashB64 === hashB64;
}