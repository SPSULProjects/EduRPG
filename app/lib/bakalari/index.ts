/**
 * Bakaláři client exports
 * Centralized exports for easier mocking in tests
 */

export * from './bakalari'

// Re-export interfaces for easier access in tests
export type {
  IBakalariLoginPayload,
  IBakalariUserDataPayload
} from './bakalari'

export {
  BakalariLoginResponse,
  BakalariUserData,
  BakalariLoginStatus,
  BakalariLoginReturn,
  loginToBakalari,
  getBakalariUserData,
  getBakalariSubjectData,
  loginToBakalariAndFetchUserData
} from './bakalari'
