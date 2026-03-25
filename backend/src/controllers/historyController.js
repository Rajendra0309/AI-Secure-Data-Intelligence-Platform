const { fetchAnalysisHistory, fetchAnalysisRecordById } = require('../services/analysisStore');

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function getAnalysisHistory(req, res, next) {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const page = parsePositiveInt(req.query.page, 1);

    const history = await fetchAnalysisHistory({ page, limit });
    res.json(history);
  } catch (error) {
    next(error);
  }
}

async function getAnalysisHistoryById(req, res, next) {
  try {
    const record = await fetchAnalysisRecordById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'History record not found' });
    }
    return res.json(record);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAnalysisHistory,
  getAnalysisHistoryById,
};
