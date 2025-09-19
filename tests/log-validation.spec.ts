// tests/log-validation.spec.ts
// Final validation that no sensitive data leaks into logs
import { describe, it, expect } from "vitest";
import { safePayload } from "@/src/lib/security/redact";

describe("Log Validation - No Sensitive Data Leakage", () => {
  describe("Authentication scenarios", () => {
    it("should not leak credentials in login attempts", () => {
      const sensitiveData = {
        username: "john.doe@example.com",
        password: "superSecret123!",
        email: "john.doe@example.com",
        phone: "+420 123 456 789",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        apiKey: "sk-1234567890abcdef1234567890abcdef"
      };

      const redacted = safePayload(sensitiveData);
      
      // Verify no sensitive data remains
      expect(JSON.stringify(redacted)).not.toContain("john.doe@example.com");
      expect(JSON.stringify(redacted)).not.toContain("superSecret123!");
      expect(JSON.stringify(redacted)).not.toContain("+420 123 456 789");
      expect(JSON.stringify(redacted)).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      expect(JSON.stringify(redacted)).not.toContain("sk-1234567890abcdef");
      
      // Verify redaction markers are present
      expect(JSON.stringify(redacted)).toContain("[redacted:field]");
    });

    it("should not leak session data", () => {
      const sessionData = {
        sessionId: "sess_abc123def456",
        sessionToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        refreshToken: "refresh_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        userEmail: "user@example.com",
        userPhone: "+420 987 654 321",
        ipAddress: "192.168.1.100"
      };

      const redacted = safePayload(sessionData);
      
      // Verify sensitive data is redacted
      expect(JSON.stringify(redacted)).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      expect(JSON.stringify(redacted)).not.toContain("user@example.com");
      expect(JSON.stringify(redacted)).not.toContain("+420 987 654 321");
      
      // Verify non-sensitive data is preserved
      expect(redacted.sessionId).toBe("sess_abc123def456");
      expect(redacted.ipAddress).toBe("[redacted:field]"); // Contains "address"
    });
  });

  describe("User profile scenarios", () => {
    it("should not leak personal information", () => {
      const userProfile = {
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
        email: "john.doe@company.com",
        phone: "+420 111 222 333",
        address: "123 Main St, Prague, Czech Republic",
        dateOfBirth: "1990-01-01",
        ssn: "123456789",
        creditCard: "4111 1111 1111 1111"
      };

      const redacted = safePayload(userProfile);
      
      // Verify PII is redacted
      expect(JSON.stringify(redacted)).not.toContain("john.doe@company.com");
      expect(JSON.stringify(redacted)).not.toContain("+420 111 222 333");
      expect(JSON.stringify(redacted)).not.toContain("123 Main St");
      expect(JSON.stringify(redacted)).not.toContain("123456789");
      expect(JSON.stringify(redacted)).not.toContain("4111 1111 1111 1111");
      
      // Verify non-PII is preserved
      expect(redacted.dateOfBirth).toBe("1990-01-01");
    });
  });

  describe("Error scenarios", () => {
    it("should not leak sensitive data in error messages", () => {
      const errorData = {
        error: "Database connection failed",
        stackTrace: "Error: Connection timeout\n    at auth.js:123\n    at login.js:45",
        userEmail: "admin@example.com",
        userPassword: "adminSecret123",
        databasePassword: "dbSecret456",
        apiKey: "api_key_123456789"
      };

      const redacted = safePayload(errorData);
      
      // Verify sensitive data is redacted
      expect(JSON.stringify(redacted)).not.toContain("admin@example.com");
      expect(JSON.stringify(redacted)).not.toContain("adminSecret123");
      expect(JSON.stringify(redacted)).not.toContain("dbSecret456");
      expect(JSON.stringify(redacted)).not.toContain("api_key_123456789");
      
      // Verify error information is preserved
      expect(redacted.error).toBe("Database connection failed");
      expect(redacted.stackTrace).toContain("Error: Connection timeout");
    });
  });

  describe("API request scenarios", () => {
    it("should not leak API credentials in request logs", () => {
      const requestData = {
        method: "POST",
        url: "/api/users",
        headers: {
          authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
          "x-api-key": "api_key_abcdef123456",
          "content-type": "application/json"
        },
        body: {
          username: "newuser@example.com",
          password: "newPassword123",
          email: "newuser@example.com"
        }
      };

      const redacted = safePayload(requestData);
      
      // Verify sensitive data is redacted
      expect(JSON.stringify(redacted)).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      expect(JSON.stringify(redacted)).not.toContain("api_key_abcdef123456");
      expect(JSON.stringify(redacted)).not.toContain("newuser@example.com");
      expect(JSON.stringify(redacted)).not.toContain("newPassword123");
      
      // Verify non-sensitive data is preserved
      expect(redacted.method).toBe("POST");
      expect(redacted.url).toBe("/api/users");
      expect(redacted.headers["content-type"]).toBe("application/json");
    });
  });

  describe("Complex nested scenarios", () => {
    it("should handle deeply nested PII", () => {
      const complexData = {
        users: [
          {
            id: "user1",
            profile: {
              personalInfo: {
                email: "user1@example.com",
                phone: "+420 111 111 111",
                address: "Street 1, City 1"
              },
              credentials: {
                password: "password1",
                token: "token1_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
              }
            }
          },
          {
            id: "user2",
            profile: {
              personalInfo: {
                email: "user2@example.com",
                phone: "+420 222 222 222",
                address: "Street 2, City 2"
              },
              credentials: {
                password: "password2",
                token: "token2_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
              }
            }
          }
        ],
        metadata: {
          adminEmail: "admin@example.com",
          adminPassword: "adminPass123"
        }
      };

      const redacted = safePayload(complexData);
      
      // Verify all PII is redacted
      expect(JSON.stringify(redacted)).not.toContain("user1@example.com");
      expect(JSON.stringify(redacted)).not.toContain("user2@example.com");
      expect(JSON.stringify(redacted)).not.toContain("+420 111 111 111");
      expect(JSON.stringify(redacted)).not.toContain("+420 222 222 222");
      expect(JSON.stringify(redacted)).not.toContain("password1");
      expect(JSON.stringify(redacted)).not.toContain("password2");
      expect(JSON.stringify(redacted)).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      expect(JSON.stringify(redacted)).not.toContain("admin@example.com");
      expect(JSON.stringify(redacted)).not.toContain("adminPass123");
      
      // Verify structure and non-PII data is preserved
      expect(redacted.users[0].id).toBe("user1");
      expect(redacted.users[1].id).toBe("user2");
      expect(redacted.users[0].profile.personalInfo.email).toBe("[redacted:field]");
      expect(redacted.users[1].profile.personalInfo.email).toBe("[redacted:field]");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty and null values safely", () => {
      const edgeCaseData = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: "",
        emptyObject: {},
        emptyArray: [],
        validData: {
          email: "test@example.com",
          password: "test123"
        }
      };

      const redacted = safePayload(edgeCaseData);
      
      // Verify structure is preserved
      expect(redacted.nullValue).toBe(null);
      expect(redacted.undefinedValue).toBe(undefined);
      expect(redacted.emptyString).toBe("");
      expect(redacted.emptyObject).toEqual({});
      expect(redacted.emptyArray).toEqual([]);
      
      // Verify PII is still redacted
      expect(redacted.validData.email).toBe("[redacted:field]");
      expect(redacted.validData.password).toBe("[redacted:field]");
    });

    it("should handle circular references without leaking data", () => {
      const circularData: any = {
        email: "circular@example.com",
        password: "circularPass123"
      };
      circularData.self = circularData;
      circularData.nested = { parent: circularData };

      const redacted = safePayload(circularData);
      
      // Verify PII is redacted
      expect(JSON.stringify(redacted)).not.toContain("circular@example.com");
      expect(JSON.stringify(redacted)).not.toContain("circularPass123");
      
      // Verify circular references are handled
      expect(redacted.self).toBe("[redacted:circular]");
      expect(redacted.nested.parent).toBe("[redacted:circular]");
    });
  });
});
