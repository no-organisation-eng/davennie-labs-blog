import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const posts = await getCollection('posts');
    const sorted = posts
      .filter(p => !p.data.draft)
      .sort((a, b) => new Date(b.data.publishDate).getTime() - new Date(a.data.publishDate).getTime());
    
    if (sorted.length === 0) {
      return new Response(JSON.stringify({ error: 'No posts found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const latest = sorted[0];
    return new Response(JSON.stringify({
      title: latest.data.title,
      description: latest.data.description,
      url: `/posts/${latest.id}/`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
