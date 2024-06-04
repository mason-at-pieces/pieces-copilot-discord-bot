import {Client, DMChannel, Events, GatewayIntentBits, Partials} from "discord.js";
import {baseLog} from "./utils/log.js";
import {env} from "./utils/env.js";
import {privateReply, publicReply} from "./actions/reply.js";
import {getIssues} from "./utils/ingestion/github.js";
import {addSentimentToMessage, conversationMessageApi} from "./utils/pieces/client.js";
import type {
  ConversationMessageSentimentEnum
} from "@pieces.app/pieces-os-client/dist/models/ConversationMessageSentimentEnum";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // Optional, for member-related events
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Required for receiving message content
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Message, // Needed to receive events for uncached messages
    Partials.Channel, // Needed for channel-related events
    Partials.GuildMember, // Needed for guild member-related events
    Partials.ThreadMember
  ]
});

client.once(Events.ClientReady, async (c) => {
  baseLog(`Ready! Logged in as ${c.user.tag}`);

  await getIssues('pieces-app', 'support')
});

client.on(Events.GuildCreate, async (guild) => {
  const startTime = performance.now();
  try {
    baseLog(`Time taken on ${guild.name}: ${performance.now() - startTime}ms`);
    baseLog("Added a new server (%s)", guild.name);
  } catch (err) {
    console.error("Failed to add server:", err);
  }
});

client.on(Events.GuildUpdate, async (_, newGuild) => {
  try {
    const guild = await newGuild.fetch();
    baseLog("Updated a server (%s)", guild.name);
  } catch (err) {
    console.error("Failed to update server:", err);
  }
});

client.on(Events.GuildDelete, async (guild) => {
  try {
    baseLog("Deleted a server (%s)", guild.name);
  } catch (err) {
    console.error("Failed to delete server:", err);
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    baseLog("Created a new message in channel/thread %s", message.channelId);

    if (message.author === client.user) {
      baseLog("Ignoring message from self");
      return;
    }

    // @ts-ignore
    if (message.channel instanceof DMChannel) {
      baseLog("Received a DM from %s", message.author.username);

      await privateReply(message)
    } else if (message.mentions.has(message.client.user.id)) {
      baseLog("Bot was mentioned in message %s", message.id);

      await publicReply(message);
    }
  } catch (err) {
    console.error("Failed to create message:", err);
  }
});

client.on(Events.MessageUpdate, async (_, newMessage) => {
  try {
    baseLog("Updated a message in channel/thread %s", newMessage.channelId);
  } catch (err) {
    console.error("Failed to update message:", err);
  }
});

client.on(Events.MessageDelete, async (message) => {
  try {
    baseLog("Deleted a message in channel/thread %s", message.channelId);
  } catch (err) {
    console.error("Failed to delete message:", err);
  }
});

client.on(Events.ThreadCreate, async (thread) => {
  try {
    baseLog("Created a new thread (%s)", thread.id);
  } catch (err) {
    console.error("Failed to create thread:", err);
  }
});

client.on(Events.ThreadUpdate, async (oldThread, newThread) => {
  try {
    baseLog("Updated a thread (%s)", newThread.id);
  } catch (err) {
    console.error("Failed to update thread:", err);
  }
});

client.on(Events.ThreadDelete, async (thread) => {
  try {
    baseLog("Deleted a thread (%s)", thread.id);
  } catch (err) {
    console.error("Failed to delete thread:", err);
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    baseLog("Updated a user (%s)", newMember.user.username);
  } catch (err) {
    console.error("Failed to update user:", err);
  }
});

client.on(Events.ChannelCreate, async (channel) => {
  try {
    baseLog("Created a new channel (%s)", channel.name);
  } catch (err) {
    console.error("Failed to create channel:", err);
  }
});

client.on(Events.ChannelUpdate, async (_, newChannel) => {
  try {
    baseLog("Updated a channel (%s)", newChannel.id);
  } catch (err) {
    console.error("Failed to update channel:", err);
  }
});

client.on(Events.ChannelDelete, async (channel) => {
  try {
    baseLog("Deleted a channel (%s)", channel.id);
  } catch (err) {
    console.error("Failed to delete channel:", err);
  }
});

client.on(Events.InviteCreate, async (invite) => {
  try {
    baseLog("Created a new invite link (%s)", invite.code);
  } catch (err) {
    console.error("Failed to create invite link:", err);
  }
});

client.on(Events.InviteDelete, async (invite) => {
  try {
    baseLog("Deleted an invite link (%s)", invite.code);
  } catch (err) {
    console.error("Failed to delete invite link:", err);
  }
});

// I don't think we need to do anything with these events, but I'm leaving them here for now.
client.on(Events.GuildRoleCreate, async (role) => {
  try {
    baseLog("Created a new role (%s)", role.name);
  } catch (err) {
    console.error("Failed to create role:", err);
  }
});

client.on(Events.GuildRoleUpdate, async (_, newRole) => {
  try {
    baseLog("Updated a role (%s)", newRole.name);
  } catch (err) {
    console.error("Failed to update role:", err);
  }
});

client.on(Events.GuildRoleDelete, async (role) => {
  try {
    baseLog("Deleted a role (%s)", role.name);
  } catch (err) {
    console.error("Failed to delete role:", err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    baseLog("Created a new interaction (%s)", interaction.id);

    // Check if the interaction is a button click
    if (interaction.isButton()) {
      // Acknowledges the interaction
      await interaction.deferUpdate();

      // Split custom_id into message ID and sentiment by splitting on the colon
      const [messageId, sentiment] = interaction.customId.split(':');
      const cleanedSentiment = sentiment.toUpperCase() as ConversationMessageSentimentEnum

      await addSentimentToMessage({
        messageId,
        sentiment: cleanedSentiment
      })

      // Update the message with the new sentiment
      await interaction.editReply({
        components: [{
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              custom_id: `${messageId}:like`,
              label: cleanedSentiment === 'LIKE' ? '✅' : '👍',
            },
            {
              type: 2,
              style: 4,
              custom_id: `${messageId}:dislike`,
              label: cleanedSentiment === 'DISLIKE' ? '✅' : '👎',
            },
          ],
        }]
      })
    }
  } catch (err) {
    console.error("Failed to create interaction:", err);
  }
})

await client.login(env.DISCORD_BOT_TOKEN);
