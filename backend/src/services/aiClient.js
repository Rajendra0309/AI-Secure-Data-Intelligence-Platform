const axios = require('axios');

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [800, 1600, 3000];
const TRANSIENT_STATUS_CODES = new Set([429, 502, 503, 504]);

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
  const error = new Error(
    `AI service temporarily unavailable${statusCode ? ` (upstream status ${statusCode})` : ''}. Please retry in a few seconds.`
  );
  error.status = 503;
  return error;
}

async function callAiService(payload) {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const endpoint = `${aiServiceUrl}/analyze`;

  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const response = await axios.post(endpoint, payload, {
        timeout: 30000,
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
