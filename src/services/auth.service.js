
import { GITHUB_TOKEN } from '../config/env.js';

export async function verifyToken() {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "User-Agent": "Arbitrage-Bot",
      },
    });
    return response.ok;
  } catch (error) {
    console.error("❌ Error verifying token:", error.message);
    return false;
  }
}
