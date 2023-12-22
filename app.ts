import { App, LogLevel } from '@slack/bolt';
import * as dotenv from 'dotenv';
import registerListeners from './listeners';

dotenv.config();

/** Initialization */
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: false,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.INFO,
});

/** Register Listeners */
registerListeners(app);

/** Start Bolt App */
(async () => {
  try {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Gemini is running! ⚡️');
  } catch (error) {
    console.error('Unable to start App', error);
  }
})();
