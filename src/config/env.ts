import dotenv from "dotenv";

dotenv.config();

export const GITHUB_TOKEN: string | undefined = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  process.exit(1);
}
