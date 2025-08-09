import { GITHUB_TOKEN } from "../config/env";

export async function verifyToken(): Promise<boolean> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "User-Agent": "Arbitrage-Bot",
      },
    });
    return response.ok;
  } catch (error: unknown) {
    console.error("❌ Error verifying token:", (error as Error).message);
    return false;
  }
}
