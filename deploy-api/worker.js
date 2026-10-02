/**
 * VEXDYN Forge — Deployment Backend (Cloudflare Worker)
 *
 * Secrets:
 *   CF_API_TOKEN   — Cloudflare API token with Pages:Edit
 *   CF_ACCOUNT_ID  — Cloudflare account ID
 *
 * Routes:
 *   GET  /api/health
 *   POST /api/deploy
 *   GET  /api/deploy?projectId=
 *   GET  /api/deploy/:id
 *   POST /api/deploy/:id/cancel
 */

const STAGE_ORDER = [
  'preparing',
  'validating',
  'building',
  'packaging',
  'uploading',
  'deploying',
  'finalizing',
]

const STAGE_LABELS = {
  preparing: 'Preparing',
  validating: 'Validating',
  building: 'Building',
  packaging: 'Packaging',
  uploading: 'Uploading',
  deploying: 'Deploying',
  finalizing: 'Finalizing',
}

/** In-memory store (use KV/DO for multi-isolate production) */
const deployments = new Map()

function corsHeaders(request, env) {
  const origin = env.DEPLOY_CORS_ORIGIN || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function json(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request, env),
    },
  })
}

function makeStages() {
  return STAGE_ORDER.map((id) => ({
    id,
    label: STAGE_LABELS[id],
    status: 'pending',
    logs: [],
  }))
}

function setStage(record, stageId, status, detail, logLine) {
  if (status === 'running') {
    record.status = stageId
  }
  const stage = record.stages.find((s) => s.id === stageId)
  if (stage) {
    stage.status = status
    if (detail) stage.detail = detail
    if (logLine) {
      stage.logs = stage.logs || []
      stage.logs.push(logLine)
      record.logs = record.logs || []
      record.logs.push(logLine)
    }
  }
}

function markPreviousDone(record, upToId) {
  const idx = STAGE_ORDER.indexOf(upToId)
  for (let i = 0; i < idx; i++) {
    const s = record.stages.find((x) => x.id === STAGE_ORDER[i])
    if (s && s.status !== 'done' && s.status !== 'failed') {
      s.status = 'done'
    }
  }
}

async function cfFetch(env, path, init = {}) {
  const url = `https://api.cloudflare.com/client/v4${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
      ...(init.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(init.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  return { res, data }
}

function slugify(name) {
  let slug = String(name || 'forge-project')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
  if (!slug) slug = 'forge-project'
  if (slug.length > 50) slug = slug.slice(0, 50).replace(/-+$/, '')
  if (!/^[a-z]/.test(slug)) slug = `p-${slug}`
  return slug
}

async function ensurePagesProject(env, slug) {
  const accountId = env.CF_ACCOUNT_ID
  {
    const { res, data } = await cfFetch(
      env,
      `/accounts/${accountId}/pages/projects/${slug}`
    )
    if (res.ok && data.success) {
      return { project: data.result, created: false }
    }
  }
  const { res, data } = await cfFetch(
    env,
    `/accounts/${accountId}/pages/projects`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: slug,
        production_branch: 'main',
      }),
    }
  )
  if (!res.ok || !data.success) {
    const msg =
      data?.errors?.[0]?.message ||
      data?.messages?.[0] ||
      `Failed to create Pages project (${res.status})`
    if (/already exists|taken|conflict/i.test(String(msg))) {
      const alt = `${slug}-${Math.random().toString(36).slice(2, 6)}`
      const retry = await cfFetch(
        env,
        `/accounts/${accountId}/pages/projects`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: alt,
            production_branch: 'main',
          }),
        }
      )
      if (retry.res.ok && retry.data.success) {
        return { project: retry.data.result, created: true }
      }
      throw new Error(retry.data?.errors?.[0]?.message || msg)
    }
    throw new Error(msg)
  }
  return { project: data.result, created: true }
}

async function sha256Hex(content) {
  const data = new TextEncoder().encode(content ?? '')
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function bytesToBase64(bytes) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function guessContentType(path) {
  const lower = path.toLowerCase()
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html; charset=utf-8'
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8'
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) return 'application/javascript; charset=utf-8'
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.ico')) return 'image/x-icon'
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'text/plain; charset=utf-8'
  if (lower.endsWith('.xml')) return 'application/xml'
  if (lower.endsWith('.woff')) return 'font/woff'
  if (lower.endsWith('.woff2')) return 'font/woff2'
  return 'application/octet-stream'
}

/**
 * Wrangler-compatible Direct Upload:
 * 1) GET upload-token (JWT)
 * 2) POST /pages/assets/upload with hashed file bodies
 * 3) POST deployments with FormData manifest only
 *
 * Manifest keys: relative paths without leading slash
 * Manifest values: first 32 hex chars of SHA-256 (Wrangler style)
 */
async function deployStaticFiles(env, projectName, files) {
  const accountId = env.CF_ACCOUNT_ID
  const auth = { Authorization: `Bearer ${env.CF_API_TOKEN}` }

  // 1. Upload token
  const tokenRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/upload-token`,
    { headers: auth }
  )
  const tokenData = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !tokenData.success) {
    throw new Error(
      tokenData?.errors?.[0]?.message ||
        `Failed to get Pages upload token (${tokenRes.status})`
    )
  }
  const jwt = tokenData.result?.jwt
  if (!jwt) throw new Error('Upload token response missing jwt')

  // 2. Hash files + build manifest
  const manifest = {}
  const payload = []

  for (const f of files) {
    const rel = (f.path || '').replace(/^\/+/, '')
    if (!rel) continue
    const content = f.content ?? ''
    const bytes = new TextEncoder().encode(content)
    const full = await sha256Hex(content)
    const hash = full.slice(0, 32)
    manifest[rel] = hash
    payload.push({
      key: hash,
      value: bytesToBase64(bytes),
      base64: true,
      metadata: { contentType: guessContentType(rel) },
    })
  }

  if (Object.keys(manifest).length === 0) {
    throw new Error('No files to upload')
  }

  // Upload in batches of 50
  for (let i = 0; i < payload.length; i += 50) {
    const batch = payload.slice(i, i + 50)
    const upRes = await fetch(
      'https://api.cloudflare.com/client/v4/pages/assets/upload',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      }
    )
    const upData = await upRes.json().catch(() => ({}))
    if (!upRes.ok || upData.success === false) {
      throw new Error(
        upData?.errors?.[0]?.message ||
          `Asset upload failed (${upRes.status})`
      )
    }
  }

  // 3. Create deployment — manifest is required as a form field
  const form = new FormData()
  form.append('manifest', JSON.stringify(manifest))
  form.append('branch', 'main')

  const depRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`,
    {
      method: 'POST',
      headers: auth,
      body: form,
    }
  )
  const depData = await depRes.json().catch(() => ({}))
  if (!depRes.ok || !depData.success) {
    throw new Error(
      depData?.errors?.[0]?.message ||
        JSON.stringify(depData?.errors || depData) ||
        `Create deployment failed (${depRes.status})`
    )
  }
  return depData.result
}

async function runDeployment(env, record, pkg) {
  try {
    setStage(record, 'preparing', 'running', 'Loading project', 'Preparing deployment…')
    markPreviousDone(record, 'preparing')
    setStage(
      record,
      'preparing',
      'done',
      `Project: ${pkg.projectName}`,
      `✓ Project loaded (${pkg.files.length} files)`
    )

    setStage(record, 'validating', 'running', undefined, 'Validating files…')
    markPreviousDone(record, 'validating')
    if (!pkg.files?.length) throw new Error('No files to deploy')
    if (pkg.framework !== 'static') {
      throw new Error(
        `Framework "${pkg.framework}" is not supported yet. Deploy static HTML/CSS/JS projects only.`
      )
    }
    const hasHtml = pkg.files.some(
      (f) => f.path === 'index.html' || f.path.endsWith('.html')
    )
    if (!hasHtml) throw new Error('Missing HTML entry file')
    setStage(record, 'validating', 'done', 'Static site validated', '✓ Files validated')

    setStage(
      record,
      'building',
      'running',
      'Static project — no build step',
      'Building…'
    )
    markPreviousDone(record, 'building')
    setStage(
      record,
      'building',
      'done',
      'Skipped (static)',
      '✓ No build required for static HTML/CSS/JS'
    )

    setStage(record, 'packaging', 'running', undefined, 'Packaging output…')
    markPreviousDone(record, 'packaging')
    setStage(
      record,
      'packaging',
      'done',
      `${pkg.files.length} files ready`,
      `✓ Output prepared (${pkg.files.length} files)`
    )

    if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
      throw new Error(
        'Cloudflare credentials are not configured on the server (CF_API_TOKEN, CF_ACCOUNT_ID).'
      )
    }

    setStage(record, 'uploading', 'running', undefined, 'Creating Pages project…')
    markPreviousDone(record, 'uploading')

    const slug = pkg.slug || slugify(pkg.projectName)
    const { project } = await ensurePagesProject(env, slug)
    const projectName = project.name || slug
    record.slug = projectName
    setStage(
      record,
      'uploading',
      'done',
      `Project: ${projectName}`,
      `✓ Pages project ready (${projectName})`
    )

    setStage(
      record,
      'deploying',
      'running',
      undefined,
      'Uploading files to Cloudflare…'
    )
    markPreviousDone(record, 'deploying')

    const result = await deployStaticFiles(env, projectName, pkg.files)
    const url =
      result?.url ||
      result?.aliases?.[0] ||
      `https://${projectName}.pages.dev`

    setStage(record, 'deploying', 'done', url, '✓ Cloudflare deployment created')

    setStage(record, 'finalizing', 'running', undefined, 'Finalizing…')
    markPreviousDone(record, 'finalizing')
    record.url = url
    record.status = 'ready'
    record.finishedAt = new Date().toISOString()
    setStage(record, 'finalizing', 'done', 'Live', `✓ Deployment ready — ${url}`)
    record.logs = record.logs || []
    record.logs.push('Deployment successful')
    record.logs.push(url)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    record.status = 'failed'
    record.error = message
    record.finishedAt = new Date().toISOString()
    record.logs = record.logs || []
    record.logs.push(`✕ ${message}`)
    for (const s of record.stages) {
      if (s.status === 'running') {
        s.status = 'failed'
        s.detail = message
        s.logs = s.logs || []
        s.logs.push(`✕ ${message}`)
      }
    }
  }
  deployments.set(record.id, record)
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      })
    }

    const url = new URL(request.url)
    let path = url.pathname.replace(/\/+$/, '') || '/'

    // Fix double /api/deploy when client base URL already included it
    if (path.startsWith('/api/deploy/api/')) {
      path = path.replace(/^\/api\/deploy/, '')
    }

    if ((path === '/api/health' || path === '/health') && request.method === 'GET') {
      return json(
        {
          ok: true,
          service: 'vexdyn-forge-deploy',
          configured: Boolean(env.CF_API_TOKEN && env.CF_ACCOUNT_ID),
          version: '1.6.2-jwt-upload',
        },
        200,
        request,
        env
      )
    }

    // List deployments
    if (path === '/api/deploy' && request.method === 'GET') {
      const projectId = url.searchParams.get('projectId')
      const all = Array.from(deployments.values())
      const list = projectId
        ? all.filter((d) => d.projectId === projectId)
        : all
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return json(list, 200, request, env)
    }

    // Start deployment
    if (path === '/api/deploy' && request.method === 'POST') {
      if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
        return json(
          {
            error:
              'Cloudflare credentials are not configured on the deployment backend. Set CF_API_TOKEN and CF_ACCOUNT_ID as Worker secrets.',
          },
          503,
          request,
          env
        )
      }

      let body
      try {
        body = await request.json()
      } catch {
        return json({ error: 'Invalid JSON body' }, 400, request, env)
      }

      const pkg = body.package
      if (!pkg?.projectId || !pkg?.files) {
        return json(
          { error: 'Missing package.projectId or package.files' },
          400,
          request,
          env
        )
      }

      const id = crypto.randomUUID()
      const record = {
        id,
        projectId: pkg.projectId,
        projectName: pkg.projectName || 'Untitled',
        environment: pkg.environment || 'production',
        status: 'queued',
        framework: pkg.framework || 'static',
        provider: 'cloudflare-pages',
        slug: pkg.slug || slugify(pkg.projectName),
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        stages: makeStages(),
        logs: [],
        version: Date.now(),
      }
      deployments.set(id, record)

      await runDeployment(env, record, pkg)

      const final = deployments.get(id)
      // Always return JSON the client can parse; HTTP 200 with status field
      // so the UI can show stages even on failure.
      return json(
        {
          deploymentId: id,
          status: final.status,
          stages: final.stages,
          message:
            final.status === 'ready'
              ? 'Deployment ready'
              : final.error || final.status,
          record: final,
        },
        200,
        request,
        env
      )
    }

    // Get one deployment
    const statusMatch = path.match(/^\/api\/deploy\/([^/]+)$/)
    if (statusMatch && request.method === 'GET') {
      const id = decodeURIComponent(statusMatch[1])
      const record = deployments.get(id)
      if (!record) {
        return json({ error: 'Deployment not found' }, 404, request, env)
      }
      return json(record, 200, request, env)
    }

    // Cancel
    const cancelMatch = path.match(/^\/api\/deploy\/([^/]+)\/cancel$/)
    if (cancelMatch && request.method === 'POST') {
      const id = decodeURIComponent(cancelMatch[1])
      const record = deployments.get(id)
      if (!record) {
        return json({ error: 'Deployment not found' }, 404, request, env)
      }
      if (record.status === 'ready' || record.status === 'failed') {
        return json(
          { error: 'Deployment already finished', cancelled: false },
          400,
          request,
          env
        )
      }
      record.status = 'cancelled'
      record.finishedAt = new Date().toISOString()
      record.logs = record.logs || []
      record.logs.push('Deployment cancelled')
      deployments.set(id, record)
      return json({ cancelled: true, record }, 200, request, env)
    }

    if (path === '/api/deploy' || path === '/deploy') {
      return json(
        {
          error: `Method ${request.method} not allowed on ${path}. Use POST to start a deployment, GET to list.`,
        },
        405,
        request,
        env
      )
    }

    return json(
      { error: 'Not found', path, method: request.method },
      404,
      request,
      env
    )
  },
}
