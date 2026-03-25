const { callAiService } = require('../services/aiClient');
const { storeAnalysisResult } = require('../services/analysisStore');
const { ensureInputType, getPayloadFromRequest } = require('../utils/validation');

async function analyzeContent(req, res, next) {
  try {
    const inputType = req.body.input_type || (req.file ? 'log' : 'text');
    ensureInputType(inputType);

    const payload = getPayloadFromRequest(req, inputType);
    const options = {
      mask: req.body.mask !== 'false',
      block_high_risk: req.body.block_high_risk !== 'false',
      log_analysis: req.body.log_analysis !== 'false',
    };

    const aiResult = await callAiService({
      input_type: inputType,
      content: payload,
      options,
    });

    await storeAnalysisResult({
      inputType,
      source: req.file ? 'file' : 'text',
      contentLength: payload.length,
      aiResult,
      requestMeta: {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
      },
    });

    res.json(aiResult);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  analyzeContent,
};
