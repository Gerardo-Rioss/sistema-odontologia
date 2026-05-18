/**
 * Unit tests for AES-256-GCM encryption/decryption utilities.
 *
 * Tests the encrypt()/decrypt() round-trip and error handling
 * using NEXTAUTH_SECRET as the key derivation source.
 */

import { encrypt, decrypt } from "@/lib/encryption";

const MOCK_SECRET = "test-secret-key-for-unit-tests-min-32-chars!!";

describe("encrypt / decrypt round-trip", () => {
  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = MOCK_SECRET;
  });

  afterAll(() => {
    delete process.env.NEXTAUTH_SECRET;
  });

  it("should encrypt and decrypt a plain text string correctly", () => {
    const plaintext = "ya29.a0AfH6SMA...refresh_token_value";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(":");

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertexts for the same plaintext (random IV)", () => {
    const plaintext = "secret-token";
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);

    expect(encrypted1).not.toBe(encrypted2);
    // Both should decrypt to the original
    expect(decrypt(encrypted1)).toBe(plaintext);
    expect(decrypt(encrypted2)).toBe(plaintext);
  });

  it("should handle empty string", () => {
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("should handle special characters and Unicode", () => {
    const plaintext = "TOKEN_áéíóú_ñ_🔥_slashes/and\\backslashes";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should handle long tokens (> 1000 chars)", () => {
    const plaintext = "x".repeat(2000);
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});

describe("encrypt error handling", () => {
  it("should throw when NEXTAUTH_SECRET is not set", () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => encrypt("some-token")).toThrow(
      "NEXTAUTH_SECRET is required"
    );

    // Restore for subsequent tests
    process.env.NEXTAUTH_SECRET = MOCK_SECRET;
  });
});

describe("decrypt error handling", () => {
  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = MOCK_SECRET;
  });

  afterAll(() => {
    delete process.env.NEXTAUTH_SECRET;
  });

  it("should throw on invalid ciphertext format (missing parts)", () => {
    expect(() => decrypt("just-one-part")).toThrow("Invalid ciphertext format");
    expect(() => decrypt("a:b")).toThrow("Invalid ciphertext format");
  });

  it("should throw on corrupted ciphertext", () => {
    const encrypted = encrypt("original-token");
    const corrupted = encrypted.slice(0, -4) + "XXXX";
    expect(() => decrypt(corrupted)).toThrow();
  });

  it("should throw on completely invalid base64", () => {
    expect(() => decrypt("!!!:!!!:!!!")).toThrow();
  });

  it("should throw when NEXTAUTH_SECRET is not set", () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => decrypt("a:b:c")).toThrow("NEXTAUTH_SECRET is required");

    // Restore for subsequent tests
    process.env.NEXTAUTH_SECRET = MOCK_SECRET;
  });

  it("should throw when decrypting with a different key", () => {
    const plaintext = "secret-data";
    const encrypted = encrypt(plaintext);

    // Change the secret to simulate different key
    process.env.NEXTAUTH_SECRET = "different-secret-key-for-testing-purposes!";
    expect(() => decrypt(encrypted)).toThrow();

    // Restore
    process.env.NEXTAUTH_SECRET = MOCK_SECRET;
  });
});
