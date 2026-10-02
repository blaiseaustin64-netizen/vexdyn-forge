/**
 * Cloudflare Pages Direct Upload
 * Uploads static files using multipart/form-data + manifest.
 */
async function deployStaticFiles(env, projectName, files) {
  const accountId = env.CF_ACCOUNT_ID;

  if (!accountId) {
    throw new Error("CF_ACCOUNT_ID is missing");
  }

  if (!env.CF_API_TOKEN) {
    throw new Error("CF_API_TOKEN is missing");
  }

  if (!projectName) {
    throw new Error("Cloudflare Pages project name is missing");
  }

  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("No files were provided for deployment");
  }

  const manifest = {};
  const uploadFiles = [];

  /*
   * Build the manifest first.
   * Cloudflare Pages expects:
   *
   * {
   *   "index.html": "sha256-hash",
   *   "style.css": "sha256-hash"
   * }
   */
  for (const file of files) {
    const relPath = String(file.path || "")
      .replace(/^\/+/, "")
      .trim();

    if (!relPath) {
      continue;
    }

    const content = String(file.content ?? "");

    const hash = await sha256Hex(content);

    manifest[relPath] = hash;

    uploadFiles.push({
      path: relPath,
      content,
    });
  }

  if (Object.keys(manifest).length === 0) {
    throw new Error("No valid files were provided for deployment");
  }

  /*
   * Create multipart/form-data.
   *
   * IMPORTANT:
   * Do NOT manually set Content-Type.
   * Cloudflare Workers/fetch will automatically create
   * the correct multipart boundary.
   */
  const form = new FormData();

  /*
   * Add manifest.
   */
  form.append(
    "manifest",
    JSON.stringify(manifest)
  );

  /*
   * Add all files referenced by the manifest.
   */
  for (const file of uploadFiles) {
    const bytes = new TextEncoder().encode(file.content);

    const blob = new Blob(
      [bytes],
      {
        type: "application/octet-stream",
      }
    );

    form.append(
      file.path,
      blob,
      file.path
    );
  }

  const url =
    `https://api.cloudflare.com/client/v4/accounts/` +
    `${accountId}/pages/projects/${projectName}/deployments`;

  const response = await fetch(url, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
    },

    body: form,
  });

  const responseText = await response.text();

  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Cloudflare returned invalid JSON (${response.status}): ${responseText}`
    );
  }

  if (!response.ok || !data.success) {
    const errorMessage =
      data?.errors
        ?.map((error) => {
          return error?.message || JSON.stringify(error);
        })
        ?.join("; ") ||
      `Cloudflare Pages deployment failed with HTTP ${response.status}`;

    throw new Error(errorMessage);
  }

  return data.result;
}