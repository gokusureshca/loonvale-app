/// <reference types="node" />
import { describe, expect, it } from "vitest";
import { fromBase64 } from "@/lib/base64";

describe("fromBase64", () => {
  it("matches Node's decoder, with and without padding", () => {
    for (const text of ["", "a", "ab", "abc", "abcd", "Loonvale receipts ✓"]) {
      const b64 = Buffer.from(text).toString("base64");
      expect(Buffer.from(fromBase64(b64)).toString()).toBe(text);
      expect(Buffer.from(fromBase64(b64.replace(/=+$/, ""))).toString()).toBe(text);
    }
  });
  it("decodes binary bytes", () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    const b64 = Buffer.from(bytes).toString("base64");
    expect(Array.from(fromBase64(b64))).toEqual(Array.from(bytes));
  });
});
