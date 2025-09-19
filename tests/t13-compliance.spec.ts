// tests/t13-compliance.spec.ts
// T13 Security, Privacy & Retention compliance tests
import { describe, it, expect } from "vitest";
import { redactPII, safePayload } from "@/src/lib/security/redact";

describe("T13 Security, Privacy & Retention Compliance", () => {
  describe("Step 1: Ensure no PII in logs; redact payloads", () => {
    it("should redact all PII types from log payloads", () => {
      const sensitiveData = {
        // Personal Information
        email: "user@example.com",
        phone: "+420 123 456 789",
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
        
        // Authentication Data
        password: "secret123",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        apiKey: "sk-1234567890abcdef",
        secret: "mysecret",
        
        // Financial Data
        creditCard: "4111 1111 1111 1111",
        ssn: "123456789",
        
        // Address Information
        address: "123 Main St, Prague",
        
        // Mixed case variations
        Email: "admin@example.com",
        PASSWORD: "admin123",
        Phone: "+420 987 654 321"
      };

      const redacted = safePayload(sensitiveData);
      
      // All PII should be redacted
      expect(redacted.email).toBe("[redacted:field]");
      expect(redacted.phone).toBe("[redacted:field]");
      expect(redacted.firstName).toBe("[redacted:field]");
      expect(redacted.lastName).toBe("[redacted:field]");
      expect(redacted.fullName).toBe("[redacted:field]");
      expect(redacted.password).toBe("[redacted:field]");
      expect(redacted.token).toBe("[redacted:field]");
      expect(redacted.apiKey).toBe("[redacted:field]");
      expect(redacted.secret).toBe("[redacted:field]");
      expect(redacted.creditCard).toBe("[redacted:field]");
      expect(redacted.ssn).toBe("[redacted:field]");
      expect(redacted.address).toBe("[redacted:field]");
      expect(redacted.Email).toBe("[redacted:field]");
      expect(redacted.PASSWORD).toBe("[redacted:field]");
      expect(redacted.Phone).toBe("[redacted:field]");
    });

    it("should redact PII patterns in string content", () => {
      const testCases = [
        {
          input: "Contact user@example.com for support",
          expected: "Contact [redacted:email] for support"
        },
        {
          input: "Call +420 123 456 789 for help",
          expected: "Call [redacted:phone] for help"
        },
        {
          input: "password: secret123",
          expected: "[redacted:password]"
        },
        {
          input: "api_key=sk-1234567890abcdef",
          expected: "[redacted:token]"
        },
        {
          input: "Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
          expected: "[redacted:token]"
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = redactPII({ message: input });
        expect(result.message).toBe(expected);
      });
    });

    it("should preserve safe fields for logging", () => {
      const logData = {
        // Safe fields that should be preserved
        userId: "user123",
        requestId: "req456",
        level: "INFO",
        timestamp: "2024-01-01T00:00:00Z",
        count: 42,
        duration: 150,
        status: "success",
        error: null,
        active: true,
        tags: ["system", "startup"],
        
        // PII that should be redacted
        email: "user@example.com",
        password: "secret"
      };

      const redacted = safePayload(logData);
      
      // Safe fields should be preserved
      expect(redacted.userId).toBe("user123");
      expect(redacted.requestId).toBe("req456");
      expect(redacted.level).toBe("INFO");
      expect(redacted.timestamp).toBe("2024-01-01T00:00:00Z");
      expect(redacted.count).toBe(42);
      expect(redacted.duration).toBe(150);
      expect(redacted.status).toBe("success");
      expect(redacted.error).toBe(null);
      expect(redacted.active).toBe(true);
      expect(redacted.tags).toEqual(["system", "startup"]);
      
      // PII should be redacted
      expect(redacted.email).toBe("[redacted:field]");
      expect(redacted.password).toBe("[redacted:field]");
    });

    it("should handle nested PII structures", () => {
      const nestedData = {
        user: {
          profile: {
            personal: {
              email: "user@example.com",
              phone: "+420 123 456 789",
              address: "123 Main St"
            },
            credentials: {
              password: "secret123",
              token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
            }
          }
        },
        metadata: {
          admin: {
            email: "admin@example.com",
            secret: "adminsecret"
          }
        }
      };

      const redacted = safePayload(nestedData);
      
      // All nested PII should be redacted
      expect(redacted.user.profile.personal.email).toBe("[redacted:field]");
      expect(redacted.user.profile.personal.phone).toBe("[redacted:field]");
      expect(redacted.user.profile.personal.address).toBe("[redacted:field]");
      expect(redacted.user.profile.credentials.password).toBe("[redacted:field]");
      expect(redacted.user.profile.credentials.token).toBe("[redacted:field]");
      expect(redacted.metadata.admin.email).toBe("[redacted:field]");
      expect(redacted.metadata.admin.secret).toBe("[redacted:field]");
    });

    it("should handle arrays with PII", () => {
      const arrayData = {
        users: [
          { email: "user1@example.com", password: "pass1" },
          { email: "user2@example.com", password: "pass2" },
          { email: "user3@example.com", password: "pass3" }
        ],
        messages: [
          "Contact user@example.com for help",
          "Call +420 123 456 789",
          "password: secret123"
        ]
      };

      const redacted = safePayload(arrayData);
      
      // PII in arrays should be redacted
      expect(redacted.users[0].email).toBe("[redacted:field]");
      expect(redacted.users[0].password).toBe("[redacted:field]");
      expect(redacted.users[1].email).toBe("[redacted:field]");
      expect(redacted.users[1].password).toBe("[redacted:field]");
      expect(redacted.users[2].email).toBe("[redacted:field]");
      expect(redacted.users[2].password).toBe("[redacted:field]");
      
      // PII patterns in string arrays should be redacted
      expect(redacted.messages[0]).toContain("[redacted:email]");
      expect(redacted.messages[1]).toContain("[redacted:phone]");
      expect(redacted.messages[2]).toContain("[redacted:password]");
    });
  });

  describe("Step 2: Retention job validation", () => {
    it("should handle log retention metadata safely", () => {
      const retentionData = {
        logId: "log123",
        createdAt: "2024-01-01T00:00:00Z",
        archivedAt: "2025-01-01T00:00:00Z",
        retentionPeriod: 365,
        archived: true,
        // PII that should be redacted
        userEmail: "user@example.com",
        adminEmail: "admin@example.com"
      };

      const redacted = safePayload(retentionData);
      
      // Safe retention fields should be preserved
      expect(redacted.logId).toBe("log123");
      expect(redacted.createdAt).toBe("2024-01-01T00:00:00Z");
      expect(redacted.archivedAt).toBe("2025-01-01T00:00:00Z");
      expect(redacted.retentionPeriod).toBe(365);
      expect(redacted.archived).toBe(true);
      
      // PII should be redacted
      expect(redacted.userEmail).toBe("[redacted:field]");
      expect(redacted.adminEmail).toBe("[redacted:field]");
    });
  });

  describe("Step 3: Rate limits and cookies validation", () => {
    it("should handle rate limiting data safely", () => {
      const rateLimitData = {
        // Safe rate limiting fields
        requestCount: 5,
        limit: 10,
        remaining: 5,
        resetTime: Date.now(),
        windowMs: 60000,
        // PII that should be redacted
        userEmail: "user@example.com",
        ipAddress: "192.168.1.1", // This might be considered PII
        userAgent: "Mozilla/5.0..."
      };

      const redacted = safePayload(rateLimitData);
      
      // Safe rate limiting fields should be preserved
      expect(redacted.requestCount).toBe(5);
      expect(redacted.limit).toBe(10);
      expect(redacted.remaining).toBe(5);
      expect(redacted.resetTime).toBe(rateLimitData.resetTime);
      expect(redacted.windowMs).toBe(60000);
      
      // PII should be redacted
      expect(redacted.userEmail).toBe("[redacted:field]");
      // Note: IP and user agent are not currently in our PII patterns
      // This might need to be added based on privacy requirements
    });

    it("should handle cookie data safely", () => {
      const cookieData = {
        // Safe cookie fields
        cookieName: "session",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: 86400,
        // PII that should be redacted
        sessionToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        userEmail: "user@example.com"
      };

      const redacted = safePayload(cookieData);
      
      // Safe cookie fields should be preserved
      expect(redacted.cookieName).toBe("session");
      expect(redacted.httpOnly).toBe(true);
      expect(redacted.secure).toBe(true);
      expect(redacted.sameSite).toBe("Lax");
      expect(redacted.maxAge).toBe(86400);
      
      // PII should be redacted
      expect(redacted.sessionToken).toBe("[redacted:field]");
      expect(redacted.userEmail).toBe("[redacted:field]");
    });
  });

  describe("Comprehensive PII coverage", () => {
    it("should cover all mandated PII types from WORKER_SECURITY_QA_ENGINEER", () => {
      const comprehensiveData = {
        // Mixed-case field names
        Password: "supersecret",
        EMAIL: "user@example.com",
        Phone: "+420 123 456 789",
        
        // Nested arrays/objects
        users: [
          {
            profile: {
              name: "John Doe",
              email: "john@example.com",
              phone: "+420 123 456 789"
            },
            credentials: {
              password: "secret123",
              token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
            }
          }
        ],
        
        // Czech phone formats
        phone1: "+420 123 456 789",
        phone2: "420123456789",
        phone3: "123 456 789",
        phone4: "123-456-789",
        phone5: "123.456.789",
        
        // Emails in free text
        message: "Contact user@example.com for details",
        note: "Send to admin@school.cz and support@edurpg.com",
        
        // Circular references (handled by redactPII)
        circular: null as any
      };

      // Create circular reference
      comprehensiveData.circular = comprehensiveData;

      const redacted = safePayload(comprehensiveData);
      
      // All PII should be redacted
      expect(redacted.Password).toBe("[redacted:field]");
      expect(redacted.EMAIL).toBe("[redacted:field]");
      expect(redacted.Phone).toBe("[redacted:field]");
      
      expect(redacted.users[0].profile.email).toBe("[redacted:field]");
      expect(redacted.users[0].profile.phone).toBe("[redacted:field]");
      expect(redacted.users[0].credentials.password).toBe("[redacted:field]");
      expect(redacted.users[0].credentials.token).toBe("[redacted:field]");
      
      expect(redacted.phone1).toBe("[redacted:field]");
      expect(redacted.phone2).toBe("[redacted:field]");
      expect(redacted.phone3).toBe("[redacted:field]");
      expect(redacted.phone4).toBe("[redacted:field]");
      expect(redacted.phone5).toBe("[redacted:field]");
      
      expect(redacted.message).toContain("[redacted:email]");
      expect(redacted.note).toContain("[redacted:email]");
      
      expect(redacted.circular).toBe("[redacted:circular]");
    });
  });
});
