/**
 * Loan business-rule constants. Pulled out here so the seed script and
 * the project book can both reference the same numbers, and so they can
 * be tweaked without hunting through controllers.
 */
export const LOAN_PERIOD_DAYS = 21
export const RENEWAL_DAYS = 14
export const MAX_RENEWALS = 2
export const MAX_ACTIVE_LOANS_PER_READER = 5
