import {AnyThreadChannel, Channel, Message} from "discord.js";
import {baseLog} from "../utils/log.js";
import {createConversation, promptConversation} from "../utils/pieces/client.js";

export const reply = async (message: Message) => {
  // Check if the bot is mentioned in the message
  if (message.mentions.has(message.client.user.id)) {
    baseLog("Bot was mentioned in message %s", message.id);

    const channel = (await message.client.channels.fetch(message.channelId))

    // If the message is already in a thread, don't create a new one and find the conversation ID
    if (channel.isThread()) {
      baseLog("Message is in a thread");

      await channel.sendTyping()

      // Get the conversation ID from the thread history
      const conversationId = await getConversationIdFromThread(channel);

      if (!conversationId) {
        baseLog("No conversation ID found in thread history");

        const newConversation = await createConversation({
          name: 'QA Bot Thread',
          firstMessage: message.content
        })

        // Create a thread on the message and reply inside the thread
        await message.reply(`Conversation ID: ${newConversation.conversation.id}\n\n${newConversation.answer}`)

        baseLog("Created a new thread with conversation ID %s", newConversation.conversation.id);
      } else {
        baseLog("Found conversation ID %s in thread history", conversationId);

        const answer = await promptConversation({
          conversationId: conversationId,
          message: message.content
        })
        await message.reply(answer);

        baseLog("Replied to thread with conversation ID %s", conversationId);
      }

      // // Update the thread name to the new conversation name
      // const conversation = await getConversation({ conversationId })
      // await channel.setName(conversation.name)
    } else {
      baseLog("Message is not in a thread");

      const newConversation = await createConversation({
        name: 'QA Bot Thread',
        firstMessage: message.content
      })

      // Create a thread on the message and reply inside the thread
      const thread = await message.startThread({
        name: 'QA Bot Reply',
        autoArchiveDuration: 60, // 1 hour
      });

      await thread.send(`Conversation ID: ${newConversation.conversation.id}\n\n${newConversation.answer}`)

      // await thread.setName(newConversation.conversation.name)

      baseLog("Created a new thread with conversation ID %s", newConversation.conversation.id);
    }
  }
}

// Get the conversation ID from the thread history
export const getConversationIdFromThread = async (channel: AnyThreadChannel) => {
  // Fetch all messages from the thread
  const messages = await channel.messages.fetch();
  // Find the conversation ID in the thread history
  const regex = /Conversation ID: (\S+)/;
  const match = messages.find((m) => m.content.match(regex));
  const conversationId = match?.content.match(regex)?.[1];

  return conversationId;
}