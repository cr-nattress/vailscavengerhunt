/**
 * Tests for PII redaction functionality
 * US-007: Add testing and QA
 */

import { describe, it, expect } from 'vitest'
import { redactPII, createSentryPIIRedactor } from '../piiRedaction.js'

describe('PII Redaction', () => {
  describe('redactPII', () => {
    it('should redact email addresses', () => {
      const data = { email: 'user@example.com', message: 'Contact me at test@email.com' }
      const result = redactPII(data)

      expect(result.email).toBe('[PII_REDACTED]')
      expect(result.message).toBe('Contact me at [EMAIL_REDACTED]')
    })

    it('should redact phone numbers', () => {
      const data = { phone: '+1-555-123-4567', text: 'Call me at 555-987-6543' }
      const result = redactPII(data)

      expect(result.phone).toBe('[PII_REDACTED]')
      expect(result.text).toBe('Call me at [PHONE_REDACTED]')
    })

    it('should redact SSN numbers', () => {
      const data = { ssn: '123-45-6789', note: 'SSN: 987654321' }
      const result = redactPII(data)

      expect(result.ssn).toBe('[PII_REDACTED]')
      expect(result.note).toBe('SSN: [SSN_REDACTED]')
    })

    it('should redact credit card numbers', () => {
      const data = {
        card: '4532 1234 5678 9012',
        payment: 'Use card 5555-5555-5555-4444'
      }
      const result = redactPII(data)

      expect(result.card).toBe('[CREDITCARD_REDACTED]')
      expect(result.payment).toBe('Use card [CREDITCARD_REDACTED]')
    })

    it('should redact sensitive field names', () => {
      const data = {
        password: 'secret123',
        token: 'abc123token',
        apiKey: 'sk-1234567890',
        secret: 'topsecret',
        authorization: 'Bearer token123'
      }
      const result = redactPII(data)

      expect(result.password).toBe('[PII_REDACTED]')
      expect(result.token).toBe('[PII_REDACTED]')
      expect(result.apiKey).toBe('[PII_REDACTED]')
      expect(result.secret).toBe('[PII_REDACTED]')
      expect(result.authorization).toBe('[PII_REDACTED]')
    })

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'user@test.com',
          profile: {
            phone: '555-1234',
            password: 'secret'
          }
        }
      }
      const result = redactPII(data)

      expect(result.user.email).toBe('[PII_REDACTED]')
      expect(result.user.profile.phone).toBe('[PII_REDACTED]')
      expect(result.user.profile.password).toBe('[PII_REDACTED]')
    })

    it('should handle arrays', () => {
      const data = {
        contacts: ['test1@example.com', 'test2@example.com'],
        users: [
          { contact: 'user1@test.com' },
          { contact: 'user2@test.com' }
        ]
      }
      const result = redactPII(data)

      expect(result.contacts).toEqual(['[EMAIL_REDACTED]', '[EMAIL_REDACTED]'])
      expect(result.users[0].contact).toBe('[EMAIL_REDACTED]')
      expect(result.users[1].contact).toBe('[EMAIL_REDACTED]')
    })

    it('should truncate large strings', () => {
      const largeObject = { content: 'x'.repeat(5001) }
      const result = redactPII(largeObject)

      expect(typeof result.content).toBe('string')
      expect(result.content).toBe('[LARGE_STRING_REDACTED]')
    })

    it('should preserve non-sensitive data', () => {
      const data = {
        age: 30,
        department: 'Engineering',
        isActive: true,
        score: 95.5
      }
      const result = redactPII(data)

      expect(result).toEqual(data)
    })

    it('should handle null and undefined values', () => {
      const data = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zero: 0,
        false: false
      }
      const result = redactPII(data)

      expect(result).toEqual(data)
    })
  })

  describe('createSentryPIIRedactor', () => {
    it('should create a function that redacts PII for Sentry', () => {
      const redactor = createSentryPIIRedactor()
      const event = {
        user: { email: 'user@test.com' },
        extra: {
          phone: '555-1234',
          message: 'User registered with test@example.com'
        }
      }

      const result = redactor(event)

      expect(result.user.email).toBe('[USER_PII_REDACTED]')
      expect(result.extra.phone).toBe('[PII_REDACTED]')
      expect(result.extra.message).toBe('User registered with [EMAIL_REDACTED]')
    })

    it('should handle events without PII', () => {
      const redactor = createSentryPIIRedactor()
      const event = {
        message: 'Application started',
        level: 'info',
        timestamp: '2023-01-01T00:00:00Z'
      }

      const result = redactor(event)
      expect(result).toEqual(event)
    })
  })
})