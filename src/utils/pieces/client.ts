import {
  Application,
  ApplicationNameEnum,
  Asset,
  AssetsApi,
  Configuration,
  Conversation,
  ConversationApi,
  ConversationMessageApi,
  ConversationMessagesApi,
  ConversationsApi,
  ConversationTypeEnum,
  PlatformEnum,
  PrivacyEnum,
  QGPTApi,
  QGPTConversationMessageRoleEnum,
  RelevantQGPTSeed,
  SeedTypeEnum,
  UserApi,
} from '@pieces.app/pieces-os-client';
import {env} from "../env.js";
import type {
  ConversationMessageSentimentEnum
} from "@pieces.app/pieces-os-client/dist/models/ConversationMessageSentimentEnum";

// const defaultProfilePicture = 'https://t4.ftcdn.net/jpg/05/49/98/39/360_F_549983970_bRCkYfk0P6PP5fKbMhZMIb07mCJ6esXL.jpg'

// export const port = userAgent.name.toLowerCase().includes('linux')
//   ? 5323
//   : 1000;
// const clientBaseUrl = `http://localhost:${port}`;

const clientBaseUrl = env.PIECES_CLIENT_BASE_URL;

export const piecesConfig = new Configuration({
  basePath: clientBaseUrl,
});

console.log('Pieces Client Loaded');

const trackedApplication: Application = {
  id: 'DEFAULT', // This is the application id for all open source applications
  name: ApplicationNameEnum.OpenSource,
  version: '0.0.1',
  platform: PlatformEnum.Macos,
  onboarded: false,
  privacy: PrivacyEnum.Anonymous,
};

export const assetsApi = new AssetsApi(piecesConfig);
export const conversationMessageApi = new ConversationMessageApi(piecesConfig);
export const conversationMessagesApi = new ConversationMessagesApi(
  piecesConfig
);
export const conversationsApi = new ConversationsApi(piecesConfig);
export const conversationApi = new ConversationApi(piecesConfig);
export const qgptApi = new QGPTApi(piecesConfig);
export const userApi = new UserApi(piecesConfig);

// export const connectToPieces = async () => {
//   try {
//     const connection = await connectorApi.connect({
//       seededConnectorConnection: {
//         application: trackedApplication,
//       },
//     });
//
//     return connection;
//   } catch (error) {
//     console.error('Error connecting to Pieces', error);
//   }
// };

export const createConversation = async (
  props: {
    name?: string;
    firstMessage?: string;
  } = {}
): Promise<{
  conversation: Conversation;
  answer?: string;
} | null> => {
  const { name, firstMessage } = props;

  try {
    const newConversation =
      await conversationsApi.conversationsCreateSpecificConversation({
        seededConversation: {
          name: name || 'New Conversation',
          pipeline: {
            conversation: {
              contextualizedCodeDialog: {},
            },
          },
          type: ConversationTypeEnum.Copilot,
        },
      });

    // // Add the system message to the conversation
    // const systemMessage =
    //   await conversationMessagesApi.messagesCreateSpecificMessage({
    //     seededConversationMessage: {
    //       conversation: {
    //         id: newConversation.id,
    //       },
    //       role: QGPTConversationMessageRoleEnum.System,
    //       fragment: {
    //         string: {
    //           raw: 'You are an expert support worker who prides themselves on helping users resolve any problems they are having with Pieces in general, Pieces integrations on general support on issues related to Pieces. You will always answer in an accurate, polite and helpful manner. Remember that being a good support is essential for the success of the company. You will get a users query and some information from our support tickets, documentation site, and faqs. Use the information to provide support for the user. If there is no information related to their query, politely direct them to make a GitHub issue on our support repo here: https://github.com/pieces-app/support/issues/new/choose',
    //         },
    //       },
    //     },
    //   });

    // If there is a first message passed in, prompt the conversation with it and return the answer
    if (firstMessage) {
      const answer = await promptConversation({
        message: firstMessage,
        conversationId: newConversation.id,
      });

      return {
        conversation: newConversation,
        answer,
      };
    }

    return {
      conversation: newConversation,
    };
  } catch (error) {
    console.error('Error creating conversation', error);

    return null;
  }
};

export const getConversations = async (): Promise<
  Conversation[] | undefined
> => {
  try {
    const conversations = await conversationsApi.conversationsSnapshot();

    return conversations.iterable || [];
  } catch (error) {
    console.error('Error fetching conversations', error);

    return undefined;
  }
};

export const getConversation = async ({
  conversationId,
  includeRawMessages = false,
}: {
  conversationId: string;
  includeRawMessages?: boolean;
}): Promise<
  | (Conversation & {
  rawMessages?: {
    message: string;
    isUserMessage: boolean;
  }[];
})
  | undefined
> => {
  const conversationMessages: {
    message: string;
    isUserMessage: boolean;
  }[] = [];

  try {
    const conversation =
      await conversationApi.conversationGetSpecificConversation({
        conversation: conversationId,
      });

    if (!includeRawMessages) {
      return conversation;
    }

    const conversationMessageApi = new ConversationMessageApi(piecesConfig);
    for (const [messageId, index] of Object.entries(
      conversation.messages.indices || {}
    )) {
      const messageResponse =
        await conversationMessageApi.messageSpecificMessageSnapshot({
          message: messageId,
        });

      if (
        !messageResponse.fragment ||
        !messageResponse.fragment.string ||
        !messageResponse.fragment.string.raw
      ) {
        continue;
      }

      conversationMessages.push({
        message: messageResponse.fragment.string.raw,
        isUserMessage: messageResponse.role === 'USER',
      });
    }

    return {
      ...conversation,
      rawMessages: conversationMessages,
    };
  } catch (error) {
    console.error('Error getting conversation', error);

    return undefined;
  }
};

export const promptConversation = async ({
  message,
  conversationId,
}: {
  message: string;
  conversationId: string;
}): Promise<string> => {
  try {
    const conversation = await getConversation({
      conversationId,
      includeRawMessages: true,
    });

    if (!conversation) {
      return 'Conversation not found';
    }

    // Add the user message to the conversation
    const userMessage =
      await conversationMessagesApi.messagesCreateSpecificMessage({
        seededConversationMessage: {
          role: QGPTConversationMessageRoleEnum.User,
          fragment: {
            string: {
              raw: message,
            },
          },
          conversation: { id: conversationId },
        },
      });

    const relevantConversationMessages: RelevantQGPTSeed[] =
      conversation.rawMessages
        ? conversation.rawMessages.map((message) => ({
          seed: {
            type: SeedTypeEnum.Asset,
            asset: {
              application: {
                ...trackedApplication,
              },
              format: {
                fragment: {
                  string: {
                    raw: message.message,
                  },
                },
              },
            },
          },
        }))
        : [];

    // Ask the user question to the llm to get a generated response
    const answer = await qgptApi.question({
      qGPTQuestionInput: {
        query: message,
        pipeline: {
          conversation: {
            contextualizedCodeDialog: {},
          },
        },
        relevant: {
          iterable: [
            ...relevantConversationMessages,
          ],
        },
      },
    });

    // Add the bot response to the conversation
    const botMessage =
      await conversationMessagesApi.messagesCreateSpecificMessage({
        seededConversationMessage: {
          role: QGPTConversationMessageRoleEnum.Assistant,
          fragment: {
            string: {
              raw: answer.answers.iterable[0].text,
            },
          },
          conversation: { id: conversationId },
        },
      });

    await updateConversationName(conversationId);

    return answer.answers.iterable[0].text;
  } catch (error) {
    console.error('Error prompting conversation', error);

    return 'Error asking question';
  }
};

export const updateConversationName = async (
  conversationId: string
): Promise<string | undefined> => {
  try {
    const conversation =
      await conversationApi.conversationSpecificConversationRename({
        conversation: conversationId,
      });

    return conversation.name;
  } catch (error) {
    console.error('Error updating conversation name', error);

    return 'Error updating conversation name';
  }
};

// export const getUserProfilePicture = async (): Promise<string> => {
//   try {
//     const userRes = await userApi.userSnapshot();
//
//     return userRes.user?.picture || defaultProfilePicture;
//   } catch (error) {
//     console.error('Error getting user profile picture', error);
//
//     return defaultProfilePicture;
//   }
// };

export const getSavedMaterials = async (): Promise<Asset[] | []> => {
  try {
    const assets = await assetsApi.assetsSnapshot();

    return assets.iterable;
  } catch (error) {
    console.error('Error fetching saved materials', error);

    return [];
  }
};

export const searchSavedMaterials = async ({
  query,
}: {
  query: string;
}): Promise<Asset[] | []> => {
  try {
    const searchedAssets = await assetsApi.assetsSearchAssets({
      query,
    });

    // Filter out any assets that are undefined
    const cleanedAssets = searchedAssets.iterable
      .filter((searchedAsset) => !!searchedAsset.asset)
      .map((searchedAsset) => searchedAsset.asset!);

    return cleanedAssets;
  } catch (error) {
    console.error('Error searching saved materials', error);

    return [];
  }
};

export const addSentimentToMessage = async ({
  messageId,
  sentiment
}: {
  messageId: string;
  sentiment: ConversationMessageSentimentEnum
}): Promise<void> => {
  try {
    const conversationMessage = await conversationMessageApi.messageSpecificMessageSnapshot({
      message: messageId
    });

    await conversationMessageApi.messageSpecificMessageUpdate({
      conversationMessage: {
        ...conversationMessage,
        sentiment
      }
    });
  } catch (error) {
    console.error(`Error adding ${sentiment} sentiment to message ${messageId}`, error);
  }
}