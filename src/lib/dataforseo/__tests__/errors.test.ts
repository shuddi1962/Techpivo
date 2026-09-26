import { describe, it, expect } from "vitest";
import { statusFromDfsCode, statusFromHttp, publicMessageFor } from "@/lib/dataforseo/errors";

describe("DataForSEO error taxonomy", () => {
  it("maps DFS codes", () => {
    expect(statusFromDfsCode(20000)).toBe("ok");
    expect(statusFromDfsCode(40101)).toBe("auth_failed");
    expect(statusFromDfsCode(42900)).toBe("rate_limited");
    expect(statusFromDfsCode(99999)).toBe("unknown");
  });

  it("maps HTTP failures", () => {
    expect(statusFromHttp(401, false)).toBe("auth_failed");
    expect(statusFromHttp(undefined, true)).toBe("timeout");
  });

  it("never leaks credential values in public messages", () => {
    const msg = publicMessageFor("auth_failed");
    expect(msg).not.toMatch(/Basic\s+[A-Za-z0-9+/=]{10,}/);
    expect(msg).not.toContain("95ebb0a451ce9dff");
    expect(publicMessageFor("not_configured")).toMatch(/DATAFORSEO_LOGIN/);
  });
});
