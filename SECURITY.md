# Security Policy

## Supported Versions

The following versions of Soluf-th Dev Hub are currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Soluf-th Dev Hub seriously. If you believe you have found a security vulnerability, please report it to us as soon as possible.

**Please do not report security vulnerabilities through public GitHub issues.**

### Reporting Process

1.  **Email:** Send an encrypted email to `security@soluf-th.dev`.
2.  **Details:** Include as much information as possible:
    *   Description of the vulnerability.
    *   Steps to reproduce the issue.
    *   Potential impact.
    *   Any suggested fixes.

### Response Timeline

*   **Acknowledgment:** You can expect an acknowledgment of your report within 48 hours.
*   **Triage:** We will triage the issue and determine the severity within 1 week.
*   **Resolution:** We aim to provide a fix or mitigation within 30 days for high-severity issues.

## Security Practices

*   **Smart Contracts:** When using the Solidity compiler features, always verify bytecode on testnets before mainnet deployment.
*   **API Keys:** Ensure your environment variables are secured and never committed to version control.
*   **Dependencies:** We regularly audit our `esm.sh` imports for known vulnerabilities.

Thank you for helping keep the Soluf-th ecosystem secure!
