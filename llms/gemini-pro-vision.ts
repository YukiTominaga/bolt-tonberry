import { Content, StreamGenerateContentResult, VertexAI } from '@google-cloud/vertexai';
import { ConversationsRepliesResponse } from '@slack/web-api';
import { FileElement } from '@slack/web-api/dist/response/ChatPostMessageResponse';
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

export default { geminiProVision };
