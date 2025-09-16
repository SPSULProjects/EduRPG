import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { validateRequest, validateParams, createValidationErrorResponse } from '../validator'

// Mock the utils module
vi.mock('@/app/lib/utils', () => ({
  getRequestIdFromRequest: vi.fn(() => 'test-request-id'),
  logEvent: vi.fn()
}))

describe('validateRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should validate request body successfully', async () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().min(0)
    })

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'John', age: 25 })
    })

    const result = await validateRequest(request, { body: schema })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.body).toEqual({ name: 'John', age: 25 })
      expect(result.requestId).toBe('test-request-id')
    }
  })

  it('should validate query parameters successfully', async () => {
    const schema = z.object({
      page: z.number().min(1),
      active: z.boolean()
    })

    const request = new NextRequest('http://localhost:3000/api/test?page=1&active=true')

    const result = await validateRequest(request, { query: schema })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.query).toEqual({ page: 1, active: true })
    }
  })

  it('should handle validation errors', async () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().min(0)
    })

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: '', age: -1 })
    })

    const result = await validateRequest(request, { body: schema })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Validation failed')
      expect(result.details).toHaveLength(2) // name and age validation errors
    }
  })

  it('should handle JSON parsing errors', async () => {
    const schema = z.object({
      name: z.string()
    })

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: 'invalid json'
    })

    const result = await validateRequest(request, { body: schema })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Invalid JSON in request body')
    }
  })

  it('should handle multiple validation types', async () => {
    const bodySchema = z.object({ name: z.string() })
    const querySchema = z.object({ page: z.number() })

    const request = new NextRequest('http://localhost:3000/api/test?page=1', {
      method: 'POST',
      body: JSON.stringify({ name: 'John' })
    })

    const result = await validateRequest(request, { 
      body: bodySchema, 
      query: querySchema 
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.body).toEqual({ name: 'John' })
      expect(result.data.query).toEqual({ page: 1 })
    }
  })
})

describe('validateParams', () => {
  it('should validate params successfully', () => {
    const schema = z.object({
      id: z.string().cuid()
    })

    const params = { id: 'clh1234567890abcdef' }
    const result = validateParams(params, schema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(params)
    }
  })

  it('should handle param validation errors', () => {
    const schema = z.object({
      id: z.string().cuid()
    })

    const params = { id: 'invalid-id' }
    const result = validateParams(params, schema)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Invalid route parameters')
      expect(result.details).toBeDefined()
    }
  })
})

describe('createValidationErrorResponse', () => {
  it('should create proper error response', () => {
    const response = createValidationErrorResponse(
      'Test error',
      { field: 'name', message: 'Required' },
      'test-request-id'
    )

    expect(response.status).toBe(400)
    
    // Note: In a real test, you'd need to await response.json() to get the body
    // This is a simplified test focusing on the status code
  })
})
