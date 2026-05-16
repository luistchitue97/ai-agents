import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ALGO = "aes-256-gcm"
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      "INTEGRATIONS_ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    )
  }
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error(
      `INTEGRATIONS_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}).`
    )
  }
  return key
}

/** Encrypts a UTF-8 string. Returns base64(iv || tag || ciphertext). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString("base64")
}

/** Inverse of encryptSecret. Throws on tampering. */
export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64")
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
}
