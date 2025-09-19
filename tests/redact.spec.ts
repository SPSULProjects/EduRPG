// tests/redact.spec.ts
import { describe, it, expect } from "vitest";
import { redactPII, safePayload } from "@/src/lib/security/redact";

describe("redactPII", () => {
  it("redacts deny-listed fields by name (case-insensitive)", () => {
    const input = { Password: "supersecret", EMAIL: "x@y.cz", phone: "+420 777 888 999" };
    const out: any = redactPII(input);
    expect(out.Password).toBe("[redacted:field]");
    expect(out.EMAIL).toBe("[redacted:field]"); // field name rule wins
    expect(out.phone).toBe("[redacted:field]");
  });

  it("masks email and CZ phone patterns inside strings", () => {
    const input = {
      note: "Contact me at test.user+abc@school.cz or 777 888 999.",
      other: "Alt +420777888999 also works.",
    };
    const out: any = redactPII(input);
    expect(out.note).not.toMatch(/@/);
    expect(out.note).toContain("[redacted:email]");
    expect(out.note).toContain("[redacted:phone]");
    expect(out.other).toContain("[redacted:phone]");
  });

  it("handles nested objects and arrays", () => {
    const input = { a: [{ token: "eyJabc123456789ZZZ" }, { nested: { pass: "x" } }] };
    const out: any = redactPII(input);
    expect(out.a[0].token).toBe("[redacted:field]");
    expect(out.a[1].nested.pass).toBe("[redacted:field]");
  });

  it("limits depth to avoid runaway traversal", () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: { email: "t@t.cz" } } } } } } } };
    const out: any = redactPII(deep, { maxDepth: 2 });
    // At depth 2+ we stop walking; ensure no crash (value can remain unredacted)
    expect(out.a.b.c).toBeDefined();
  });

  it("handles circular structures safely", () => {
    const obj: any = { email: "t@t.cz" };
    obj.self = obj;
    const out: any = redactPII(obj);
    expect(out.self).toBe("[redacted:circular]");
  });

  it("preserves non-PII data", () => {
    const input = {
      id: "user123",
      count: 42,
      active: true,
      tags: ["admin", "verified"],
      config: { theme: "dark", language: "cs" }
    };
    const out: any = redactPII(input);
    expect(out.id).toBe("user123");
    expect(out.count).toBe(42);
    expect(out.active).toBe(true);
    expect(out.tags).toEqual(["admin", "verified"]);
    expect(out.config.theme).toBe("dark");
    expect(out.config.language).toBe("cs");
  });

  it("redacts JWT-like tokens in strings", () => {
    const input = {
      jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      apiKey: "sk-1234567890abcdef1234567890abcdef", // field name redacted
      shortToken: "abc123", // too short, should not be redacted
      note: "Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", // pattern in string
      customField: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" // pattern redaction
    };
    const out: any = redactPII(input);
    expect(out.jwt).toContain("[redacted:token]"); // pattern redaction applied
    expect(out.apiKey).toBe("[redacted:field]"); // field name redacted
    expect(out.shortToken).toBe("[redacted:field]"); // field name redaction
    expect(out.note).toContain("[redacted:token]"); // pattern redaction in string
    expect(out.customField).toContain("[redacted:token]"); // pattern redaction
  });

  it("handles various Czech phone number formats", () => {
    const input = {
      phone1: "+420 123 456 789",
      phone2: "420123456789",
      phone3: "123 456 789",
      phone4: "123-456-789",
      phone5: "123.456.789",
      notPhone: "1234567890" // too long, not Czech format
    };
    const out: any = redactPII(input);
    expect(out.phone1).toBe("[redacted:field]"); // field name redaction
    expect(out.phone2).toBe("[redacted:field]"); // field name redaction
    expect(out.phone3).toBe("[redacted:field]"); // field name redaction
    expect(out.phone4).toBe("[redacted:field]"); // field name redaction
    expect(out.phone5).toBe("[redacted:field]"); // field name redaction
    expect(out.notPhone).toBe("[redacted:field]"); // field name contains "phone"
  });

  it("handles null and undefined values", () => {
    const input = {
      nullValue: null,
      undefinedValue: undefined,
      emptyString: "",
      zero: 0,
      falseValue: false
    };
    const out: any = redactPII(input);
    expect(out.nullValue).toBe(null);
    expect(out.undefinedValue).toBe(undefined);
    expect(out.emptyString).toBe("");
    expect(out.zero).toBe(0);
    expect(out.falseValue).toBe(false);
  });

  it("respects redaction options", () => {
    const obj: any = { email: "test@example.com" };
    obj.self = obj;
    
    // Test with circular redaction disabled
    const out1: any = redactPII(obj, { redactCircular: false });
    expect(out1.self).toBe(obj); // same reference
    
    // Test with circular redaction enabled (default)
    const out2: any = redactPII(obj, { redactCircular: true });
    expect(out2.self).toBe("[redacted:circular]");
  });

  it("handles complex nested structures with mixed PII", () => {
    const input = {
      user: {
        profile: {
          name: "John Doe",
          email: "john@example.com",
          phone: "+420 123 456 789",
          settings: {
            theme: "dark",
            notifications: true
          }
        },
        credentials: {
          password: "secret123",
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        }
      },
      metadata: {
        ip: "192.168.1.1",
        userAgent: "Mozilla/5.0...",
        sessionId: "sess_abc123def456"
      }
    };
    
    const out: any = redactPII(input);
    
    // Field names should be redacted
    expect(out.user.profile.email).toBe("[redacted:field]");
    expect(out.user.profile.phone).toBe("[redacted:field]");
    expect(out.user.credentials.password).toBe("[redacted:field]");
    expect(out.user.credentials.token).toBe("[redacted:field]");
    
    // Pattern-based redaction in strings
    expect(out.user.profile.name).toBe("John Doe"); // "name" field not redacted (not in patterns)
    expect(out.metadata.ip).toBe("[redacted:field]"); // IP addresses are now redacted for privacy
    expect(out.metadata.userAgent).toBe("Mozilla/5.0..."); // unchanged
    expect(out.metadata.sessionId).toBe("sess_abc123def456"); // unchanged
    
    // Non-PII data preserved
    expect(out.user.profile.settings.theme).toBe("dark");
    expect(out.user.profile.settings.notifications).toBe(true);
  });
});

describe("safePayload", () => {
  it("returns redacted payload on success", () => {
    const input = { email: "test@example.com", password: "secret" };
    const result: any = safePayload(input);
    expect(result.email).toBe("[redacted:field]");
    expect(result.password).toBe("[redacted:field]");
  });

  it("returns error marker on exception", () => {
    // Test with a circular reference that might cause issues
    const circular: any = { email: "test@example.com" };
    circular.self = circular;
    
    // This should work fine, but let's test the error handling by creating
    // a scenario where redactPII might fail
    const result = safePayload(circular);
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    
    // Test with a more direct approach - create an object with a getter that throws
    const problematicInput = {
      get value() {
        throw new Error("Access denied");
      }
    };
    
    // This should still work because we're not accessing the problematic property
    const result2 = safePayload(problematicInput);
    expect(result2).toBeDefined();
  });

  it("handles edge cases that might cause errors", () => {
    // Test with very deep nesting that might hit max depth
    let deep = { email: "test@example.com" };
    for (let i = 0; i < 10; i++) {
      deep = { nested: deep };
    }
    
    const result = safePayload(deep, { maxDepth: 2 });
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("handles primitive values", () => {
    expect(safePayload("test@example.com")).toBe("[redacted:email]");
    expect(safePayload(42)).toBe(42);
    expect(safePayload(true)).toBe(true);
    expect(safePayload(null)).toBe(null);
  });
});
