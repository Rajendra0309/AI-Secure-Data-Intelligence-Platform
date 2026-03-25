import { useEffect, useState, useRef } from 'react'
import './App.css'

const SAMPLE_LOGS = {
  highRisk: `2026-03-10 10:00:01 INFO User login\nemail=admin@company.com\npassword=admin123\napi_key=sk-prod-xyz56789\nERROR stack trace: NullPointerException at service.java:45`,
  bruteForce: `2026-03-10 11:00:01 WARN failed login from 192.168.1.9\n2026-03-10 11:00:02 WARN failed login from 192.168.1.9\n2026-03-10 11:00:03 WARN failed login from 192.168.1.9\n2026-03-10 11:00:04 WARN failed login from 192.168.1.9\n2026-03-10 11:00:05 WARN failed login from 192.168.1.9\n2026-03-10 11:00:06 WARN failed login from 192.168.1.9\n2026-03-10 11:00:07 WARN failed login from 192.168.1.9\n2026-03-10 11:00:08 WARN failed login from 192.168.1.9`,
  lowRisk: `2026-03-10 10:00:01 INFO Health check passed\n2026-03-10 10:00:02 INFO User session started\n2026-03-10 10:00:03 INFO Request completed in 120ms`,
}

function App() {
  const [inputType, setInputType] = useState('log')
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyHasNextPage, setHistoryHasNextPage] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const resultRef = useRef(null)

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

  const fetchHistory = async (page = 1) => {
    try {
      setHistoryLoading(true)
      setHistoryError('')

      const response = await fetch(`${apiBase}/history?page=${page}&limit=8`)
      if (!response.ok) {
        const details = await response.text()
        throw new Error(details || 'Failed to load history')
      }

      const data = await response.json()
      setHistory(data.data || [])
      setHistoryPage(data.page || 1)
      setHistoryHasNextPage(Boolean(data.has_next_page))

      if (data.message) {
        setHistoryError(data.message)
      }
    } catch (historyFetchError) {
      setHistoryError(historyFetchError.message)
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory(1)
  }, [])

  const setSample = (key) => {
    setFile(null)
    setInputType('log')
    setContent(SAMPLE_LOGS[key])
    setError('')
  }

  const onReset = () => {
    setContent('')
    setFile(null)
    setError('')
    setResult(null)
  }

  const onFileDrop = (event) => {
    event.preventDefault()
    setDragOver(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) {
      setFile(dropped)
      setContent('')
      setError('')
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!file && !content.trim()) {
      setError('Please upload a file or paste content before running analysis.')
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('input_type', inputType)
      if (file) formData.append('file', file)
      if (!file) formData.append('content', content)
      formData.append('mask', 'true')
      formData.append('block_high_risk', 'true')
      formData.append('log_analysis', 'true')

      const response = await fetch(`${apiBase}/analyze`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const details = await response.text()
        throw new Error(details || 'Analysis request failed')
      }

      const data = await response.json()
      setResult(data)
      fetchHistory(1)
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  const riskClass = (level) => `text-risk-${level}`
  const badgeClass = (level) => `bg-risk-${level}`
  const isLlmSource = (source) => String(source || '').startsWith('llm')

  const formatTimestamp = (value) => {
    try {
      return new Date(value).toLocaleString()
    } catch {
      return value
    }
  }

  const onSelectHistoryRecord = (record) => {
    setResult(record)
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  return (
    <div className="container-lg py-4">
      {/* ── Navbar ── */}
      <nav className="navbar navbar-light bg-white glass-card px-3 py-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-shield-lock-fill text-primary fs-4"></i>
          <span className="navbar-brand-text">AI Secure Data Intelligence</span>
        </div>
        <div className="d-flex gap-2">
          <span className="badge rounded-pill bg-primary bg-opacity-10 text-primary fw-bold px-3 py-2" style={{fontSize: '0.75rem'}}>
            <i className="bi bi-layers me-1"></i>Multi-Input
          </span>
          <span className="badge rounded-pill bg-primary bg-opacity-10 text-primary fw-bold px-3 py-2" style={{fontSize: '0.75rem'}}>
            <i className="bi bi-speedometer2 me-1"></i>Risk Engine
          </span>
          <span className="badge rounded-pill bg-primary bg-opacity-10 text-primary fw-bold px-3 py-2" style={{fontSize: '0.75rem'}}>
            <i className="bi bi-cpu me-1"></i>AI Insights
          </span>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="hero-banner">
        <h1><i className="bi bi-shield-check me-2"></i>Security Log Analyzer</h1>
        <p>Enterprise-grade log analysis with AI-powered risk scoring, anomaly detection, and actionable security insights.</p>
      </div>

      {/* ── Error Alert ── */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span>{error}</span>
          <button type="button" className="btn-close ms-auto" onClick={() => setError('')}></button>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="row g-3">
        {/* ── Input Panel ── */}
        <div className="col-lg-6">
          <div className="glass-card p-4 h-100">
            <form onSubmit={onSubmit}>
              <div className="section-title">
                <i className="bi bi-upload"></i> Input Configuration
              </div>

              {/* Input Type */}
              <div className="mb-3">
                <label htmlFor="input-type" className="form-label fw-semibold text-secondary" style={{fontSize: '0.85rem'}}>
                  Input Type
                </label>
                <select
                  id="input-type"
                  className="form-select"
                  value={inputType}
                  onChange={(e) => setInputType(e.target.value)}
                >
                  <option value="log">📄 Log File</option>
                  <option value="text">📝 Plain Text</option>
                  <option value="sql">🗃️ SQL Query</option>
                  <option value="chat">💬 Chat Message</option>
                  <option value="file">📁 File Upload</option>
                </select>
              </div>

              {/* Sample Buttons */}
              <div className="mb-3">
                <label className="form-label fw-semibold text-secondary" style={{fontSize: '0.85rem'}}>
                  Quick Samples
                </label>
                <div className="d-flex gap-2 flex-wrap">
                  <button type="button" className="btn-sample" onClick={() => setSample('highRisk')}>
                    <i className="bi bi-exclamation-circle me-1"></i>High-Risk
                  </button>
                  <button type="button" className="btn-sample" onClick={() => setSample('bruteForce')}>
                    <i className="bi bi-unlock me-1"></i>Brute-Force
                  </button>
                  <button type="button" className="btn-sample" onClick={() => setSample('lowRisk')}>
                    <i className="bi bi-check-circle me-1"></i>Low-Risk
                  </button>
                </div>
              </div>

              {/* Dropzone */}
              <div
                className={`upload-dropzone mb-3 ${dragOver ? 'dragover' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onFileDrop}
              >
                <i className="bi bi-cloud-upload d-block mb-1"></i>
                <p className="mb-0 fw-semibold" style={{fontSize: '0.9rem'}}>Drag & drop <strong>.log</strong> or <strong>.txt</strong> file here</p>
                <small className="text-muted">or use the file picker below</small>
              </div>

              {/* File Info */}
              {file && (
                <div className="file-info d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-paperclip"></i>
                  <strong>{file.name}</strong>
                  <span className="text-muted">({(file.size / 1024).toFixed(1)} KB)</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger ms-auto rounded-pill"
                    onClick={() => setFile(null)}
                    style={{fontSize: '0.75rem'}}
                  >
                    <i className="bi bi-x"></i> Remove
                  </button>
                </div>
              )}

              {/* File Input */}
              <div className="mb-3">
                <label htmlFor="file-upload" className="form-label fw-semibold text-secondary" style={{fontSize: '0.85rem'}}>
                  Upload File
                </label>
                <input
                  id="file-upload"
                  type="file"
                  className="form-control"
                  accept=".log,.txt,text/plain"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null)
                    setError('')
                  }}
                />
              </div>

              {/* Textarea */}
              <div className="mb-3">
                <label htmlFor="content-input" className="form-label fw-semibold text-secondary" style={{fontSize: '0.85rem'}}>
                  Or Paste Content
                </label>
                <textarea
                  id="content-input"
                  className="form-control"
                  rows={7}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste logs, SQL queries, chat messages, or any text to analyze..."
                />
              </div>

              {/* Buttons */}
              <div className="d-flex gap-2">
                <button id="analyze-btn" className="btn btn-analyze flex-grow-1" disabled={loading} type="submit">
                  {loading ? (
                    <>
                      <span className="spinner-custom me-2"></span>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-search me-1"></i> Analyze
                    </>
                  )}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={onReset}>
                  <i className="bi bi-arrow-counterclockwise"></i> Clear
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Results Panel ── */}
        <div className="col-lg-6" ref={resultRef}>
          <div className="glass-card p-4 h-100">
            <div className="section-title">
              <i className="bi bi-graph-up-arrow"></i> Analysis Results
            </div>

            {/* Empty State */}
            {!result && !loading && (
              <div className="empty-state">
                <i className="bi bi-search-heart"></i>
                <p>Run an analysis to see security findings,<br/>risk scores, and AI-powered insights.</p>
              </div>
            )}

            {/* Loading State */}
            {loading && !result && (
              <div className="empty-state">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted">Scanning content for security threats...</p>
              </div>
            )}

            {/* Results */}
            {result && (
              <div>
                {/* Metrics Grid */}
                <div className="row g-2 mb-4">
                  <div className="col-6 col-md-3">
                    <div className="metric-box">
                      <div className="metric-label">Risk Level</div>
                      <div className={`metric-value ${riskClass(result.risk_level)}`}>
                        {result.risk_level === 'critical' && <i className="bi bi-exclamation-octagon-fill me-1"></i>}
                        {result.risk_level === 'high' && <i className="bi bi-exclamation-triangle-fill me-1"></i>}
                        {result.risk_level === 'medium' && <i className="bi bi-exclamation-circle-fill me-1"></i>}
                        {result.risk_level === 'low' && <i className="bi bi-check-circle-fill me-1"></i>}
                        {result.risk_level.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="metric-box">
                      <div className="metric-label">Risk Score</div>
                      <div className="metric-value text-dark">{result.risk_score}/20</div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="metric-box">
                      <div className="metric-label">Action</div>
                      <div className="metric-value text-dark" style={{fontSize: '1rem'}}>
                        {result.action === 'blocked' && <i className="bi bi-slash-circle text-danger me-1"></i>}
                        {result.action === 'masked' && <i className="bi bi-shield-check text-warning me-1"></i>}
                        {result.action === 'allow' && <i className="bi bi-check2-circle text-success me-1"></i>}
                        {result.action}
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="metric-box">
                      <div className="metric-label">Source</div>
                      <div>
                        <span className={`badge rounded-pill fw-bold px-2 py-1 ${
                          isLlmSource(result.insights_source) ? 'source-badge-llm' : 'source-badge-rules'
                        }`} style={{fontSize: '0.75rem'}}>
                          {isLlmSource(result.insights_source) ? (
                            <><i className="bi bi-cpu me-1"></i>AI Model</>
                          ) : (
                            <><i className="bi bi-list-check me-1"></i>Rules</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <h6 className="fw-bold text-secondary mb-2">
                  <i className="bi bi-card-text me-1 text-primary"></i>Summary
                </h6>
                <div className="summary-box mb-4">{result.summary}</div>

                {/* Findings */}
                <h6 className="fw-bold text-secondary mb-2">
                  <i className="bi bi-bug me-1 text-primary"></i>Findings ({result.findings.length})
                </h6>
                {(result.findings || []).length === 0 ? (
                  <p className="text-muted small mb-4">No security findings detected.</p>
                ) : (
                  <div className="d-flex flex-column gap-2 mb-4">
                    {(result.findings || []).map((finding, idx) => (
                      <div
                        key={`${finding.type}-${finding.line}-${idx}`}
                        className="finding-item"
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <span className="finding-line-num">L{finding.line}</span>
                        <div className="flex-grow-1">
                          <div className="finding-type-name">{finding.type.replace(/_/g, ' ')}</div>
                          {finding.value && (
                            <div className="finding-value-preview" title={finding.value}>{finding.value}</div>
                          )}
                        </div>
                        <span className={`badge rounded-pill fw-bold px-2 py-1 ${badgeClass(finding.risk)}`}
                          style={{fontSize: '0.72rem', textTransform: 'uppercase'}}>
                          {finding.risk}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Insights */}
                <h6 className="fw-bold text-secondary mb-2">
                  <i className="bi bi-lightbulb me-1 text-primary"></i>Insights
                </h6>
                <div className="d-flex flex-column gap-2">
                  {(result.insights || []).map((line, idx) => (
                    <div
                      key={`insight-${idx}`}
                      className="insight-item"
                      style={{ animationDelay: `${idx * 0.08}s` }}
                    >
                      <i className="bi bi-lightbulb-fill"></i>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-4 mt-3">
        <div className="section-title d-flex justify-content-between align-items-center">
          <span><i className="bi bi-clock-history"></i> Analysis History</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => fetchHistory(historyPage)}
            disabled={historyLoading}
          >
            <i className="bi bi-arrow-repeat me-1"></i>Refresh
          </button>
        </div>

        {historyError && (
          <div className="alert alert-warning py-2 mb-3" role="alert">
            {historyError}
          </div>
        )}

        {historyLoading ? (
          <div className="history-empty">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="history-empty">No analysis history found yet.</div>
        ) : (
          <div className="history-list">
            {history.map((record) => (
              <button
                type="button"
                key={record.id}
                className="history-item"
                onClick={() => onSelectHistoryRecord(record)}
              >
                <div className="history-item-top">
                  <span className={`badge rounded-pill px-2 py-1 ${badgeClass(record.risk_level)}`}>
                    {record.risk_level}
                  </span>
                  <span className="history-time">{formatTimestamp(record.created_at)}</span>
                </div>
                <div className="history-summary">{record.summary}</div>
                <div className="history-meta">
                  <span>Score: {record.risk_score}/20</span>
                  <span>Findings: {(record.findings || []).length}</span>
                  <span>Type: {record.input_type}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="history-pagination">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={historyLoading || historyPage <= 1}
            onClick={() => fetchHistory(historyPage - 1)}
          >
            Previous
          </button>
          <span>Page {historyPage}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={historyLoading || !historyHasNextPage}
            onClick={() => fetchHistory(historyPage + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <i className="bi bi-shield-lock me-1"></i>
        AI Secure Data Intelligence Platform &middot; Enterprise Security Analytics
      </footer>
    </div>
  )
}

export default App
