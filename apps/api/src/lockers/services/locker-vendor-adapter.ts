export interface LockerVendorAdapter {
  provisionCredentialToVendor(input: {
    credentialId: string;
    siteId: string;
  }): Promise<void>;

  authorizeCredentialAtSite(input: {
    memberId: string;
    credentialId: string;
    siteId: string;
  }): Promise<void>;

  pushAssignmentToVendor(input: {
    lockerId: string;
    memberId: string;
    sessionId: string;
  }): Promise<void>;

  releaseAssignmentAtVendor(input: {
    lockerId: string;
    sessionId: string;
  }): Promise<void>;

  fetchHardwareState(input: {
    siteId: string;
  }): Promise<Array<Record<string, unknown>>>;

  ingestAccessEvents(input: {
    siteId: string;
    from?: string;
    to?: string;
  }): Promise<Array<Record<string, unknown>>>;
}

export class NoopLockerVendorAdapter implements LockerVendorAdapter {
  async provisionCredentialToVendor(): Promise<void> {}
  async authorizeCredentialAtSite(): Promise<void> {}
  async pushAssignmentToVendor(): Promise<void> {}
  async releaseAssignmentAtVendor(): Promise<void> {}
  async fetchHardwareState(): Promise<Array<Record<string, unknown>>> {
    return [];
  }
  async ingestAccessEvents(): Promise<Array<Record<string, unknown>>> {
    return [];
  }
}
