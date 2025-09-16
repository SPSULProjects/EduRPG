import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { 
  asHttpError, 
  createSuccessResponse, 
  HTTP_ERROR_CODES,
  withErrorEnvelope 
} from '../error'

describe('Error Envelope', () => {
  describe('asHttpError', () => {
    it('should map Zod validation errors to 422', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number'
        }
      ])
      
      const result = asHttpError(zodError, 'test-request-id')
      
      expect(result.status).toBe(422)
      expect(result.response).toEqual({
        ok: false,
        code: HTTP_ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        requestId: 'test-request-id',
        details: zodError.errors
      })
    })

    it('should map authentication errors to 401', () => {
      const authError = new Error('Unauthorized access')
      
      const result = asHttpError(authError, 'test-request-id')
      
      expect(result.status).toBe(401)
      expect(result.response).toEqual({
        ok: false,
        code: HTTP_ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required',
        requestId: 'test-request-id'
      })
    })

    it('should map authorization errors to 403', () => {
      const authError = new Error('Access denied')
      
      const result = asHttpError(authError, 'test-request-id')
      
      expect(result.status).toBe(403)
      expect(result.response).toEqual({
        ok: false,
        code: HTTP_ERROR_CODES.FORBIDDEN,
        message: 'Access denied',
        requestId: 'test-request-id'
      })
    })

    it('should map not found errors to 404', () => {
      const notFoundError = new Error('User not found')
      
      const result = asHttpError(notFoundError, 'test-request-id')
      
      expect(result.status).toBe(404)
      expect(result.response).toEqual({
        ok: false,
        code: HTTP_ERROR_CODES.NOT_FOUND,
        message: 'User not found',
        requestId: 'test-request-id'
      })
    })

    it('should map conflict errors to 409', () => {
      const conflictError = new Error('User already exists')
      
      const result = asHttpError(conflictError, 'test-request-id')
      
      expect(result.status).toBe(409)
      expect(result.response).toEqual({
        ok: false,
        code: HTTP_ERROR_CODES.CONFLICT,
        message: 'User already exists',
        requestId: 'test-request-id'
      })
    })

    it('should map rate limit errors to 429', () => {
      const rateLimitError = new Error('Rate limit exceeded')
      
      const result = asHttpError(rateLimitError, 'test-request-id')
      
      expect(result.status).toBe(429)
      expect(result.response).toEqual({
        ok: false,
        code: HTTP_ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        requestId: 'test-request-id'
      })
    })

    it('should map budget/constraint errors to 400', () => {
      const budgetError = new Error('Insufficient funds')
      
      const result = asHttpError(budgetError, 'test-request-id')
      
      expect(result.status).toBe(400)
      expect(result.response).toEqual({
        ok: false,
        code: HTTP_ERROR_CODES.BAD_REQUEST,
        message: 'Insufficient funds',
        requestId: 'test-request-id'
      })
    })

    it('should map unknown errors to 500', () => {
      const unknownError = 'Some unknown error'
      
      const result = asHttpError(unknownError, 'test-request-id')
      
      expect(result.status).toBe(500)
      expect(result.response).toEqual({
        ok: false,
        code: HTTP_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        requestId: 'test-request-id'
      })
    })
  })

  describe('createSuccessResponse', () => {
    it('should create a standardized success response', () => {
      const data = { id: '123', name: 'Test' }
      const requestId = 'test-request-id'
      
      const result = createSuccessResponse(data, requestId)
      
      expect(result).toEqual({
        ok: true,
        data,
        requestId
      })
    })

    it('should create success response without requestId', () => {
      const data = { id: '123', name: 'Test' }
      
      const result = createSuccessResponse(data)
      
      expect(result).toEqual({
        ok: true,
        data,
        requestId: undefined
      })
    })
  })

  describe('withErrorEnvelope', () => {
    it('should wrap successful handler results', async () => {
      const handler = async () => ({ success: true, data: 'test' })
      const wrappedHandler = withErrorEnvelope(handler)
      
      const result = await wrappedHandler()
      
      expect(result).toBeInstanceOf(Response)
      const json = await result.json()
      expect(json).toEqual({
        ok: true,
        data: { success: true, data: 'test' },
        requestId: undefined
      })
    })

    it('should wrap errors in standardized envelope', async () => {
      const handler = async () => {
        throw new Error('Test error')
      }
      const wrappedHandler = withErrorEnvelope(handler)
      
      const result = await wrappedHandler()
      
      expect(result).toBeInstanceOf(Response)
      const json = await result.json()
      expect(json).toEqual({
        ok: false,
        code: HTTP_ERROR_CODES.BAD_REQUEST,
        message: 'Test error',
        requestId: undefined
      })
    })

    it('should preserve Response objects', async () => {
      const handler = async () => new Response('Custom response', { status: 201 })
      const wrappedHandler = withErrorEnvelope(handler)
      
      const result = await wrappedHandler()
      
      expect(result).toBeInstanceOf(Response)
      // The wrapper converts Response to NextResponse preserving status
      expect(result.status).toBe(201)
      expect(await result.text()).toBe('Custom response')
    })
  })
})
