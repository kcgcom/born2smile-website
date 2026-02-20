import { initializeApp, getApps, cert, applicationDefault, type App } from "firebase-admin/app";

let adminApp: App | null = null;

export function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  // ADC preferred (Cloud Run auto-credentials), JSON key fallback (local dev)
  let credential;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      credential = cert(JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY));
    } catch {
      console.error("GOOGLE_SERVICE_ACCOUNT_KEY 환경변수의 JSON 형식이 올바르지 않습니다. ADC로 폴백합니다.");
      credential = applicationDefault();
    }
  } else {
    credential = applicationDefault();
  }

  adminApp = initializeApp({ credential });
  return adminApp;
}
