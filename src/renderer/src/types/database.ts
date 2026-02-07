export type PlanType = 'none' | 'basic' | 'unlimited'
export type UserRole = 'user' | 'admin'
export type AccountStatus = 'active' | 'inactive' | 'semi_active'
export type BanType = 'permanent' | 'normals_required' | null
export type RentalStatus = 'active' | 'expired' | 'cancelled' | 'force_released'
export type CreditBalanceType = 'subscription' | 'purchased'
export type CreditTransactionType =
  | 'subscription_grant'
  | 'subscription_reset'
  | 'rental_spend'
  | 'package_purchase'
  | 'admin_adjustment'
  | 'refund'
export type PaymentProvider = 'stripe' | 'manual_crypto'
export type PaymentType = 'subscription' | 'credit_package'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type ActivityEventType =
  | 'login'
  | 'logout'
  | 'rental_start'
  | 'rental_end'
  | 'rental_force_release'
  | 'payment_completed'
  | 'plan_change'
  | 'credit_purchase'
  | 'account_login_launched'
  | 'app_closed'
  | 'heartbeat_timeout'
  | 'admin_action'

export type Elo =
  | 'Iron'
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Emerald'
  | 'Diamond'
  | 'Master'
  | 'Grandmaster'
  | 'Challenger'

export type Server =
  | 'NA'
  | 'EUW'
  | 'EUNE'
  | 'LAN'
  | 'LAS'
  | 'BR'
  | 'KR'
  | 'JP'
  | 'OCE'
  | 'TR'
  | 'RU'
  | 'PH'
  | 'SG'
  | 'TW'
  | 'TH'
  | 'VN'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  discord_id: string | null
  subscription_credits: number
  purchased_credits: number
  role: UserRole
  plan_type: PlanType
  plan_expires_at: string | null
  stripe_customer_id: string | null
  last_heartbeat_at: string | null
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  name: string
  riot_username: string
  riot_tag: string
  encrypted_password: string
  server: Server
  elo: Elo
  elo_division: number | null
  lp: number
  status: AccountStatus
  is_banned: boolean
  ban_type: BanType
  puuid: string | null
  current_rental_id: string | null
  last_stats_sync: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Rental {
  id: string
  user_id: string
  account_id: string
  credits_spent: number
  duration_minutes: number
  started_at: string
  expires_at: string
  ended_at: string | null
  status: RentalStatus
}

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  balance_type: CreditBalanceType
  type: CreditTransactionType
  reference_id: string | null
  description: string
  created_at: string
}

export interface Payment {
  id: string
  user_id: string
  provider: PaymentProvider
  provider_payment_id: string | null
  amount_usd: number
  type: PaymentType
  status: PaymentStatus
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface CreditPackage {
  id: string
  name: string
  description: string | null
  credits: number
  price_usd: number
  is_active: boolean
}

export interface ActivityLog {
  id: string
  user_id: string | null
  event_type: ActivityEventType
  metadata: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface AppSetting {
  key: string
  value: Record<string, unknown>
  updated_at: string
}

// View type for accounts list (without encrypted_password)
export interface AccountPublic {
  id: string
  name: string
  riot_username: string
  riot_tag: string
  server: Server
  elo: Elo
  elo_division: number | null
  lp: number
  status: AccountStatus
  is_banned: boolean
  ban_type: BanType
  current_rental_id: string | null
  last_stats_sync: string | null
  created_at: string
  updated_at: string
}
