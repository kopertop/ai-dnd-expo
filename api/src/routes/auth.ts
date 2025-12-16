import { z } from 'zod';

export const googleCallbackSchema = z.object({
  code: z.string(),
  redirectUri: z.string().url(),
});
