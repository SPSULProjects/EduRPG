import { useState, useCallback, useRef } from "react"

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface ApiOptions {
  retries?: number
  retryDelay?: number
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

export function useApi<T = unknown>(
  initialData: T | null = null,
  options: ApiOptions = {}
) {
  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
  })

  const retryCountRef = useRef(0)
  const { retries = 3, retryDelay = 1000, onSuccess, onError } = options

  const execute = useCallback(
    async (apiCall: () => Promise<T>): Promise<T | null> => {
      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const result = await apiCall()
        setState({ data: result, loading: false, error: null })
        retryCountRef.current = 0
        onSuccess?.(result)
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        
        if (retryCountRef.current < retries) {
          retryCountRef.current++
          setTimeout(() => {
            execute(apiCall)
          }, retryDelay * retryCountRef.current)
          return null
        }

        setState(prev => ({ ...prev, loading: false, error: errorMessage }))
        onError?.(error instanceof Error ? error : new Error(errorMessage))
        return null
      }
    },
    [retries, retryDelay, onSuccess, onError]
  )

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null })
    retryCountRef.current = 0
  }, [initialData])

  return {
    ...state,
    execute,
    reset,
    retry: () => {
      retryCountRef.current = 0
    },
  }
}

export function useApiMutation<T = unknown, P = unknown>(
  mutationFn: (params: P) => Promise<T>,
  options: ApiOptions = {}
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const { onSuccess, onError } = options

  const mutate = useCallback(
    async (params: P): Promise<T | null> => {
      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const result = await mutationFn(params)
        setState({ data: result, loading: false, error: null })
        onSuccess?.(result)
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        setState(prev => ({ ...prev, loading: false, error: errorMessage }))
        onError?.(error instanceof Error ? error : new Error(errorMessage))
        return null
      }
    },
    [mutationFn, onSuccess, onError]
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    mutate,
    reset,
  }
}
