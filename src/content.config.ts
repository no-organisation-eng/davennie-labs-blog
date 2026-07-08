import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/posts" }),
  schema: z.object({
    title: z.string().min(10).max(100),
    description: z.string().min(50).max(160), // meta description length constraint
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    cluster: z.enum([
      'micro-saas-automation',
      'niche-integrations',
      'programmatic-asset-building',
    ]),
    tags: z.array(z.string()).min(2).max(8),
    targetRpmRange: z.tuple([z.number(), z.number()]).optional(), // internal use, stripped at render
    canonicalSourceTranscript: z.string().optional(), // ID linking back to originating dev transcript
    draft: z.boolean().default(false),
    heroImage: z.string().optional(),
    relatedSlugs: z.array(z.string()).optional(), // manual override for RelatedPosts
  }),
});

export const collections = { posts };
