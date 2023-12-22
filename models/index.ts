// eslint-disable-next-line import/no-extraneous-dependencies
import { Content, StreamGenerateContentResult, VertexAI } from '@google-cloud/vertexai';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ConversationsRepliesResponse } from '@slack/web-api';

const BOT_USER_ID = process.env.BOT_USER_ID!;

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_PROJECT_ID!,
  location: 'asia-northeast1',
});

const generateContentsParts = (slackMessageReplies: ConversationsRepliesResponse): Content[] => {
  if (!slackMessageReplies.messages) {
    throw new Error('slackMessageReplies.messages is undefined');
  }

  const contents: Content[] = [];
  slackMessageReplies.messages.forEach((message) => {
    if (message.user === BOT_USER_ID) {
      const content: Content = {
        parts: [{ text: message.text || '' }],
        role: 'model',
      };
      contents.push(content);
    } else {
      const content: Content = {
        parts: [{ text: message.text || '' }],
        role: 'user',
      };

      contents.push(content);
    }
  });

  return contents;
};

const gemini = async (
  threadMessages: ConversationsRepliesResponse,
): Promise<StreamGenerateContentResult> => {
  const chatModel = vertexAI.preview.getGenerativeModel({ model: 'gemini-pro' });
  const contents = generateContentsParts(threadMessages);
  // 同一roleのcontentが2つ連続するとstreamの生成が400エラーで失敗する
  // よくある例として、@geminiというメンションを忘れた状態で投稿し、続けてメンションをつけて投稿する例
  // roleが"user"かつSlack上でbotへのメンションが含まれていないcontentを削除して対応している
  const validContents = contents.filter(
    (content) => content.role !== 'user' || content.parts[0].text?.includes(`@${BOT_USER_ID}`),
  );
  const stream = await chatModel.generateContentStream({
    contents: validContents,
  });
  return stream;
};

export default { gemini };
