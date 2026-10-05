import { z } from 'zod';

export const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
  city: z.string(),
});

export type Person = z.infer<typeof PersonSchema>;
