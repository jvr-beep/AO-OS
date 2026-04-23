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
  publicMemberNumber?: string
  staffSafeDisplayName: string
  alias?: string | null
  email: string
  phone?: string | null
  status?: string
  profileNotes?: string
  createdAt: string
  updatedAt?: string
  activeSubscription?: { planName: string; planId: string; status: string } | null
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
  status:
    | 'inventory'
    | 'assigned'
    | 'retired'
    | 'pending_activation'
    | 'active'
    | 'suspended'
    | 'replaced'
  memberId?: string
  locationId?: string | null
  homeLocationId?: string | null
  globalAccessFlag?: boolean
  issuedAt?: string
  activatedAt?: string | null
  suspendedAt?: string | null
  replacedFromWristbandId?: string | null
  lastSeenLocationId?: string | null
  lastSeenAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface Locker {
  id: string
  code: string
  locationId?: string
  vendorLockId?: string
  zoneId?: string
  bankId?: string
  wallId?: string
  lockerLabel?: string
  lockerSize?: string
  lockerType?: string
  isAccessible: boolean
  isWetAreaRated: boolean
  hasPower: boolean
  tierClass?: string
  supportsDayUse: boolean
  supportsAssignedUse: boolean
  active: boolean
  status:
    | 'available'
    | 'reserved'
    | 'occupied'
    | 'out_of_service'
    | 'cleaning'
    | 'maintenance'
    | 'offline'
    | 'forced_open'
    | 'assigned'
  activeAssignmentId?: string
  assignedMemberId?: string
  wristbandAssignmentId?: string
  assignedAt?: string
  createdAt: string
  updatedAt: string
}

export interface LockerAccessEvent {
  id: string
  lockerId: string
  wristbandId?: string
  memberId?: string
  decision?: 'allowed' | 'denied'
  denialReasonCode?: string
  eventType: string
  occurredAt: string
  sourceReference?: string
  createdAt: string
}

export interface LockerPolicyDecision {
  decision: 'allow' | 'deny'
  reasonCode: string
  eligibleLockerIds: string[]
  chosenLockerId?: string
  assignmentMode: 'day_use_shared' | 'assigned' | 'premium' | 'staff_override'
  policySnapshot: Record<string, unknown>
}

export interface LockerAssignment {
  id: string
  lockerId: string
  memberId: string
  visitSessionId?: string
  wristbandAssignmentId?: string
  assignmentMode: 'day_use_shared' | 'assigned' | 'premium' | 'staff_override'
  assignedByStaffUserId?: string
  assignedAt: string
  unassignedAt?: string
  unassignedReason?: string
  active: boolean
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

export interface FloorPlanArea {
  id: string
  floorPlanId: string
  code: string
  name: string
  areaType: 'room' | 'corridor' | 'entry' | 'service' | 'bath' | 'lounge' | 'locker_bank'
  x: string
  y: string
  width: string
  height: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface FloorPlan {
  id: string
  locationId: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
  areas: FloorPlanArea[]
}

export interface Room {
  id: string
  locationId: string
  floorPlanAreaId: string
  code: string
  name: string
  roomType: 'private' | 'premium_private' | 'retreat' | 'ritual' | 'accessible' | 'couples_reserved_future'
  privacyLevel: 'standard' | 'high' | 'premium'
  status: 'available' | 'booked' | 'occupied' | 'cleaning' | 'out_of_service' | 'maintenance'
  active: boolean
  bookable: boolean
  cleaningRequired: boolean
  lastTurnedAt?: string
  createdAt: string
  updatedAt: string
}

export interface RoomBooking {
  id: string
  memberId: string
  roomId: string
  bookingType: 'restore' | 'release' | 'retreat'
  status: 'reserved' | 'checked_in' | 'checked_out' | 'expired' | 'cancelled' | 'no_show' | 'waitlisted'
  startsAt: string
  endsAt: string
  sourceType: 'membership_credit' | 'upgrade_credit' | 'one_time_purchase' | 'manual_staff' | 'package_credit'
  sourceReference?: string
  waitlistPriority: number
  checkedInAt?: string
  checkedOutAt?: string
  createdAt: string
  updatedAt: string
}

export interface RoomAccessEvent {
  id: string
  bookingId?: string
  roomId: string
  memberId?: string
  wristbandId?: string
  decision: 'allowed' | 'denied' | 'error'
  denialReasonCode?: string
  eventType: 'unlock' | 'lock' | 'open' | 'close' | 'check_in_gate' | 'check_out_gate'
  occurredAt: string
  sourceType: 'wristband_reader' | 'staff_console' | 'system'
  sourceReference?: string
  createdAt: string
}

export interface Guest {
  id: string
  firstName: string
  lastName?: string | null
  phone?: string | null
  email?: string | null
  dateOfBirth?: string | null
  preferredLanguage: string
  membershipStatus: string
  riskFlagStatus: string
  riskFlagReason?: string | null
  riskFlaggedAt?: string | null
  riskFlaggedBy?: string | null
  marketingOptIn: boolean
  createdAt: string
  updatedAt: string
  version: number
}

export interface GuestBooking {
  id: string
  guest_id: string
  booking_code: string
  status: 'reserved' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show'
  booking_channel: 'web' | 'kiosk' | 'staff'
  product_type: string
  tier_id?: string | null
  duration_minutes?: number | null
  balance_due_cents: number
  arrival_window_start?: string | null
  arrival_window_end?: string | null
  created_at: string
  updated_at: string
  version: number
}

export interface GuestVisit {
  id: string
  guest_id: string
  guest_name?: string | null
  guest_email?: string | null
  tier_name?: string | null
  tier_code?: string | null
  booking_id?: string | null
  source_type: string
  product_type: string
  tier_id?: string | null
  visit_mode?: string | null
  duration_minutes?: number | null
  status: string
  payment_status: string
  check_in_channel: string
  check_out_channel?: string | null
  assigned_resource_id?: string | null
  start_time?: string | null
  scheduled_end_time?: string | null
  actual_end_time?: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface FolioLineItem {
  id: string
  line_type: string
  reference_code?: string | null
  description: string
  quantity: number
  unit_amount_cents: number
  total_amount_cents: number
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface FolioPayment {
  id: string
  payment_provider: string
  transaction_type: string
  amount_cents: number
  status: string
  created_at: string
}

export interface Folio {
  id: string
  visit_id: string
  balance_due_cents: number
  total_due_cents: number
  amount_paid_cents: number
  subtotal_cents: number
  payment_status: string
  line_items: FolioLineItem[]
  payment_transactions: FolioPayment[]
  created_at: string
  updated_at: string
}

export interface Tier {
  id: string
  code: string
  name: string
  active: boolean
  productType: string
}

export interface CleaningTask {
  id: string
  roomId: string
  bookingId?: string
  taskType: 'turnover' | 'deep_clean' | 'inspection'
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  isUrgent: boolean
  createdAt: string
  startedAt?: string
  completedAt?: string
  assignedToStaffUserId?: string
  notes?: string
}
