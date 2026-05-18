import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Derives a 32-byte AES-256 key from NEXTAUTH_SECRET via SHA-256.
 * Returns null if NEXTAUTH_SECRET is not configured.
 */
function deriveKey(): Buffer | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns `iv:encrypted:authTag` as a base64-encoded string.
 *
 * @throws If NEXTAUTH_SECRET is not set in environment.
 */
export function encrypt(plaintext: string): string {
  const key = deriveKey();
  if (!key) {
    throw new Error(
      "NEXTAUTH_SECRET is required for encryption. Configure it in your .env file."
    );
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  // Format: iv:encrypted:authTag
  return `${iv.toString("base64")}:${encrypted}:${authTag}`;
}

/**
 * Decrypts a ciphertext produced by `encrypt()`.
 * Expects the format `iv:encrypted:authTag` (base64).
 *
 * @throws If the ciphertext format is invalid, or NEXTAUTH_SECRET is not set, or decryption fails.
 */
export function decrypt(ciphertext: string): string {
  const key = deriveKey();
  if (!key) {
    throw new Error(
      "NEXTAUTH_SECRET is required for decryption. Configure it in your .env file."
    );
  }

  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format. Expected iv:encrypted:authTag");
  }

  const [ivB64, encryptedB64, authTagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }
  if (authTag.length !== TAG_LENGTH) {
    throw new Error(
      `Invalid auth tag length: expected ${TAG_LENGTH}, got ${authTag.length}`
    );
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedB64, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
