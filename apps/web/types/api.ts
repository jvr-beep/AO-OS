export type Role = 'front_desk' | 'operations' | 'admin'

export interface StaffUser {
  id: string
  email: string
  fullName: string
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Member {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  profileNotes?: string
  createdAt: string
  updatedAt: string
}

export interface MembershipPlan {
  id: string
  name: string
  billingCycleMonths: number
  price: string
  currency: string
  maxSubscriptions?: number
  isActive: boolean
  createdAt: string
}

export interface Subscription {
  id: string
  memberId: string
  membershipPlanId: string
  status: string
  startDate: string
  renewalDate?: string
  endDate?: string
  membershipPlan?: MembershipPlan
  createdAt: string
  updatedAt: string
}

export interface Wristband {
  id: string
  uid: string
  status: 'inventory' | 'assigned' | 'retired'
  memberId?: string
  createdAt: string
  updatedAt: string
}

export interface Locker {
  id: string
  code: string
  status: 'available' | 'occupied' | 'maintenance'
  currentOccupant?: {
    memberId: string
    memberName: string
    assignedAt: string
    wristbandAssignmentId: string
  }
  createdAt: string
  updatedAt: string
}

export interface LockerAccessEvent {
  id: string
  lockerId: string
  wristbandId?: string
  memberId?: string
  eventType: string
  occurredAt: string
  sourceReference?: string
  createdAt: string
}

export interface MemberAccountEntry {
  id: string
  memberId: string
  entryType: 'charge' | 'credit' | 'refund' | 'payment'
  amount: string
  currency: string
  description?: string
  status: 'posted' | 'voided'
  sourceType: string
  sourceReference?: string
  occurredAt: string
  createdAt: string
}

export interface MemberAccountSummary {
  memberId: string
  currency: string
  balance: string
  postedChargeTotal: string
  postedCreditTotal: string
  postedPaymentTotal: string
  postedRefundTotal: string
}

export interface AuditEvent {
  id: string
  staffUserId: string
  staffUser?: Pick<StaffUser, 'id' | 'fullName' | 'email'>
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}
