from pydantic import BaseModel, Field


class AnalyzeOptions(BaseModel):
    mask: bool = True
    block_high_risk: bool = True
    log_analysis: bool = True


class AnalyzeRequest(BaseModel):
    input_type: str
    content: str = Field(min_length=1)
    options: AnalyzeOptions = AnalyzeOptions()


class Finding(BaseModel):
    type: str
    risk: str
    line: int
    value: str | None = None


class AnalyzeResponse(BaseModel):
    summary: str
    content_type: str
    findings: list[Finding]
    risk_score: int
    risk_level: str
    action: str
    insights_source: str
    insights: list[str]
