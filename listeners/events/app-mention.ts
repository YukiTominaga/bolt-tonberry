import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import chatOpenAI from '../../llms/chat.openai';

export interface AppMentionEventWithFiles extends SlackEventMiddlewareArgs<'app_mention'> {
  event: SlackEventMiddlewareArgs<'app_mention'>['payload'] & {
    files?: unknown[];
  };
}

const appMentionCallback = async ({
  client,
  event,
}: AllMiddlewareArgs & AppMentionEventWithFiles) => {
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

    const stream = await chatOpenAI.stream(threadMessages);

    let responseText = '';
    let chunkCount = 0;
    // eslint-disable-next-line no-restricted-syntax
    for await (const chunk of stream) {
      responseText += chunk;
      console.log(responseText);
      chunkCount += 1;
      if (chunkCount >= 30) {
        await client.chat.update({
          channel: event.channel,
          ts: postResponse.ts!,
          text: responseText || 'typing...',
        });
        chunkCount = 0;
      }
    }
    // chunkCountが30以下の場合に備えて、最後にresponseTextを更新する
    if (responseText.length > 0) {
      await client.chat.update({
        channel: event.channel,
        ts: postResponse.ts!,
        text: responseText,
      });
    }
  } catch (error) {
    console.error(error);
    await client.chat.update({
      channel: postResponse.channel!,
      ts: postResponse.ts!,
      text: 'Sorry, something went wrong.',
    });
  }
};

export default appMentionCallback;
