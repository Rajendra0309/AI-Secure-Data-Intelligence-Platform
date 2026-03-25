const mongoose = require('mongoose');
const AnalysisRecord = require('../models/AnalysisRecord');

function mapRecordToResponse(record) {
  return {
    id: record._id.toString(),
    input_type: record.inputType,
    source: record.source,
    content_length: record.contentLength,
    summary: record.summary,
    findings: record.findings || [],
    risk_score: record.riskScore || 0,
    risk_level: record.riskLevel || 'low',
    action: record.action || 'allow',
    insights_source: record.insightsSource || 'rules',
    insights: record.insights || [],
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

async function storeAnalysisResult({ inputType, source, contentLength, aiResult, requestMeta }) {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  await AnalysisRecord.create({
    inputType,
    source,
    contentLength,
    summary: aiResult.summary,
    findings: aiResult.findings || [],
    riskScore: aiResult.risk_score || 0,
    riskLevel: aiResult.risk_level || 'low',
    action: aiResult.action || 'allow',
    insightsSource: aiResult.insights_source || 'rules',
    insights: aiResult.insights || [],
    requestMeta,
  });
}

async function fetchAnalysisHistory({ page = 1, limit = 20 }) {
  if (mongoose.connection.readyState !== 1) {
    return {
      total: 0,
      page,
      limit,
      has_next_page: false,
      data: [],
      message: 'MongoDB is not connected. History is unavailable.',
    };
  }

  const skip = (page - 1) * limit;
  const [total, records] = await Promise.all([
    AnalysisRecord.countDocuments({}),
    AnalysisRecord.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  return {
    total,
    page,
    limit,
    has_next_page: skip + records.length < total,
    data: records.map(mapRecordToResponse),
  };
}

async function fetchAnalysisRecordById(id) {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  const record = await AnalysisRecord.findById(id);
  return record ? mapRecordToResponse(record) : null;
}

module.exports = {
  storeAnalysisResult,
  fetchAnalysisHistory,
  fetchAnalysisRecordById,
};
