export async function onRequestPost({ request, env }) {
  try {
    const payload = await request.json();
    
    // 1. Validate payload fields
    const required = ['title', 'description', 'cluster', 'tags', 'body', 'transcriptId'];
    for (const field of required) {
      if (!payload[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }), 
          { status: 422, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const validClusters = ['micro-saas-automation', 'niche-integrations', 'programmatic-asset-building'];
    if (!validClusters.includes(payload.cluster)) {
      return new Response(
        JSON.stringify({ error: 'Invalid cluster specified.' }), 
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Build MDX post content
    const slug = payload.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80);

    const frontmatter = `---
title: "${payload.title.replace(/"/g, '\\"')}"
description: "${payload.description.replace(/"/g, '\\"')}"
publishDate: ${new Date().toISOString().slice(0, 10)}
cluster: "${payload.cluster}"
tags: ${JSON.stringify(payload.tags)}
canonicalSourceTranscript: "${payload.transcriptId}"
draft: false
---
${payload.body}`;

    // 3. GitHub API authentication check
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      return new Response(
        JSON.stringify({ error: 'GitHub credentials are not configured in environment variables.' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const branch = `agent/${slug}-${Date.now()}`;
    const githubApi = 'https://api.github.com';
    const repo = env.GITHUB_REPO; // e.g. "username/davennie-labs-blog"
    const headers = {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Cloudflare-Pages-Agent'
    };

    // Fetch main branch SHA reference
    const mainRefRes = await fetch(`${githubApi}/repos/${repo}/git/ref/heads/main`, { headers });
    if (!mainRefRes.ok) {
      const errorText = await mainRefRes.text();
      throw new Error(`Failed to fetch main branch ref: ${errorText}`);
    }
    const mainRef = await mainRefRes.json();

    // Create a new branch pointing to main branch SHA
    const createBranchRes = await fetch(`${githubApi}/repos/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        ref: `refs/heads/${branch}`, 
        sha: mainRef.object.sha 
      }),
    });
    if (!createBranchRes.ok) {
      const errorText = await createBranchRes.text();
      throw new Error(`Failed to create branch: ${errorText}`);
    }

    // Write MDX file to the new branch
    const createFileRes = await fetch(`${githubApi}/repos/${repo}/contents/src/content/posts/${slug}.mdx`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `agent: add post "${payload.title}"`,
        content: btoa(unescape(encodeURIComponent(frontmatter))),
        branch,
      }),
    });
    if (!createFileRes.ok) {
      const errorText = await createFileRes.text();
      throw new Error(`Failed to commit file to branch: ${errorText}`);
    }

    // Open a Pull Request from the new branch to main
    const createPrRes = await fetch(`${githubApi}/repos/${repo}/pulls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `[Agent] ${payload.title}`,
        head: branch,
        base: 'main',
        body: `Auto-generated from transcript \`${payload.transcriptId}\`.\n\n**Cluster:** ${payload.cluster}\n\n*Requires human review before merging to production.*`,
      }),
    });
    if (!createPrRes.ok) {
      const errorText = await createPrRes.text();
      throw new Error(`Failed to open Pull Request: ${errorText}`);
    }
    const pr = await createPrRes.json();

    // 4. Dispatch Web Push Notifications to PWA subscribers
    try {
      const subRes = await fetch(`${env.SUPABASE_URL}/rest/v1/push_subscriptions?select=*`, {
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`
        }
      });
      if (subRes.ok) {
        const subscriptions = await subRes.json();
        const pushPromises = subscriptions.map(sub => {
          return fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'TTL': '86400'
            }
          }).catch(err => console.error('Push notify fail:', err));
        });
        await Promise.all(pushPromises);
      }
    } catch (pushErr) {
      console.error('Failed to dispatch push notifications:', pushErr);
    }

    return new Response(
      JSON.stringify({ status: 'pr_created', prUrl: pr.html_url }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Agent publish error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Pipeline failed' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
