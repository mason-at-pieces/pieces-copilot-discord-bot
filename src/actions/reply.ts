import {AnyThreadChannel, Message, APIEmbed} from "discord.js";
import {baseLog} from "../utils/log.js";
import {createConversation, promptConversation} from "../utils/pieces/client.js";
import type {
  ConversationMessageSentimentEnum
} from "@pieces.app/pieces-os-client/dist/models/ConversationMessageSentimentEnum";

const messageRatingEmbed: APIEmbed = {
  color: 0x0099ff,
  description: 'Was this response helpful? Please let us know by reacting below.',
};

export const generateReplyEmbed = ({
  answer,
  conversationId,
  messageId,
  updatedSentiment
}: {
  answer: string;
  messageId: string;
  conversationId?: string;
  updatedSentiment?: ConversationMessageSentimentEnum;
}) => {
  const followUpNote = '**Note:** You can ask a follow up question by replying to this message or @ mentioning me again :speech_balloon:'
  let replyMessage = ''

  if (conversationId) {
    replyMessage = `Conversation ID: ${conversationId}\n\n${answer}\n\n${followUpNote}`
  } else {
    replyMessage = `${answer}\n\n${followUpNote}`
  }

  return {
    content: replyMessage,
    embeds: [messageRatingEmbed],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            custom_id: `${messageId}:like`,
            label: updatedSentiment === 'LIKE' ? '✅' : '👍',
          },
          {
            type: 2,
            style: 4,
            custom_id: `${messageId}:dislike`,
            label: updatedSentiment === 'DISLIKE' ? '✅' : '👎',
          },
        ],
      },
    ]
  }
}

export const privateReply = async (message: Message) => {
  baseLog("Message is a direct message");

  await message.channel.sendTyping();

  const newConversation = await createConversation({
    name: 'QA Bot DM',
    firstMessage: message.content
  })

  // Reply to the direct message
  const replyMessageEmbed = generateReplyEmbed({
    answer: newConversation.answer.text,
    messageId: newConversation.answer.id
  })
  await message.reply(replyMessageEmbed)

  baseLog("Replied to direct message with conversation ID %s", newConversation.conversation.id);
}

export const publicReply = async (message: Message) => {
  // Check if the bot is mentioned in the message
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
      const replyMessageEmbed = generateReplyEmbed({
        answer: newConversation.answer.text,
        messageId: newConversation.answer.id,
        conversationId: newConversation.conversation.id
      })
      await message.reply(replyMessageEmbed)

      baseLog("Created a new thread with conversation ID %s", newConversation.conversation.id);
    } else {
      baseLog("Found conversation ID %s in thread history", conversationId);

      const answer = await promptConversation({
        conversationId: conversationId,
        message: message.content
      })
      const replyMessageEmbed = generateReplyEmbed({
        answer: answer.text,
        messageId: answer.id
      })
      await channel.send(replyMessageEmbed)

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
    const replyMessageEmbed = generateReplyEmbed({
      answer: newConversation.answer.text,
      messageId: newConversation.answer.id,
      conversationId: newConversation.conversation.id
    })
    await thread.send(replyMessageEmbed)

    // await thread.setName(newConversation.conversation.name)

    baseLog("Created a new thread with conversation ID %s", newConversation.conversation.id);
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