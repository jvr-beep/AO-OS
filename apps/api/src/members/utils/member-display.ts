/**
 * AO-OS privacy rule: legal name (firstName/lastName) must never appear on
 * staff-facing operational surfaces by default.
 *
 * Precedence: alias > preferredName (from profile) > displayName > member number fragment
 *
 * Legal name is only accessible via the restricted /members/:id/legal-identity
 * endpoint (admin role only, audit logged).
 */

export interface MemberDisplayFields {
  publicMemberNumber: string;
  alias?: string | null;
  displayName?: string | null;
  profile?: { preferredName?: string | null } | null;
}

export function resolveDisplayName(member: MemberDisplayFields): string {
  if (member.alias?.trim()) return member.alias.trim();
  if (member.profile?.preferredName?.trim()) return member.profile.preferredName.trim();
  if (member.displayName?.trim()) return member.displayName.trim();
  // Safe fallback: last 6 chars of member number — identifiable to staff, never legal name
  return `Member …${member.publicMemberNumber.slice(-6)}`;
}
