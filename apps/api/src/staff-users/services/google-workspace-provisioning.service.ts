import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { getWorkspaceDelegatedAccessToken } from "../../email/google-workspace-auth";

type GoogleApiError = Error & { statusCode?: number };

type WorkspaceUserResponse = {
  primaryEmail?: string;
  id?: string;
};

type ProvisionWorkspaceUserInput = {
  primaryEmail: string;
  givenName: string;
  familyName: string;
  fullName: string;
  password: string;
  alias?: string;
};

type WorkspaceUserPatchInput = {
  primaryEmail: string;
  suspended: boolean;
};

const WORKSPACE_USER_SCOPES = [
  "https://www.googleapis.com/auth/admin.directory.user",
  "https://www.googleapis.com/auth/admin.directory.user.alias"
];
const WORKSPACE_ALIAS_SCOPES = ["https://www.googleapis.com/auth/admin.directory.user.alias"];
const ALIAS_RETRY_DELAYS_MS = [2000, 4000, 7000, 10000];

@Injectable()
export class GoogleWorkspaceProvisioningService {
  private readonly clientEmail = process.env.GOOGLE_WORKSPACE_CLIENT_EMAIL?.trim() ?? "";
  private readonly privateKey = (process.env.GOOGLE_WORKSPACE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  private readonly delegatedUser = process.env.GOOGLE_WORKSPACE_DELEGATED_USER?.trim() ?? "";

  shouldManageUser(email: string): boolean {
    return email.trim().toLowerCase().endsWith("@aosanctuary.com");
  }

  async provisionUser(input: ProvisionWorkspaceUserInput): Promise<void> {
    this.ensureConfigured();

    await this.createOrGetWorkspaceUser(input.primaryEmail, {
      primaryEmail: input.primaryEmail,
      name: {
        givenName: input.givenName,
        familyName: input.familyName,
        fullName: input.fullName
      },
      password: input.password,
      orgUnitPath: "/",
      changePasswordAtNextLogin: true
    });

    if (input.alias && input.alias !== input.primaryEmail) {
      await this.createAliasWithRetry(input.primaryEmail, input.alias);
    }
  }

  async setSuspendedState(input: WorkspaceUserPatchInput): Promise<void> {
    this.ensureConfigured();

    try {
      await this.googleJsonFetch<WorkspaceUserResponse>(
        `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(input.primaryEmail)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ suspended: input.suspended })
        },
        ["https://www.googleapis.com/auth/admin.directory.user"]
      );
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : "GOOGLE_WORKSPACE_USER_UPDATE_FAILED"
      );
    }
  }

  private ensureConfigured(): void {
    if (!this.clientEmail || !this.delegatedUser) {
      throw new InternalServerErrorException("GOOGLE_WORKSPACE_NOT_CONFIGURED");
    }
  }

  private async getAccessToken(scopes: string[]): Promise<string> {
    return getWorkspaceDelegatedAccessToken(
      this.clientEmail,
      this.delegatedUser,
      scopes,
      this.privateKey || undefined
    );
  }

  private async googleJsonFetch<T>(url: string, init: RequestInit, scopes: string[]): Promise<T> {
    const accessToken = await this.getAccessToken(scopes);
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });

    if (!response.ok) {
      const body = await response.text();
      const error = new Error(
        `Google API request failed (${response.status}): ${body}`
      ) as GoogleApiError;
      error.statusCode = response.status;
      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async getWorkspaceUser(primaryEmail: string): Promise<WorkspaceUserResponse> {
    return this.googleJsonFetch<WorkspaceUserResponse>(
      `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(primaryEmail)}`,
      { method: "GET" },
      ["https://www.googleapis.com/auth/admin.directory.user"]
    );
  }

  private async createOrGetWorkspaceUser(
    primaryEmail: string,
    userPayload: Record<string, unknown>
  ): Promise<WorkspaceUserResponse> {
    try {
      return await this.googleJsonFetch<WorkspaceUserResponse>(
        "https://admin.googleapis.com/admin/directory/v1/users",
        {
          method: "POST",
          body: JSON.stringify(userPayload)
        },
        WORKSPACE_USER_SCOPES
      );
    } catch (error) {
      if (this.isGoogleApiError(error, 409)) {
        return this.getWorkspaceUser(primaryEmail);
      }

      throw new InternalServerErrorException(
        error instanceof Error ? error.message : "GOOGLE_WORKSPACE_PROVISION_FAILED"
      );
    }
  }

  private async createAliasWithRetry(primaryEmail: string, alias: string): Promise<void> {
    for (let attempt = 0; attempt <= ALIAS_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        await this.googleJsonFetch(
          `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(primaryEmail)}/aliases`,
          {
            method: "POST",
            body: JSON.stringify({ alias })
          },
          WORKSPACE_ALIAS_SCOPES
        );
        return;
      } catch (error) {
        if (this.isGoogleApiError(error, 409)) {
          return;
        }

        const canRetry = this.isGoogleApiError(error, 412, "User creation is not complete.");
        if (!canRetry || attempt === ALIAS_RETRY_DELAYS_MS.length) {
          throw new InternalServerErrorException(
            error instanceof Error ? error.message : "GOOGLE_WORKSPACE_ALIAS_FAILED"
          );
        }

        await this.sleep(ALIAS_RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  private isGoogleApiError(error: unknown, statusCode: number, snippet?: string): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const typedError = error as GoogleApiError;
    if (typedError.statusCode !== statusCode) {
      return false;
    }

    return snippet ? typedError.message.includes(snippet) : true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}