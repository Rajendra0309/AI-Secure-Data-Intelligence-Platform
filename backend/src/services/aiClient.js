const axios = require('axios');

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [800, 1600, 3000];
const TRANSIENT_STATUS_CODES = new Set([429, 502, 503, 504]);
const ANALYZE_TIMEOUT_MS = 90000;
const WARMUP_TIMEOUT_MS = 15000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(error) {
  if (!error) {
    return false;
  }

  const statusCode = error.response?.status;
  if (statusCode && TRANSIENT_STATUS_CODES.has(statusCode)) {
    return true;
  }

  // Network-level axios issues that are commonly temporary.
  return [
    'ECONNABORTED',
    'ETIMEDOUT',
    'ECONNRESET',
    'ENOTFOUND',
    'EAI_AGAIN',
  ].includes(error.code);
}

function buildUpstreamUnavailableError(lastError) {
  const statusCode = lastError?.response?.status;
  const retryAfterHeader = lastError?.response?.headers?.['retry-after'];
  const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
  const error = new Error(
    `AI service temporarily unavailable${statusCode ? ` (upstream status ${statusCode})` : ''}. Please retry in a few seconds.`
  );
  error.status = 503;
  error.retryAfterSeconds = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : 20;
  return error;
}

async function warmupAiService(aiServiceUrl) {
  try {
    await axios.get(`${aiServiceUrl}/health`, {
      timeout: WARMUP_TIMEOUT_MS,
    });
  } catch (error) {
    // Warm-up is best-effort: analyze path below still has retries and fallback handling.
    console.warn(`[WARN] AI service warm-up failed: ${error.message}`);
  }
}

async function callAiService(payload) {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const endpoint = `${aiServiceUrl}/analyze`;

  await warmupAiService(aiServiceUrl);

  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const response = await axios.post(endpoint, payload, {
        timeout: ANALYZE_TIMEOUT_MS,
      });
      return response.data;
    } catch (error) {
      lastError = error;
      const attemptCount = attempt + 1;

      if (!isTransientError(error) || attemptCount >= MAX_RETRIES) {
        break;
      }

      const waitMs = RETRY_DELAYS_MS[attempt] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      console.warn(
        `[WARN] AI service transient failure (attempt ${attemptCount}/${MAX_RETRIES}): ${error.message}. Retrying in ${waitMs}ms.`
      );
      await delay(waitMs);
    }
  }

  if (isTransientError(lastError)) {
    throw buildUpstreamUnavailableError(lastError);
  }

  throw lastError;
}

module.exports = {
  callAiService,
};
