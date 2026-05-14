export const DB_SCHEMA = process.env.EGGDROP_DB_SCHEMA || 'eggdrop'

export const GAME_PHASES = {
  SETUP: 'setup',
  BUDGET_OFFER: 'budget_offer',
  BUILD: 'build',
  TRADING: 'trading',
  SUBMISSION: 'submission',
  DROP_TEST: 'drop_test',
  SCORING: 'scoring',
  FINAL: 'final',
  ABORTED: 'aborted'
} as const

export type GamePhase = typeof GAME_PHASES[keyof typeof GAME_PHASES]

export const EGG_STATUS = {
  INTACT: 'intact',
  HAIRLINE: 'hairline',
  CRACKED: 'cracked',
  BROKEN: 'broken'
} as const

export const SHIELD_STATUS = {
  INTACT: 'intact',
  MINOR: 'minor',
  PARTIAL: 'partial',
  DESTROYED: 'destroyed'
} as const
