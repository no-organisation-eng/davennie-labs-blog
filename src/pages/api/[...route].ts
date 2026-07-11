import type { APIRoute } from 'astro';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { supabase } from '../../lib/supabase';

// Explicitly set edge runtime for Cloudflare compatibility
export const prerender = false;

// Initialize Hono app
const app = new Hono().basePath('/api');

// 1. Middleware for Logging
app.use('*', logger());

// Middleware to extract client info (IP, Geolocation) from Cloudflare headers
app.use('/intent/*', async (c, next) => {
  const req = c.req;
  const cfCountry = req.header('cf-ipcountry') || 'Unknown';
  const cfCity = req.header('cf-ipcity') || 'Unknown';
  const ip = req.header('cf-connecting-ip') || req.header('x-forwarded-for') || 'Unknown';
  const userAgent = req.header('user-agent') || 'Unknown';

  c.set('clientInfo', { cfCountry, cfCity, ip, userAgent });
  await next();
});

// 2. Intent Capture Endpoint
app.post('/intent/capture', async (c) => {
  try {
    const body = await c.req.json();
    const clientInfo = c.get('clientInfo');
    
    // Generate a session ID if not provided
    const sessionId = body.sessionId || crypto.randomUUID();

    const { error } = await supabase
      .from('search_intents')
      .insert([
        {
          session_id: sessionId,
          query: body.query || null,
          city: body.city || null,
          source_page: body.sourcePage,
          time_on_page: body.timeOnPage || 0,
          scroll_depth: body.scrollDepth || 0,
          cta_clicked: body.ctaClicked || false,
          user_agent: clientInfo.userAgent,
          ip_address: clientInfo.ip,
          cf_country: clientInfo.cfCountry,
          cf_city: clientInfo.cfCity,
          metadata: body.metadata || {}
        }
      ]);

    if (error) {
      console.error('Supabase Insert Error:', error);
      return c.json({ status: 'error', message: error.message }, 500);
    }

    return c.json({ status: 'captured', sessionId });
  } catch (error) {
    console.error('Intent Capture Error:', error);
    return c.json({ status: 'error', message: 'Internal Server Error' }, 500);
  }
});

// 3. Export Astro API Route Handler
export const ALL: APIRoute = ({ request }) => app.fetch(request);
