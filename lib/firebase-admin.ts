import { initializeApp, getApps, cert, applicationDefault, type App } from "firebase-admin/app";

let adminApp: App | null = null;

export function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  // ADC preferred (Cloud Run auto-credentials), JSON key fallback (local dev)
  const credential = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? cert(JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY))
    : applicationDefault();

  adminApp = initializeApp({ credential });
  return adminApp;
}
