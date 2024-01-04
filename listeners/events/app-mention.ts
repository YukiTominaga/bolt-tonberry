import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import vertexAI from '../../llms/gemini-pro';

export interface AppMentionEventWithFiles extends SlackEventMiddlewareArgs<'app_mention'> {
  event: SlackEventMiddlewareArgs<'app_mention'>['payload'] & {
    files?: unknown[];
  };
}

const appMentionCallback = async ({
  client,
  event,
}: AllMiddlewareArgs & AppMentionEventWithFiles) => {
  if (event.files) {
    // file upload
    const postResponse = await client.chat.postMessage({
      channel: event.channel,
      text: 'file uploaded...',
      thread_ts: event.thread_ts || event.ts,
    });

    const threadMessages = await client.conversations.replies({
      channel: event.channel,
      ts: event.thread_ts || event.ts,
    });

    const stream = await vertexAI.geminiPro(threadMessages, client, postResponse);

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
  } else {
    // text chat
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

      const stream = await vertexAI.geminiPro(threadMessages, client, postResponse);

      let responseText = '';
      // eslint-disable-next-line no-restricted-syntax
      for await (const chunk of stream.stream) {
        if (chunk.candidates && chunk.candidates.length > 0) {
          responseText += chunk.candidates[0].content.parts[0].text;
          await client.chat.update({
            channel: event.channel,
            ts: postResponse.ts!,
            text: responseText,
          });
        }
      }
    } catch (error) {
      console.error(error);
      await client.chat.update({
        channel: postResponse.channel!,
        ts: postResponse.ts!,
        text: 'Sorry, something went wrong.',
      });
    }
  }
};

export default appMentionCallback;
