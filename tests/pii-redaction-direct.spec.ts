// tests/pii-redaction-direct.spec.ts
// Direct PII redaction tests without logEvent dependency
import { describe, it, expect } from "vitest";
import { redactPII, safePayload } from "@/src/lib/security/redact";

describe("PII Redaction - Direct Tests", () => {
  describe("Authentication Logging PII Redaction", () => {
    it("should redact username in login rate limit logs", () => {
      const metadata = {
        username: "john.doe",
        blocked: true,
        remaining: 0,
        resetTime: Date.now()
      };

      const redacted = safePayload(metadata);
      
      expect(redacted).toEqual({
        username: "[redacted:field]",
        blocked: true,
        remaining: 0,
        resetTime: expect.any(Number)
      });
    });

    it("should redact credentials in auth failure logs", () => {
      const metadata = {
        username: "user@example.com",
        password: "secret123",
        reason: "Invalid credentials",
        attemptCount: 3
      };

      const redacted = safePayload(metadata);
      
      expect(redacted).toEqual({
        username: "[redacted:field]",
        password: "[redacted:field]",
        reason: "Invalid credentials",
        attemptCount: 3
      });
    });

    it("should redact tokens in auth success logs", () => {
      const metadata = {
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        sessionId: "sess_abc123",
        loginTime: new Date().toISOString()
      };

      const redacted = safePayload(metadata);
      
      expect(redacted).toEqual({
        accessToken: "[redacted:field]",
        refreshToken: "[redacted:field]",
        sessionId: "sess_abc123", // Not PII
        loginTime: expect.any(String)
      });
    });

    it("should redact sensitive session data", () => {
      const metadata = {
        sessionToken: "sess_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        userAgent: "Mozilla/5.0...",
        ipAddress: "192.168.1.1",
        email: "user@example.com"
      };

      const redacted = safePayload(metadata);
      
      expect(redacted).toEqual({
        sessionToken: "[redacted:field]",
        userAgent: "Mozilla/5.0...",
        ipAddress: "[redacted:field]", // IP addresses are redacted
        email: "[redacted:field]"
      });
    });

    it("should redact logout information", () => {
      const metadata = {
        sessionId: "sess_abc123",
        logoutReason: "user_initiated",
        email: "user@example.com",
        lastActivity: new Date().toISOString()
      };

      const redacted = safePayload(metadata);
      
      expect(redacted).toEqual({
        sessionId: "sess_abc123",
        logoutReason: "user_initiated",
        email: "[redacted:field]",
        lastActivity: expect.any(String)
      });
    });

    it("should redact user info in access denied logs", () => {
      const metadata = {
        requestedResource: "/api/admin/users",
        userRole: "STUDENT",
        requiredRole: "ADMIN",
        email: "student@example.com",
        username: "student123"
      };

      const redacted = safePayload(metadata);
      
      expect(redacted).toEqual({
        requestedResource: "/api/admin/users",
        userRole: "STUDENT",
        requiredRole: "ADMIN",
        email: "[redacted:field]",
        username: "[redacted:field]"
      });
    });

    it("should preserve non-PII authorization data", () => {
      const metadata = {
        requestedResource: "/api/dashboard",
        userRole: "TEACHER",
        permissions: ["read", "write"],
        timestamp: new Date().toISOString()
      };

      const redacted = safePayload(metadata);
      
      expect(redacted).toEqual({
        requestedResource: "/api/dashboard",
        userRole: "TEACHER",
        permissions: ["read", "write"],
        timestamp: expect.any(String)
      });
    });

    it("should redact password change attempts", () => {
      const metadata = {
        oldPassword: "oldsecret",
        newPassword: "newsecret",
        email: "user@example.com",
        success: true
      };

      const redacted = safePayload(metadata);
      
      expect(redacted).toEqual({
        oldPassword: "[redacted:field]",
        newPassword: "[redacted:field]",
        email: "[redacted:field]",
        success: true
      });
    });

    it("should redact password reset requests", () => {
      const metadata = {
        email: "user@example.com",
        resetToken: "reset_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0..."
      };

      const redacted = safePayload(metadata);
      
      expect(redacted).toEqual({
        email: "[redacted:field]",
        resetToken: "[redacted:field]",
        ipAddress: "[redacted:field]",
        userAgent: "Mozilla/5.0..."
      });
    });

    it("should redact MFA tokens and codes", () => {
      const metadata = {
        mfaCode: "123456",
        mfaToken: "mfa_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        email: "user@example.com",
        phone: "+420 123 456 789",
        success: true
      };

      const redacted = safePayload(metadata);
      
      expect(redacted).toEqual({
        mfaCode: "[redacted:field]",
        mfaToken: "[redacted:field]",
        email: "[redacted:field]",
        phone: "[redacted:field]",
        success: true
      });
    });

    it("should handle auth errors without exposing sensitive data", () => {
      const metadata = {
        error: "Database connection failed",
        email: "user@example.com",
        password: "secret123",
        stackTrace: "Error: Connection timeout\n    at auth.js:123"
      };

      const redacted = safePayload(metadata);
      
      expect(redacted).toEqual({
        error: "Database connection failed",
        email: "[redacted:field]",
        password: "[redacted:field]",
        stackTrace: expect.any(String)
      });
    });

    it("should redact PII in log messages", () => {
      const message = "User john@example.com logged in from +420 123 456 789";
      const redacted = redactPII(message);
      
      expect(redacted).toContain("[redacted:email]");
      expect(redacted).toContain("[redacted:phone]");
      expect(redacted).not.toContain("john@example.com");
      expect(redacted).not.toContain("+420 123 456 789");
    });

    it("should allow safe log messages", () => {
      const message = "User authentication successful";
      const redacted = redactPII(message);
      
      expect(redacted).toBe("User authentication successful");
    });
  });
});
