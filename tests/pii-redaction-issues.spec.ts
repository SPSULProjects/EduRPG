// tests/pii-redaction-issues.spec.ts
// Test to identify specific PII redaction issues mentioned in job description
import { describe, it, expect } from "vitest";
import { redactPII, safePayload } from "@/src/lib/security/redact";

describe("PII Redaction Issues Analysis", () => {
  describe("Issue 1: Fix regex patterns for phone numbers and passwords", () => {
    it("should properly handle Czech phone number formats", () => {
      const testCases = [
        "+420 123 456 789",     // Standard format with spaces
        "+420123456789",        // No spaces
        "420 123 456 789",      // Without + prefix
        "420123456789",         // Without + prefix and spaces
        "123 456 789",          // Local format
        "123-456-789",          // With dashes
        "123.456.789",          // With dots
        "+420-123-456-789",     // Mixed separators
        "+420.123.456.789"      // Mixed separators
      ];

      testCases.forEach(phone => {
        const input = { contactInfo: phone };
        const result: any = redactPII(input);
        
        // Should redact the phone number in the string
        expect(result.contactInfo).toContain("[redacted:phone]");
      });
    });

    it("should properly handle password patterns", () => {
      const testCases = [
        "password: secret123",
        "pwd=mysecret",
        "pass: supersecret",
        "Password: MySecret123!",
        "PWD=admin123",
        "PASS: testpass"
      ];

      testCases.forEach(text => {
        const input = { note: text };
        const result: any = redactPII(input);
        
        // Should redact password patterns in strings
        expect(result.note).toContain("[redacted:");
      });
    });
  });

  describe("Issue 2: Correct object processing logic for nested structures", () => {
    it("should handle deeply nested objects correctly", () => {
      const input = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  email: "deep@example.com",
                  password: "deepsecret",
                  phone: "+420 111 222 333"
                }
              }
            }
          }
        }
      };

      const result: any = redactPII(input);
      
      // Should redact PII at all levels
      expect(result.level1.level2.level3.level4.level5.email).toBe("[redacted:field]");
      expect(result.level1.level2.level3.level4.level5.password).toBe("[redacted:field]");
      expect(result.level1.level2.level3.level4.level5.phone).toBe("[redacted:field]");
    });

    it("should handle arrays of objects with PII", () => {
      const input = {
        users: [
          { email: "user1@example.com", password: "pass1" },
          { email: "user2@example.com", password: "pass2" },
          { email: "user3@example.com", password: "pass3" }
        ]
      };

      const result: any = redactPII(input);
      
      // Should redact PII in all array elements
      expect(result.users[0].email).toBe("[redacted:field]");
      expect(result.users[0].password).toBe("[redacted:field]");
      expect(result.users[1].email).toBe("[redacted:field]");
      expect(result.users[1].password).toBe("[redacted:field]");
      expect(result.users[2].email).toBe("[redacted:field]");
      expect(result.users[2].password).toBe("[redacted:field]");
    });
  });

  describe("Issue 3: Update field redaction rules to preserve safe fields like 'count'", () => {
    it("should preserve safe fields like 'count'", () => {
      const input = {
        count: 42,
        totalCount: 100,
        userCount: 25,
        email: "test@example.com",
        password: "secret"
      };

      const result: any = redactPII(input);
      
      // Safe fields should be preserved
      expect(result.count).toBe(42);
      expect(result.totalCount).toBe(100);
      expect(result.userCount).toBe(25);
      
      // PII fields should be redacted
      expect(result.email).toBe("[redacted:field]");
      expect(result.password).toBe("[redacted:field]");
    });

    it("should preserve other safe fields", () => {
      const input = {
        id: "user123",
        status: "active",
        level: 5,
        score: 95.5,
        active: true,
        tags: ["admin", "verified"],
        email: "test@example.com"
      };

      const result: any = redactPII(input);
      
      // Safe fields should be preserved
      expect(result.id).toBe("user123");
      expect(result.status).toBe("active");
      expect(result.level).toBe(5);
      expect(result.score).toBe(95.5);
      expect(result.active).toBe(true);
      expect(result.tags).toEqual(["admin", "verified"]);
      
      // PII fields should be redacted
      expect(result.email).toBe("[redacted:field]");
    });
  });

  describe("Issue 4: Implement recursive processing for nested objects and arrays", () => {
    it("should recursively process complex nested structures", () => {
      const input = {
        data: {
          users: [
            {
              profile: {
                personal: {
                  email: "user1@example.com",
                  phone: "+420 123 456 789"
                },
                settings: {
                  theme: "dark",
                  notifications: true
                }
              },
              credentials: {
                password: "secret123",
                token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
              }
            }
          ],
          metadata: {
            admin: {
              email: "admin@example.com",
              secret: "adminsecret"
            }
          }
        }
      };

      const result: any = redactPII(input);
      
      // Should recursively redact PII at all levels
      expect(result.data.users[0].profile.personal.email).toBe("[redacted:field]");
      expect(result.data.users[0].profile.personal.phone).toBe("[redacted:field]");
      expect(result.data.users[0].credentials.password).toBe("[redacted:field]");
      expect(result.data.users[0].credentials.token).toBe("[redacted:field]");
      expect(result.data.metadata.admin.email).toBe("[redacted:field]");
      expect(result.data.metadata.admin.secret).toBe("[redacted:field]");
      
      // Should preserve non-PII data
      expect(result.data.users[0].profile.settings.theme).toBe("dark");
      expect(result.data.users[0].profile.settings.notifications).toBe(true);
    });
  });

  describe("Issue 5: Fix false positive redactions", () => {
    it("should not redact legitimate field names that contain PII keywords", () => {
      const input = {
        // These should NOT be redacted (false positives)
        userCount: 25,
        totalUsers: 100,
        userList: ["user1", "user2"],
        userName: "john_doe", // This might be PII, but let's test the pattern
        userRole: "admin",
        userStatus: "active",
        userLevel: 5,
        userScore: 95.5,
        
        // These SHOULD be redacted
        email: "test@example.com",
        password: "secret",
        phone: "+420 123 456 789"
      };

      const result: any = redactPII(input);
      
      // Safe fields should be preserved
      expect(result.userCount).toBe(25);
      expect(result.totalUsers).toBe(100);
      expect(result.userList).toEqual(["user1", "user2"]);
      expect(result.userRole).toBe("admin");
      expect(result.userStatus).toBe("active");
      expect(result.userLevel).toBe(5);
      expect(result.userScore).toBe(95.5);
      
      // PII fields should be redacted
      expect(result.email).toBe("[redacted:field]");
      expect(result.password).toBe("[redacted:field]");
      expect(result.phone).toBe("[redacted:field]");
    });

    it("should not redact legitimate content that looks like PII", () => {
      const input = {
        // These should NOT be redacted (false positives)
        message: "The user count is 25",
        description: "This is a test message",
        note: "Contact support for help",
        title: "User Management System",
        
        // These SHOULD be redacted
        email: "test@example.com",
        phone: "+420 123 456 789"
      };

      const result: any = redactPII(input);
      
      // Safe content should be preserved
      expect(result.message).toBe("The user count is 25");
      expect(result.description).toBe("This is a test message");
      expect(result.note).toBe("Contact support for help");
      expect(result.title).toBe("User Management System");
      
      // PII fields should be redacted
      expect(result.email).toBe("[redacted:field]");
      expect(result.phone).toBe("[redacted:field]");
    });
  });

  describe("Issue 6: T13 compliance validation", () => {
    it("should ensure no PII leaks into SystemLog payload", () => {
      const sensitiveData = {
        email: "user@example.com",
        password: "secret123",
        phone: "+420 123 456 789",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        creditCard: "4111 1111 1111 1111",
        ssn: "123456789",
        address: "123 Main St, Prague"
      };

      const redacted = safePayload(sensitiveData);
      
      // All PII should be redacted
      expect(redacted).toEqual({
        email: "[redacted:field]",
        password: "[redacted:field]",
        phone: "[redacted:field]",
        token: "[redacted:field]",
        creditCard: "[redacted:field]",
        ssn: "[redacted:field]",
        address: "[redacted:field]"
      });
    });

    it("should preserve safe fields for logging", () => {
      const logData = {
        userId: "user123",
        requestId: "req456",
        level: "INFO",
        timestamp: "2024-01-01T00:00:00Z",
        count: 42,
        duration: 150,
        status: "success",
        error: null,
        email: "user@example.com", // Should be redacted
        password: "secret" // Should be redacted
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
      
      // PII fields should be redacted
      expect(redacted.email).toBe("[redacted:field]");
      expect(redacted.password).toBe("[redacted:field]");
    });
  });
});
