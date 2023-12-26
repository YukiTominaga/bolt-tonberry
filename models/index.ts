// eslint-disable-next-line import/no-extraneous-dependencies
import {
  Content,
  InlineDataPart,
  StreamGenerateContentResult,
  VertexAI,
} from '@google-cloud/vertexai';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ConversationsRepliesResponse } from '@slack/web-api';
import { FileElement } from '@slack/web-api/dist/response/ChatPostMessageResponse';
// eslint-disable-next-line import/no-extraneous-dependencies
import axios from 'axios';

const BOT_USER_ID = process.env.BOT_USER_ID!;

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_PROJECT_ID!,
  location: 'asia-northeast1',
});

const getBase64 = async (url: string) => {
  const image = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(image.data).toString('base64');
};

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

const geminiPro = async (
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

const generateInlineDataParts = async (fileElement: FileElement): Promise<unknown[]> => {
  const data = await getBase64(fileElement.url_private!);
  const inlineData = {
    inlineData: { data, mimeType: fileElement.mimetype! },
  };
  return [inlineData];
};

const generateMultimodalContents = async (
  slackMessageReplies: ConversationsRepliesResponse,
): Promise<Content[]> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents: any = [];

  await Promise.all(
    slackMessageReplies.messages!.map(async (message) => {
      if (message.user === BOT_USER_ID) {
        // model role
        // const content: Content = {
        //   parts: [{ text: message.text || '' }],
        //   role: 'model',
        // };
        // contents.push(content);
      } else {
        // user role
        const inlineDataParts = await generateInlineDataParts(message.files![0]);
        if (inlineDataParts.length === 0) {
          console.error('inlineDataPartsが空です。ファイルの取得に失敗した可能性があります。');
        }
        const content = {
          role: 'user',
          parts: [...inlineDataParts],
        };
        contents.push(content);
      }
    }),
  );
  return contents;
};

const geminiProVision = async (
  slackMessageReplies: ConversationsRepliesResponse,
): Promise<StreamGenerateContentResult> => {
  const visionModel = vertexAI.preview.getGenerativeModel({ model: 'gemini-pro-vision' });
  const contents = await generateMultimodalContents(slackMessageReplies);
  console.log(contents[0].parts);
  const stream = await visionModel.generateContentStream({
    contents,
  });
  return stream;
};

export default { geminiPro, geminiProVision };
