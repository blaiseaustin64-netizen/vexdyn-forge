/**
 * VEXDYN Forge — Deployment Backend (Cloudflare Worker)
 *
 * Secrets (wrangler secret put):
 *   CF_API_TOKEN   — Cloudflare API token with Pages:Edit
 *   CF_ACCOUNT_ID  — Cloudflare account ID
 *
 * Optional:
 *   DEPLOY_CORS_ORIGIN — allowed origin (default *)
 *
 * Routes:
 *   POST /api/deploy              — start deployment
 *   GET  /api/deploy/:id          — deployment status
 *   GET  /api/deploy?projectId=   — list by project
 *   POST /api/deploy/:id/cancel   — cancel (best-effort)
 *   GET  /api/health              — health check
 *
 * Never expose CF_API_TOKEN to the browser.
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

/** In-memory store (Durable Object / KV recommended for production) */
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
  record.status = stageId === 'finalizing' && status === 'done' ? record.status : stageId
  if (status === 'done' && stageId === 'finalizing') {
    /* handled by caller */
  } else if (status === 'running') {
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
  // Try get
  {
    const { res, data } = await cfFetch(
      env,
      `/accounts/${accountId}/pages/projects/${slug}`
    )
    if (res.ok && data.success) {
      return { project: data.result, created: false }
    }
  }
  // Create
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
    // Name taken — try with suffix
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
      throw new Error(
        retry.data?.errors?.[0]?.message || msg
      )
    }
    throw new Error(msg)
  }
  return { project: data.result, created: true }
}

/**
 * Cloudflare Pages Direct Upload
 * 1. Get upload token
 * 2. Upload files as FormData to the upload URL
 */
async function deployStaticFiles(env, projectName, files, branch = 'main') {
  const accountId = env.CF_ACCOUNT_ID

  // Create deployment via direct upload
  // API: POST /accounts/{account_id}/pages/projects/{project_name}/deployments
  const form = new FormData()

  // manifest maps path -> hash (optional for small deploys)
  // We'll send files with path as field names
  for (const f of files) {
    const path = f.path.startsWith('/') ? f.path.slice(1) : f.path
    const bytes = new TextEncoder().encode(f.content ?? '')
    const blob = new Blob([bytes], { type: 'application/octet-stream' })
    form.append(path, blob, path)
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
    },
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) {
    const msg =
      data?.errors?.[0]?.message ||
      JSON.stringify(data?.errors || data) ||
      `Upload failed (${res.status})`
    throw new Error(msg)
  }
  return data.result
}

async function runDeployment(env, record, pkg) {
  try {
    // Preparing
    setStage(record, 'preparing', 'running', 'Loading project', 'Preparing deployment…')
    markPreviousDone(record, 'preparing')
    setStage(
      record,
      'preparing',
      'done',
      `Project: ${pkg.projectName}`,
      `✓ Project loaded (${pkg.files.length} files)`
    )

    // Validating
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
    setStage(
      record,
      'validating',
      'done',
      'Static site validated',
      '✓ Files validated'
    )

    // Building — static = skip build
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

    // Packaging
    setStage(record, 'packaging', 'running', undefined, 'Packaging output…')
    markPreviousDone(record, 'packaging')
    setStage(
      record,
      'packaging',
      'done',
      `${pkg.files.length} files ready`,
      `✓ Output prepared (${pkg.files.length} files)`
    )

    // Uploading + Deploying via Cloudflare
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

    setStage(record, 'deploying', 'running', undefined, 'Uploading files to Cloudflare…')
    markPreviousDone(record, 'deploying')

    const result = await deployStaticFiles(env, projectName, pkg.files)
    const url =
      result?.url ||
      result?.aliases?.[0] ||
      `https://${projectName}.pages.dev`

    setStage(
      record,
      'deploying',
      'done',
      url,
      `✓ Cloudflare deployment created`
    )

    // Finalizing
    setStage(record, 'finalizing', 'running', undefined, 'Finalizing…')
    markPreviousDone(record, 'finalizing')
    record.url = url
    record.status = 'ready'
    record.finishedAt = new Date().toISOString()
    setStage(
      record,
      'finalizing',
      'done',
      'Live',
      `✓ Deployment ready — ${url}`
    )
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
    // Mark current running stage as failed
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
    const path = url.pathname.replace(/\/+$/, '') || '/'

    if (path === '/api/health' && request.method === 'GET') {
      return json(
        {
          ok: true,
          service: 'vexdyn-forge-deploy',
          configured: Boolean(env.CF_API_TOKEN && env.CF_ACCOUNT_ID),
        },
        200,
        request,
        env
      )
    }

    // List
    if (path === '/api/deploy' && request.method === 'GET') {
      const projectId = url.searchParams.get('projectId')
      const all = Array.from(deployments.values())
      const list = projectId
        ? all.filter((d) => d.projectId === projectId)
        : all
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return json(list, 200, request, env)
    }

    // Start
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

      // Run async — Worker may wait via waitUntil
      const run = runDeployment(env, record, pkg)
      if (typeof globalThis.ExecutionContext !== 'undefined') {
        // best effort
      }
      // For reliability in Worker, await the deployment so status is complete
      // (Direct Upload is usually fast for static sites)
      await run

      const final = deployments.get(id)
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
        final.status === 'failed' ? 500 : 200,
        request,
        env
      )
    }

    // Get status
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
      // Best-effort only — CF may not cancel mid-upload
      record.status = 'cancelled'
      record.finishedAt = new Date().toISOString()
      record.logs = record.logs || []
      record.logs.push('Deployment cancelled')
      deployments.set(id, record)
      return json({ cancelled: true, record }, 200, request, env)
    }

    return json({ error: 'Not found' }, 404, request, env)
  },
}
