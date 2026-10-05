/**
 * VEXDYN Forge — Deployment Backend (Cloudflare Worker)
 * v1.6.7-streaming — NDJSON live progress + working Direct Upload
 *
 * Secrets: CF_API_TOKEN, CF_ACCOUNT_ID
 *
 * CRITICAL (do not break):
 * - Manifest keys MUST start with "/"
 * - blake3(base64(content)+ext).hex().slice(0,32)
 * - upsert-hashes after asset upload
 * - Use project.subdomain for live URL when present
 * - production_branch: 'production' + deploy branch production
 */

import { blake3 } from './vendor/noble/blake3.js'

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
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Accept',
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

/** Human recovery hints for common failures */
function errorHint(message) {
  const m = String(message || '')
  if (/api.?token|unauthorized|401|authentication|invalid token/i.test(m)) {
    return 'Check the CF_API_TOKEN secret on the Worker (Pages Edit permission).'
  }
  if (/account.?id|CF_ACCOUNT/i.test(m)) {
    return 'Check the CF_ACCOUNT_ID secret on the Worker.'
  }
  if (/not configured|missing CF_/i.test(m)) {
    return 'Set Worker secrets: npx wrangler secret put CF_API_TOKEN and CF_ACCOUNT_ID.'
  }
  if (/index\.html|missing html|entry file/i.test(m)) {
    return 'Add an index.html file at the project root, then deploy again.'
  }
  if (/already exists|taken|conflict/i.test(m)) {
    return 'That Pages name may be taken. Try another project name or delete the old project in Cloudflare.'
  }
  if (/framework|not supported/i.test(m)) {
    return 'Only static HTML/CSS/JS projects can be deployed right now.'
  }
  if (/upload token|jwt/i.test(m)) {
    return 'Could not get a Pages upload token. Confirm the API token has Cloudflare Pages Edit.'
  }
  if (/asset upload|manifest/i.test(m)) {
    return 'Asset upload failed. Redeploy the Worker and try a small static project again.'
  }
  return undefined
}

function setStage(record, stageId, status, detail, logLine, stream) {
  if (status === 'running') record.status = stageId
  const stage = record.stages.find((s) => s.id === stageId)
  if (stage) {
    const now = new Date().toISOString()
    if (status === 'running' && !stage.startedAt) {
      stage.startedAt = now
    }
    if (
      (status === 'done' || status === 'failed' || status === 'skipped') &&
      !stage.finishedAt
    ) {
      stage.finishedAt = now
      if (stage.startedAt) {
        stage.durationMs = Math.max(
          0,
          new Date(stage.finishedAt).getTime() -
            new Date(stage.startedAt).getTime()
        )
      }
    }
    stage.status = status
    if (detail) stage.detail = detail
    if (logLine) {
      stage.logs = stage.logs || []
      stage.logs.push(logLine)
      record.logs = record.logs || []
      record.logs.push(logLine)
    }
  }

  if (stream && stream.emit) {
    stream.emit({
      type: 'stage',
      id: stageId,
      status: status,
      detail: detail || (stage && stage.detail),
      ts: Date.now(),
    })
    if (logLine) {
      stream.emit({
        type: 'log',
        stage: stageId,
        line: logLine,
        ts: Date.now(),
      })
    }
  }
}

function markPreviousDone(record, upToId, stream) {
  const idx = STAGE_ORDER.indexOf(upToId)
  for (let i = 0; i < idx; i++) {
    const s = record.stages.find((x) => x.id === STAGE_ORDER[i])
    if (
      s &&
      s.status !== 'done' &&
      s.status !== 'failed' &&
      s.status !== 'skipped'
    ) {
      setStage(record, STAGE_ORDER[i], 'done', s.detail, undefined, stream)
    }
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
  if (!/^[a-z]/.test(slug)) slug = 'p-' + slug
  return slug
}

function bytesToBase64(uint8) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < uint8.length; i += chunk) {
    binary += String.fromCharCode.apply(null, uint8.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function pagesContentHash(content, path) {
  const bytes =
    typeof content === 'string'
      ? new TextEncoder().encode(content ?? '')
      : content instanceof Uint8Array
        ? content
        : new TextEncoder().encode(String(content ?? ''))
  const base64Contents = bytesToBase64(bytes)
  const base = String(path || '').split('/').pop() || ''
  const dot = base.lastIndexOf('.')
  const extension = dot > 0 ? base.slice(dot + 1) : ''
  const input = new TextEncoder().encode(base64Contents + extension)
  const digest = blake3(input)
  return Array.from(digest)
    .map(function (b) {
      return b.toString(16).padStart(2, '0')
    })
    .join('')
    .slice(0, 32)
}

function guessContentType(path) {
  const lower = path.toLowerCase()
  if (lower.endsWith('.html') || lower.endsWith('.htm'))
    return 'text/html; charset=utf-8'
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
  if (lower.endsWith('.txt') || lower.endsWith('.md'))
    return 'text/plain; charset=utf-8'
  return 'application/octet-stream'
}

async function cfJson(env, path, init) {
  init = init || {}
  const res = await fetch('https://api.cloudflare.com/client/v4' + path, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + env.CF_API_TOKEN,
      ...(init.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(init.headers || {}),
    },
  })
  const data = await res.json().catch(function () {
    return {}
  })
  return { res: res, data: data }
}

async function ensurePagesProject(env, slug) {
  const accountId = env.CF_ACCOUNT_ID
  {
    const result = await cfJson(
      env,
      '/accounts/' + accountId + '/pages/projects/' + slug
    )
    if (result.res.ok && result.data.success)
      return { project: result.data.result, created: false }
  }
  const created = await cfJson(env, '/accounts/' + accountId + '/pages/projects', {
    method: 'POST',
    body: JSON.stringify({ name: slug, production_branch: 'production' }),
  })
  if (created.res.ok && created.data.success)
    return { project: created.data.result, created: true }

  const msg =
    (created.data.errors &&
      created.data.errors[0] &&
      created.data.errors[0].message) ||
    'Create project failed (' + created.res.status + ')'
  if (/already exists|taken|conflict/i.test(String(msg))) {
    const alt = slug + '-' + Math.random().toString(36).slice(2, 6)
    const retry = await cfJson(
      env,
      '/accounts/' + accountId + '/pages/projects',
      {
        method: 'POST',
        body: JSON.stringify({ name: alt, production_branch: 'production' }),
      }
    )
    if (retry.res.ok && retry.data.success) {
      return { project: retry.data.result, created: true }
    }
    throw new Error(
      (retry.data.errors &&
        retry.data.errors[0] &&
        retry.data.errors[0].message) ||
        msg
    )
  }
  throw new Error(msg)
}

async function deployStaticFiles(env, projectName, files) {
  const accountId = env.CF_ACCOUNT_ID
  const authHeader = { Authorization: 'Bearer ' + env.CF_API_TOKEN }

  const normalized = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const path = (f.path || '').replace(/^\/+/, '').replace(/\\/g, '/')
    if (!path) continue
    normalized.push({
      path: path,
      content: f.content ?? '',
      bytes: new TextEncoder().encode(f.content ?? ''),
    })
  }
  if (!normalized.length) throw new Error('No files to deploy')

  const manifest = {}
  const hashed = []
  for (let i = 0; i < normalized.length; i++) {
    const f = normalized[i]
    const hash = pagesContentHash(f.content, f.path)
    manifest['/' + f.path] = hash
    hashed.push({ path: f.path, content: f.content, bytes: f.bytes, hash: hash })
  }

  const tokenRes = await fetch(
    'https://api.cloudflare.com/client/v4/accounts/' +
      accountId +
      '/pages/projects/' +
      projectName +
      '/upload-token',
    { headers: authHeader }
  )
  const tokenData = await tokenRes.json().catch(function () {
    return {}
  })
  if (!tokenRes.ok || !tokenData.success || !tokenData.result || !tokenData.result.jwt) {
    throw new Error(
      (tokenData.errors && tokenData.errors[0] && tokenData.errors[0].message) ||
        'Failed to get upload token (' + tokenRes.status + ')'
    )
  }
  const jwt = tokenData.result.jwt
  const toUpload = hashed

  for (let i = 0; i < toUpload.length; i += 50) {
    const batch = toUpload.slice(i, i + 50).map(function (f) {
      return {
        key: f.hash,
        value: bytesToBase64(f.bytes),
        base64: true,
        metadata: { contentType: guessContentType(f.path) },
      }
    })
    const upRes = await fetch(
      'https://api.cloudflare.com/client/v4/pages/assets/upload',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + jwt,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      }
    )
    const upData = await upRes.json().catch(function () {
      return {}
    })
    if (!upRes.ok || upData.success === false) {
      throw new Error(
        (upData.errors && upData.errors[0] && upData.errors[0].message) ||
          'Asset upload failed (' + upRes.status + ')'
      )
    }
  }

  try {
    await fetch(
      'https://api.cloudflare.com/client/v4/pages/assets/upsert-hashes',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + jwt,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashes: hashed.map(function (f) {
            return f.hash
          }),
        }),
      }
    )
  } catch (e) {
    /* non-fatal */
  }

  const form = new FormData()
  form.append('manifest', JSON.stringify(manifest))
  form.append('branch', 'production')

  const depRes = await fetch(
    'https://api.cloudflare.com/client/v4/accounts/' +
      accountId +
      '/pages/projects/' +
      projectName +
      '/deployments',
    {
      method: 'POST',
      headers: authHeader,
      body: form,
    }
  )
  const depData = await depRes.json().catch(function () {
    return {}
  })
  if (!depRes.ok || !depData.success) {
    const form2 = new FormData()
    form2.append('manifest', JSON.stringify(manifest))
    form2.append('branch', 'main')
    const retry = await fetch(
      'https://api.cloudflare.com/client/v4/accounts/' +
        accountId +
        '/pages/projects/' +
        projectName +
        '/deployments',
      {
        method: 'POST',
        headers: authHeader,
        body: form2,
      }
    )
    const retryData = await retry.json().catch(function () {
      return {}
    })
    if (!retry.ok || !retryData.success) {
      throw new Error(
        (depData.errors && depData.errors[0] && depData.errors[0].message) ||
          (retryData.errors &&
            retryData.errors[0] &&
            retryData.errors[0].message) ||
          'Create deployment failed (' + depRes.status + ')'
      )
    }
    return await waitForDeployment(env, projectName, retryData.result)
  }

  return await waitForDeployment(env, projectName, depData.result)
}

async function waitForDeployment(env, projectName, deployment) {
  const accountId = env.CF_ACCOUNT_ID
  const id = deployment && deployment.id
  if (!id) return deployment

  for (let i = 0; i < 15; i++) {
    const result = await cfJson(
      env,
      '/accounts/' +
        accountId +
        '/pages/projects/' +
        projectName +
        '/deployments/' +
        id
    )
    if (result.res.ok && result.data.success && result.data.result) {
      const d = result.data.result
      const status = d.latest_stage && d.latest_stage.status
      if (status === 'success') return d
      if (status === 'failure' || status === 'canceled') {
        throw new Error(
          'Cloudflare deployment ' +
            status +
            (d.latest_stage && d.latest_stage.name
              ? ' at stage ' + d.latest_stage.name
              : '') +
            '. The site may be empty — check file paths include index.html at the root.'
        )
      }
    }
    await new Promise(function (r) {
      setTimeout(r, 3000)
    })
  }
  return deployment
}

function pickLiveUrl(deployment, projectName, subdomain) {
  const host = subdomain || projectName + '.pages.dev'
  const production = 'https://' + host
  const deploymentUrl =
    (deployment && deployment.url) ||
    (deployment &&
      Array.isArray(deployment.aliases) &&
      deployment.aliases[0]) ||
    null
  return { url: production, production: production, deploymentUrl: deploymentUrl }
}

async function runDeployment(env, record, pkg, stream) {
  try {
    setStage(
      record,
      'preparing',
      'running',
      'Loading project',
      'Preparing deployment…',
      stream
    )
    markPreviousDone(record, 'preparing', stream)
    setStage(
      record,
      'preparing',
      'done',
      'Project: ' + pkg.projectName,
      '✓ Project loaded (' + pkg.files.length + ' files)',
      stream
    )

    setStage(
      record,
      'validating',
      'running',
      undefined,
      'Validating files…',
      stream
    )
    markPreviousDone(record, 'validating', stream)
    if (!pkg.files || !pkg.files.length) throw new Error('No files to deploy')
    if (pkg.framework !== 'static') {
      throw new Error(
        'Framework "' +
          pkg.framework +
          '" is not supported yet. Use a static HTML/CSS/JS project.'
      )
    }
    const hasHtml = pkg.files.some(function (f) {
      return f.path === 'index.html' || f.path.endsWith('.html')
    })
    if (!hasHtml) throw new Error('Missing HTML entry file (index.html)')
    setStage(
      record,
      'validating',
      'done',
      'Static site validated',
      '✓ Files validated',
      stream
    )

    setStage(record, 'building', 'running', undefined, 'Building…', stream)
    markPreviousDone(record, 'building', stream)
    setStage(
      record,
      'building',
      'done',
      'Skipped (static)',
      '✓ No build required for static HTML/CSS/JS',
      stream
    )

    setStage(
      record,
      'packaging',
      'running',
      undefined,
      'Packaging output…',
      stream
    )
    markPreviousDone(record, 'packaging', stream)
    setStage(
      record,
      'packaging',
      'done',
      pkg.files.length + ' files ready',
      '✓ Output prepared (' + pkg.files.length + ' files)',
      stream
    )

    if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
      throw new Error('Server missing CF_API_TOKEN or CF_ACCOUNT_ID')
    }

    setStage(
      record,
      'uploading',
      'running',
      undefined,
      'Creating Pages project…',
      stream
    )
    markPreviousDone(record, 'uploading', stream)
    const slug = pkg.slug || slugify(pkg.projectName)
    const ensured = await ensurePagesProject(env, slug)
    const project = ensured.project
    const projectName = project.name || slug
    record.slug = projectName
    setStage(
      record,
      'uploading',
      'done',
      'Project: ' + projectName,
      '✓ Pages project ready (' + projectName + ')',
      stream
    )

    setStage(
      record,
      'deploying',
      'running',
      undefined,
      'Uploading assets to Cloudflare…',
      stream
    )
    markPreviousDone(record, 'deploying', stream)
    const result = await deployStaticFiles(env, projectName, pkg.files)
    const urls = pickLiveUrl(result, projectName, project.subdomain)
    const url = urls.url
    const production = urls.production
    const deploymentUrl = urls.deploymentUrl

    const diag1 = 'Deployment id: ' + (result && result.id)
    const diag2 =
      'Environment: ' + (result && result.environment) + ' (must be "production")'
    const diag3 =
      'Manifest paths: ' +
      pkg.files
        .map(function (f) {
          return '/' + f.path.replace(/^\/+/, '')
        })
        .join(', ')
    record.logs.push(diag1, diag2, diag3)
    if (stream && stream.emit) {
      stream.emit({
        type: 'log',
        stage: 'deploying',
        line: diag1,
        ts: Date.now(),
      })
      stream.emit({
        type: 'log',
        stage: 'deploying',
        line: diag2,
        ts: Date.now(),
      })
      stream.emit({
        type: 'log',
        stage: 'deploying',
        line: diag3,
        ts: Date.now(),
      })
    }

    setStage(
      record,
      'deploying',
      'done',
      url,
      '✓ Cloudflare deployment created',
      stream
    )

    setStage(
      record,
      'finalizing',
      'running',
      undefined,
      'Finalizing…',
      stream
    )
    markPreviousDone(record, 'finalizing', stream)
    record.url = url
    record.status = 'ready'
    record.finishedAt = new Date().toISOString()
    if (record.startedAt) {
      record.durationMs = Math.max(
        0,
        new Date(record.finishedAt).getTime() -
          new Date(record.startedAt).getTime()
      )
    }
    setStage(
      record,
      'finalizing',
      'done',
      'Live',
      '✓ Deployment ready — ' + url,
      stream
    )
    record.logs.push('Deployment successful')
    record.logs.push(url)
    if (production && production !== url) {
      record.logs.push('Production host: ' + production)
    }
    if (deploymentUrl && deploymentUrl !== url) {
      record.logs.push('Deployment alias: ' + deploymentUrl)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const hint = errorHint(message)
    record.status = 'failed'
    record.error = message
    record.hint = hint
    record.finishedAt = new Date().toISOString()
    if (record.startedAt) {
      record.durationMs = Math.max(
        0,
        new Date(record.finishedAt).getTime() -
          new Date(record.startedAt).getTime()
      )
    }
    record.logs = record.logs || []
    record.logs.push('✕ ' + message)

    var failedStage
    for (var si = 0; si < record.stages.length; si++) {
      var s = record.stages[si]
      if (s.status === 'running') {
        failedStage = s.id
        setStage(record, s.id, 'failed', message, '✕ ' + message, stream)
      }
    }
    record.failedStage = failedStage

    if (stream && stream.emit) {
      stream.emit({
        type: 'error',
        stage: failedStage,
        message: message,
        hint: hint,
        ts: Date.now(),
      })
    }
  }
  deployments.set(record.id, record)
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) })
    }

    const url = new URL(request.url)
    var path = url.pathname.replace(/\/+$/, '') || '/'
    if (path.startsWith('/api/deploy/api/')) {
      path = path.replace(/^\/api\/deploy/, '')
    }

    if (
      (path === '/api/health' || path === '/health') &&
      request.method === 'GET'
    ) {
      return json(
        {
          ok: true,
          service: 'vexdyn-forge-deploy',
          configured: Boolean(env.CF_API_TOKEN && env.CF_ACCOUNT_ID),
          version: '1.6.7-streaming',
        },
        200,
        env
      )
    }

    if (path === '/api/deploy' && request.method === 'GET') {
      const projectId = url.searchParams.get('projectId')
      const all = Array.from(deployments.values())
      var list = projectId
        ? all.filter(function (d) {
            return d.projectId === projectId
          })
        : all
      list.sort(function (a, b) {
        return b.createdAt.localeCompare(a.createdAt)
      })
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

      var body
      try {
        body = await request.json()
      } catch (e) {
        return json({ error: 'Invalid JSON body' }, 400, env)
      }

      const pkg = body.package
      if (!pkg || !pkg.projectId || !pkg.files) {
        return json(
          { error: 'Missing package.projectId or package.files' },
          400,
          env
        )
      }

      const id = crypto.randomUUID()
      const record = {
        id: id,
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

      const accept = (request.headers.get('Accept') || '').toLowerCase()
      const wantsStream = accept.indexOf('application/x-ndjson') >= 0

      if (wantsStream) {
        const pair = new TransformStream()
        const writer = pair.writable.getWriter()
        const encoder = new TextEncoder()

        const stream = {
          emit: function (obj) {
            try {
              writer.write(encoder.encode(JSON.stringify(obj) + '\n'))
            } catch (e) {
              /* client disconnected */
            }
          },
        }

        const run = (async function () {
          try {
            await runDeployment(env, record, pkg, stream)
            const final = deployments.get(id)
            stream.emit({ type: 'done', record: final })
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            stream.emit({
              type: 'error',
              message: message,
              hint: errorHint(message),
              ts: Date.now(),
            })
            const final = deployments.get(id)
            if (final) stream.emit({ type: 'done', record: final })
          } finally {
            try {
              await writer.close()
            } catch (e2) {
              /* ignore */
            }
          }
        })()

        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(run)
        } else {
          await run
        }

        return new Response(pair.readable, {
          status: 200,
          headers: {
            'Content-Type': 'application/x-ndjson',
            'Cache-Control': 'no-store',
            ...corsHeaders(env),
          },
        })
      }

      await runDeployment(env, record, pkg, null)
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
      return json({ cancelled: true, record: record }, 200, env)
    }

    return json(
      { error: 'Not found', path: path, method: request.method },
      404,
      env
    )
  },
}
