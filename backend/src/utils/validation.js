const ALLOWED_TYPES = ['text', 'file', 'sql', 'chat', 'log'];

function ensureInputType(inputType) {
  if (!ALLOWED_TYPES.includes(inputType)) {
    throw new Error(`Unsupported input_type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }
}

function getPayloadFromRequest(req, inputType) {
  if (req.file) {
    return req.file.buffer.toString('utf-8');
  }

  const content = req.body.content;
  if (!content || typeof content !== 'string') {
    throw new Error(`Missing content for input_type=${inputType}`);
  }

  return content;
}

module.exports = {
  ensureInputType,
  getPayloadFromRequest,
};
