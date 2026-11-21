import { getVercelOidcTokenSync } from "@vercel/oidc";
import type { Auth } from "googleapis";

const WIF_VARIABLES = [
  "GCP_PROJECT_ID",
  "GCP_PROJECT_NUMBER",
  "GCP_WORKLOAD_IDENTITY_POOL_ID",
  "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID",
  "GCP_SERVICE_ACCOUNT_EMAIL",
] as const;

export function getGoogleWorkloadIdentity(scopes: string[]) {
  const values = WIF_VARIABLES.map((name) => process.env[name]?.trim());
  if (values.every((value) => !value)) return undefined;

  const [projectId, projectNumber, poolId, providerId, serviceAccountEmail] = values;
  if (!projectId || !projectNumber || !poolId || !providerId || !serviceAccountEmail) {
    const missing = WIF_VARIABLES.filter((_, index) => !values[index]);
    throw new Error(`Google WIF 환경변수가 누락되었습니다: ${missing.join(", ")}`);
  }

  const credentials: Auth.IdentityPoolClientOptions = {
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(serviceAccountEmail)}:generateAccessToken`,
    subject_token_supplier: {
      async getSubjectToken() {
        return getVercelOidcTokenSync();
      },
    },
  };

  return { projectId, credentials, scopes };
}
