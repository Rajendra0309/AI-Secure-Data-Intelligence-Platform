const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema(
  {
    type: { type: String },
    risk: { type: String },
    line: { type: Number },
    value: { type: String },
  },
  { _id: false }
);

const analysisRecordSchema = new mongoose.Schema(
  {
    inputType: { type: String, required: true },
    source: { type: String, enum: ['file', 'text'], required: true },
    contentLength: { type: Number, required: true },
    summary: { type: String },
    findings: { type: [findingSchema], default: [] },
    riskScore: { type: Number, default: 0 },
    riskLevel: { type: String, default: 'low' },
    action: { type: String, default: 'allow' },
    insightsSource: { type: String, default: 'rules' },
    insights: { type: [String], default: [] },
    requestMeta: {
      ip: { type: String },
      userAgent: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AnalysisRecord', analysisRecordSchema);
