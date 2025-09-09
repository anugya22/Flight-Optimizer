// opensky.js
import fetch from "node-fetch";
const TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const API_URL = "https://opensky-network.org/api/states/all";

let cachedToken = null;
let tokenExpiry = 0;

export async function getAccessToken() {
  const now = Date.now() / 1000;
  if (cachedToken && now < tokenExpiry - 60) return cachedToken;

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.OPENSKY_CLIENT_ID || "",
    client_secret: process.env.OPENSKY_CLIENT_SECRET || "",
    // scope: "openid"  // optional — try adding if still failing
  });

  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`Token fetch failed: ${resp.status} — ${errText}`);
    throw new Error(`Token fetch failed: ${resp.status}`);
  }

  const data = await resp.json();
  cachedToken = data.access_token;
  tokenExpiry = Math.floor(Date.now() / 1000) + data.expires_in;
  console.log(`🌐 Obtained OpenSky access token (expires in ${data.expires_in}s)`);
  return cachedToken;
}

export async function fetchLiveFlights() {
  try {
    const token = await getAccessToken();
    const resp = await fetch(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`OpenSky /states/all failed: ${resp.status} — ${errText}`);
    }
    const data = await resp.json();
    return data.states || [];
  } catch (err) {
    console.error("❌ OpenSky fetch failed:", err.message);
    return [];
  }
}
