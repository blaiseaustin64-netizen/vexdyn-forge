/**
 * VEXDYN Forge — Deployment Backend (Cloudflare Worker)
 * v1.6.3 — Direct Upload that actually serves files
 *
 * Secrets: CF_API_TOKEN, CF_ACCOUNT_ID
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

const deployments = new Map()

function corsHeaders(env) {
  const origin = env.DEPLOY_CORS_ORIGIN || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(env),
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
  if (status === 'running') record.status = stageId
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
    if (s && s.status !== 'done' && s.status !== 'failed') s.status = 'done'
  }
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

async function sha256Hex(content) {
  const data = new TextEncoder().encode(content ?? '')
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function bytesToBase64(uint8) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < uint8.length; i += chunk) {
    binary += String.fromCharCode(...uint8.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function guessContentType(path) {
  const lower = path.toLowerCase()
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html; charset=utf-8'
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8'
  if (lower.endsWith('.js') || lower.endsWith('.mjs'))
    return 'application/javascript; charset=utf-8'
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.ico')) return 'image/x-icon'
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'text/plain; charset=utf-8'
  return 'application/octet-stream'
}

async function cfJson(env, path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
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

async function ensurePagesProject(env, slug) {
  const accountId = env.CF_ACCOUNT_ID
  {
    const { res, data } = await cfJson(
      env,
      `/accounts/${accountId}/pages/projects/${slug}`
    )
    if (res.ok && data.success) return { project: data.result, created: false }
  }
  const { res, data } = await cfJson(env, `/accounts/${accountId}/pages/projects`, {
    method: 'POST',
    body: JSON.stringify({ name: slug, production_branch: 'production' }),
  })
  if (res.ok && data.success) return { project: data.result, created: true }

  const msg = data?.errors?.[0]?.message || `Create project failed (${res.status})`
  if (/already exists|taken|conflict/i.test(String(msg))) {
    const alt = `${slug}-${Math.random().toString(36).slice(2, 6)}`
    const retry = await cfJson(env, `/accounts/${accountId}/pages/projects`, {
      method: 'POST',
      body: JSON.stringify({ name: alt, production_branch: 'production' }),
    })
    if (retry.res.ok && retry.data.success) {
      return { project: retry.data.result, created: true }
    }
    throw new Error(retry.data?.errors?.[0]?.message || msg)
  }
  throw new Error(msg)
}

/**
 * Direct Upload — Wrangler-compatible:
 * 1) upload-token
 * 2) upload assets by content hash
 * 3) create deployment with manifest
 * 4) poll until CF finishes (or fails)
 */
async function deployStaticFiles(env, projectName, files) {
  const accountId = env.CF_ACCOUNT_ID
  const authHeader = { Authorization: `Bearer ${env.CF_API_TOKEN}` }

  // Normalize file list
  const normalized = []
  for (const f of files) {
    const path = (f.path || '').replace(/^\/+/, '').replace(/\\/g, '/')
    if (!path) continue
    normalized.push({
      path,
      content: f.content ?? '',
      bytes: new TextEncoder().encode(f.content ?? ''),
    })
  }
  if (!normalized.length) throw new Error('No files to deploy')

  // Hashes: first 32 chars of SHA-256 (Wrangler / Pages convention)
  const manifest = {}
  const hashed = []
  for (const f of normalized) {
    const full = await sha256Hex(f.content)
    const hash = full.slice(0, 32)
    manifest[f.path] = hash
    hashed.push({ ...f, hash })
  }

  // 1) JWT
  const tokenRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/upload-token`,
    { headers: authHeader }
  )
  const tokenData = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !tokenData.success || !tokenData.result?.jwt) {
    throw new Error(
      tokenData?.errors?.[0]?.message ||
        `Failed to get upload token (${tokenRes.status})`
    )
  }
  const jwt = tokenData.result.jwt

  // Always upload all assets (do not skip via check-missing).
  // Skipping when check-missing returns [] caused empty 404 sites.
  const toUpload = hashed

  // 3) Upload assets
  for (let i = 0; i < toUpload.length; i += 50) {
    const batch = toUpload.slice(i, i + 50).map((f) => ({
      key: f.hash,
      value: bytesToBase64(f.bytes),
      base64: true,
      metadata: { contentType: guessContentType(f.path) },
    }))
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
        upData?.errors?.[0]?.message || `Asset upload failed (${upRes.status})`
      )
    }
  }

  // 4) Create deployment with manifest (string field — required)
  const form = new FormData()
  form.append('manifest', JSON.stringify(manifest))
  // Direct Upload production branch used at project create time
  form.append('branch', 'production')

  const depRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`,
    {
      method: 'POST',
      headers: authHeader,
      body: form,
    }
  )
  const depData = await depRes.json().catch(() => ({}))
  if (!depRes.ok || !depData.success) {
    // Retry once with branch=main (older projects)
    const form2 = new FormData()
    form2.append('manifest', JSON.stringify(manifest))
    form2.append('branch', 'main')
    const retry = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`,
      {
        method: 'POST',
        headers: authHeader,
        body: form2,
      }
    )
    const retryData = await retry.json().catch(() => ({}))
    if (!retry.ok || !retryData.success) {
      throw new Error(
        depData?.errors?.[0]?.message ||
          retryData?.errors?.[0]?.message ||
          `Create deployment failed (${depRes.status})`
      )
    }
    return await waitForDeployment(env, projectName, retryData.result)
  }

  return await waitForDeployment(env, projectName, depData.result)
}

async function waitForDeployment(env, projectName, deployment) {
  const accountId = env.CF_ACCOUNT_ID
  const id = deployment?.id
  if (!id) return deployment

  // Poll up to ~45s for CF to finish deploying files
  for (let i = 0; i < 15; i++) {
    const { res, data } = await cfJson(
      env,
      `/accounts/${accountId}/pages/projects/${projectName}/deployments/${id}`
    )
    if (res.ok && data.success && data.result) {
      const d = data.result
      const stage = d.latest_stage
      const status = stage?.status
      if (status === 'success') {
        return d
      }
      if (status === 'failure' || status === 'canceled') {
        throw new Error(
          `Cloudflare deployment ${status}${
            d.latest_stage?.name ? ` at stage ${d.latest_stage.name}` : ''
          }. The site may be empty — check file paths include index.html at the root.`
        )
      }
    }
    await new Promise((r) => setTimeout(r, 3000))
  }
  // Timed out waiting — return last known (may still become live)
  return deployment
}

function pickLiveUrl(deployment, projectName) {
  const production = `https://${projectName}.pages.dev`
  const deploymentUrl =
    deployment?.url ||
    (Array.isArray(deployment?.aliases) && deployment.aliases[0]) ||
    null
  // Prefer the deployment-specific URL from Cloudflare (always tied to this deploy).
  // Fall back to production subdomain.
  const url = deploymentUrl || production
  return { url, production, deploymentUrl }
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
        `Framework "${pkg.framework}" is not supported yet. Use a static HTML/CSS/JS project.`
      )
    }
    const hasHtml = pkg.files.some(
      (f) => f.path === 'index.html' || f.path.endsWith('.html')
    )
    if (!hasHtml) throw new Error('Missing HTML entry file (index.html)')
    setStage(record, 'validating', 'done', 'Static site validated', '✓ Files validated')

    setStage(record, 'building', 'running', undefined, 'Building…')
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
      throw new Error('Server missing CF_API_TOKEN or CF_ACCOUNT_ID')
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

    setStage(record, 'deploying', 'running', undefined, 'Uploading assets to Cloudflare…')
    markPreviousDone(record, 'deploying')
    const result = await deployStaticFiles(env, projectName, pkg.files)
    const { url, production, deploymentUrl } = pickLiveUrl(result, projectName)
    setStage(
      record,
      'deploying',
      'done',
      url,
      `✓ Cloudflare deployment created`
    )

    setStage(record, 'finalizing', 'running', undefined, 'Finalizing…')
    markPreviousDone(record, 'finalizing')
    // Use deployment URL first — production subdomain can 522 if an older
    // broken project occupies the same base name.
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
    record.logs.push('Deployment successful')
    record.logs.push(url)
    if (production && production !== url) {
      record.logs.push(`Production host: ${production}`)
    }
    if (deploymentUrl && deploymentUrl !== url) {
      record.logs.push(`Deployment alias: ${deploymentUrl}`)
    }
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
      return new Response(null, { status: 204, headers: corsHeaders(env) })
    }

    const url = new URL(request.url)
    let path = url.pathname.replace(/\/+$/, '') || '/'
    if (path.startsWith('/api/deploy/api/')) {
      path = path.replace(/^\/api\/deploy/, '')
    }

    if ((path === '/api/health' || path === '/health') && request.method === 'GET') {
      return json(
        {
          ok: true,
          service: 'vexdyn-forge-deploy',
          configured: Boolean(env.CF_API_TOKEN && env.CF_ACCOUNT_ID),
          version: '1.6.4-always-upload',
        },
        200,
        env
      )
    }

    if (path === '/api/deploy' && request.method === 'GET') {
      const projectId = url.searchParams.get('projectId')
      const all = Array.from(deployments.values())
      const list = projectId
        ? all.filter((d) => d.projectId === projectId)
        : all
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return json(list, 200, env)
    }

    if (path === '/api/deploy' && request.method === 'POST') {
      if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
        return json(
          {
            error:
              'Cloudflare credentials are not configured. Set CF_API_TOKEN and CF_ACCOUNT_ID secrets.',
          },
          503,
          env
        )
      }

      let body
      try {
        body = await request.json()
      } catch {
        return json({ error: 'Invalid JSON body' }, 400, env)
      }

      const pkg = body.package
      if (!pkg?.projectId || !pkg?.files) {
        return json(
          { error: 'Missing package.projectId or package.files' },
          400,
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
        env
      )
    }

    const statusMatch = path.match(/^\/api\/deploy\/([^/]+)$/)
    if (statusMatch && request.method === 'GET') {
      const id = decodeURIComponent(statusMatch[1])
      const record = deployments.get(id)
      if (!record) return json({ error: 'Deployment not found' }, 404, env)
      return json(record, 200, env)
    }

    const cancelMatch = path.match(/^\/api\/deploy\/([^/]+)\/cancel$/)
    if (cancelMatch && request.method === 'POST') {
      const id = decodeURIComponent(cancelMatch[1])
      const record = deployments.get(id)
      if (!record) return json({ error: 'Deployment not found' }, 404, env)
      if (record.status === 'ready' || record.status === 'failed') {
        return json(
          { error: 'Deployment already finished', cancelled: false },
          400,
          env
        )
      }
      record.status = 'cancelled'
      record.finishedAt = new Date().toISOString()
      record.logs.push('Deployment cancelled')
      deployments.set(id, record)
      return json({ cancelled: true, record }, 200, env)
    }

    return json({ error: 'Not found', path, method: request.method }, 404, env)
  },
}
