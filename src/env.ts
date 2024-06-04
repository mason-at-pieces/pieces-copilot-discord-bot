import { createEnv } from "@t3-oss/env-core";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const env = createEnv({
  server: {
    // Node.js (set by the CLI)
    NODE_ENV: z
      .union([z.literal("development"), z.literal("production")])
      .default("production"),

    // Discord
    DISCORD_BOT_TOKEN: z.string(),
    DISCORD_CLIENT_ID: z.string(),

    // Pieces OS
    PIECES_CLIENT_BASE_URL: z.string(),

    // GitHub
    GITHUB_PERSONAL_TOKEN: z.string(),
  },

  runtimeEnv: process.env,
});
