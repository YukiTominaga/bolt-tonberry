import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import vertexAI from '../../models/index';

const appMentionCallback = async ({
  client,
  event,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'app_mention'>) => {
  const postResponse = await client.chat.postMessage({
    channel: event.channel,
    text: 'typing...',
    thread_ts: event.thread_ts || event.ts,
  });

  try {
    // Get thread messages
    const threadMessages = await client.conversations.replies({
      channel: event.channel,
      ts: event.thread_ts || event.ts,
    });

    const stream = await vertexAI.gemini(threadMessages);

    let responseText = '';
    // eslint-disable-next-line no-restricted-syntax
    for await (const chunk of stream.stream) {
      if (chunk.candidates[0].finishReason === 'SAFETY') {
        throw new Error(chunk.candidates[0].finishReason);
      }
      responseText += chunk.candidates[0].content.parts[0].text;
      await client.chat.update({
        channel: event.channel,
        ts: postResponse.ts!,
        text: responseText,
      });
    }
  } catch (error) {
    await client.chat.update({
      channel: event.channel,
      ts: postResponse.ts!,
      text: 'Sorry, something went wrong.',
    });
  }
};

export default appMentionCallback;
