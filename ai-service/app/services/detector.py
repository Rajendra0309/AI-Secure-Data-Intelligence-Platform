import re
from collections import Counter

from app.models.schemas import Finding

PATTERNS = {
    "email": (re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"), "low"),
    "phone": (re.compile(r"\b(?:\+\d{1,3}[\s-]?)?\d{10}\b"), "low"),
    "api_key": (re.compile(r"\b(?:sk|api|key)[-_a-zA-Z0-9]{8,}\b", re.IGNORECASE), "high"),
    "password": (re.compile(r"\bpassword\s*[=:]\s*\S+", re.IGNORECASE), "critical"),
    "token": (re.compile(r"\btoken\s*[=:]\s*\S+", re.IGNORECASE), "high"),
    "hardcoded_secret": (re.compile(r"secret\s*[=:]\s*\S+", re.IGNORECASE), "high"),
    "stack_trace": (re.compile(r"exception|stack trace|nullpointer|traceback", re.IGNORECASE), "medium"),
}

FAILED_LOGIN_PATTERN = re.compile(r"failed login|authentication failed|invalid password", re.IGNORECASE)
IP_PATTERN = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")

RISK_WEIGHTS = {
    "low": 1,
    "medium": 3,
    "high": 5,
    "critical": 8,
}


def detect_findings(content: str) -> list[Finding]:
    findings: list[Finding] = []
    lines = content.splitlines()
    failed_login_lines: list[int] = []
    ips: list[str] = []

    for idx, line in enumerate(lines, start=1):
        for finding_type, (pattern, risk) in PATTERNS.items():
            if pattern.search(line):
                findings.append(
                    Finding(
                        type=finding_type,
                        risk=risk,
                        line=idx,
                        value=line.strip()[:120],
                    )
                )

        if FAILED_LOGIN_PATTERN.search(line):
            failed_login_lines.append(idx)

        for ip in IP_PATTERN.findall(line):
            ips.append(ip)

    findings.extend(_advanced_anomaly_findings(findings, failed_login_lines, ips))
    return findings


def _advanced_anomaly_findings(
    findings: list[Finding], failed_login_lines: list[int], ips: list[str]
) -> list[Finding]:
    advanced: list[Finding] = []

    if len(failed_login_lines) >= 5:
        advanced.append(
            Finding(
                type="brute_force_suspected",
                risk="high",
                line=failed_login_lines[0],
                value=f"{len(failed_login_lines)} failed login events",
            )
        )

    if ips:
        ip_counts = Counter(ips)
        noisy_ip = max(ip_counts, key=ip_counts.get)
        if ip_counts[noisy_ip] >= 8:
            advanced.append(
                Finding(
                    type="suspicious_ip_activity",
                    risk="high",
                    line=1,
                    value=f"IP {noisy_ip} appeared {ip_counts[noisy_ip]} times",
                )
            )

    has_secrets = any(f.type in {"password", "api_key", "token", "hardcoded_secret"} for f in findings)
    has_stack = any(f.type == "stack_trace" for f in findings)
    if has_secrets and has_stack:
        advanced.append(
            Finding(
                type="correlated_exposure",
                risk="critical",
                line=1,
                value="Secrets and stack traces detected in the same payload",
            )
        )

    return advanced


def score_risk(findings: list[Finding]) -> tuple[int, str]:
    if not findings:
        return 0, "low"

    score = sum(RISK_WEIGHTS.get(f.risk, 1) for f in findings)
    score = min(score, 20)

    if score >= 15:
        return score, "critical"
    if score >= 10:
        return score, "high"
    if score >= 5:
        return score, "medium"
    return score, "low"
