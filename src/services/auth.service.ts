import { GITHUB_TOKEN } from '../config/env';
import { logger } from '../utils/logger';

export async function verifyToken(maxRetries: number = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "User-Agent": "Arbitrage-Bot",
        },
      });
      if (!response.ok) {
        throw new Error(`GitHub API responded with status ${response.status}`);
      }
      return true;
    } catch (error: unknown) {
      const errorMessage = (error as Error).message;
      logger.error({
        message: `Attempt ${attempt}/${maxRetries} failed verifying token`,
        error: errorMessage,
      });
      if (attempt === maxRetries) {
        logger.error({ message: "Max retries reached for token verification" });
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  return false;
}
