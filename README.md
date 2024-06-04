# Getting Started with the Pieces Copilot Discord Bot

This repository contains the source code for a Discord bot integrated with GitHub and Pieces OS Client SDK. Below are the instructions to set up and run the bot locally.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 18 or higher)
- npm or pnpm (as the package manager)

## Installation

1. **Clone the Repository**

   Start by cloning the repository to your local machine:

   ```bash
   git clone https://github.com/mason-at-pieces/pieces-copilot-discord-bot.git
   cd pieces-copilot-discord-bot
   ```

2. **Install Dependencies**

   Install the necessary Node.js dependencies using pnpm:

   ```bash
   pnpm install
   ```

## Configuration

You need to set up several environment variables before running the bot. Create a `.env` file in the root directory of the project and add the following variables:

```plaintext
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
PIECES_CLIENT_BASE_URL=your_pieces_client_base_url
GITHUB_PERSONAL_TOKEN=your_github_personal_token
```

Replace `your_discord_bot_token`, `your_discord_client_id`, `your_pieces_client_base_url`, and `your_github_personal_token` with your actual credentials.

### Obtaining Tokens and IDs

- **Discord Bot Token and Client ID:**
    - Go to the [Discord Developer Portal](https://discord.com/developers/applications).
    - Create a new application and navigate to the 'Bot' section to add a bot.
    - Here you can find your Client ID and generate a new Bot Token.

- **Pieces Client Base URL:**
    - If you are on macOS or Windows, you can run the Pieces OS Client SDK locally and use `http://localhost:1000` as the base URL.
    - If you are on linux, you can run the Pieces OS Client SDK locally and use `http://localhost:5323` as the base URL.
    - This can also be a remote URL if you are using a hosted version of the Pieces OS Client SDK.

- **GitHub Personal Token:**
    - Visit [GitHub Tokens](https://github.com/settings/tokens) page.
    - Generate a new token with the scopes of the repositories you want your bot to access.

## Running the Bot

To run the bot in development mode, use the following command:

```bash
pnpm dev
```

This will start the bot using nodemon, which will automatically restart the bot if you make any changes to the source code.

## Building the Project

To compile the TypeScript code to JavaScript and prepare it for production, run:

```bash
pnpm build
```

This command compiles the code and outputs it to the `dist` directory.

## Starting the Bot in Production

After building the project, you can start the bot in production mode:

```bash
pnpm start
```

This will run the compiled JavaScript code located in the `dist` directory.

## Additional Information

- Make sure to invite the bot to your Discord server using the appropriate OAuth2 URL, which can be generated in the Discord Developer Portal under the OAuth2 section.
- Configure the necessary permissions for the bot depending on what actions it needs to perform.
  - TODO: Need to document the required permissions for the bot.

## Support

For further assistance or to report issues, refer to the repository's issues section or contact the repository maintainers.

---

By following these instructions, you should be able to get the Discord bot up and running smoothly in your development environment.