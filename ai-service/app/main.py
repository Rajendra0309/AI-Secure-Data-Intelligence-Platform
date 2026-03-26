import logging
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.detector import detect_findings, score_risk
from app.services.insights import build_insights

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Log Intelligence Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("AI Log Intelligence Service initialized")


@app.get("/")
def root() -> dict:
    return {"status": "ok", "service": "ai-log-intelligence"}


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "ai-log-intelligence"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    logger.debug(f"Analyzing {payload.input_type} content (length: {len(payload.content)} chars)")
    
    findings = detect_findings(payload.content)
    logger.debug(f"Detected {len(findings)} findings")
    
    risk_score, risk_level = score_risk(findings)
    logger.debug(f"Risk assessment: score={risk_score}, level={risk_level}")

    action = "allow"
    if payload.options.mask and findings:
        action = "masked"
    if payload.options.block_high_risk and risk_level in {"high", "critical"}:
        action = "blocked"

    summary, insights, insights_source = build_insights(payload.content, findings, risk_level)

    logger.info(f"Analysis complete: {risk_level} risk, {len(insights)} insights from {insights_source}")

    return AnalyzeResponse(
        summary=summary,
        content_type="logs" if payload.input_type == "log" else payload.input_type,
        findings=findings,
        risk_score=risk_score,
        risk_level=risk_level,
        action=action,
        insights_source=insights_source,
        insights=insights,
    )
