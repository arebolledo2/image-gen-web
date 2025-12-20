import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'image-gen-web',
  eventKey: process.env.INNGEST_EVENT_KEY,
  isDev: process.env.NODE_ENV === 'development',
});
