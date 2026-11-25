function connection() {
  const value = process.env.SITE_HOURS_GLOBAL_CONFIG || process.env.GLOBAL_CONFIG;
  if (!value) return null;

  const url = new URL(value);
  const id = url.pathname.slice(1);
  const token = url.searchParams.get("token");
  if (url.origin !== "https://global-config.vercel.com" || !/^ecfg_[a-zA-Z0-9]+$/.test(id) || !token) {
    throw new Error("Invalid site Global Config connection");
  }
  return { id, token };
}

export async function readSiteGlobalConfigItem(key: string): Promise<unknown> {
  const config = connection();
  if (!config) return undefined;

  const response = await fetch(`https://global-config.vercel.com/${config.id}/items`, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(1500),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Site Global Config read failed (${response.status})`);

  const items = await response.json();
  return items[key];
}

export function siteGlobalConfigWriter() {
  const config = connection();
  if (!config) return null;

  const token = process.env.SITE_HOURS_GLOBAL_CONFIG_WRITE_TOKEN;
  if (!token) throw new Error("Site Global Config write token is missing");

  const url = new URL(`https://api.vercel.com/v1/global-config/${config.id}/items`);
  const teamId = process.env.SITE_HOURS_GLOBAL_CONFIG_TEAM_ID;
  if (teamId) url.searchParams.set("teamId", teamId);

  return async (key: string, value: unknown) => {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ operation: "upsert", key, value }] }),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`Site Global Config write failed (${response.status})`);
  };
}
