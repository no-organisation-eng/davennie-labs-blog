import type { APIRoute } from 'astro';

export const prerender = false;

// Standalone fallback VAPID public key
const DEFAULT_VAPID_PUBLIC = 'BEl62vRq41F6ea411b9a71b3620cdac6BK27_H7sKq_zLgWvX6a4T1X9d6Vd1N7P5rX9d6Vd1N7P5';

export const GET: APIRoute = async () => {
  const publicKey = import.meta.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC;
  return new Response(JSON.stringify({ publicKey }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
