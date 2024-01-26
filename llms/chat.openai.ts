import { ChatOpenAI } from '@langchain/openai';
import { ConversationsRepliesResponse } from '@slack/web-api';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

const BOT_USER_ID = process.env.BOT_USER_ID!;
const MODEL_NAME = process.env.MODEL_NAME || 'gpt-4-turbo-preview';

const chatModel = new ChatOpenAI({
  modelName: MODEL_NAME,
});

const parser = new StringOutputParser();

const stream = async (threadMessages: ConversationsRepliesResponse) => {
  try {
    const messages = [
      new SystemMessage(
        `あなたは日本企業で利用されるSlackから様々な質問を受けるアシスタントです。
これから受ける質問に対して、語尾に｢ベリ｣をつけてフレンドリーに返答してください。
回答はSlackに投稿されるため、Slackで表示する時に見やすいフォーマットで返答してください。
`,
      ),
    ];
    threadMessages.messages?.forEach((message) => {
      if (message.user === BOT_USER_ID) {
        messages.push(new AIMessage(message.text || ''));
      } else if (message.text?.includes(`@${BOT_USER_ID}`)) {
        messages.push(new HumanMessage(message.text || ''));
      }
    });
    return chatModel.pipe(parser).stream(messages);
  } catch (error) {
    throw new Error('Error generating content stream');
  }
};

export default { stream };
