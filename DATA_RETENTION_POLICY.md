# Data Retention Policy (HSI Alumni Portal)

## 1) User and Alumni Profiles
- Data covered: name, email, graduation batch/year, bio, employment/company information, profile details.
- Retention period: while account is active.
- End of retention: after prolonged inactivity (typically 1 year), profile data is deleted or anonymized.

## 2) Messages, Posts, and Interactions
- Data covered: direct messages, comments, posts, and related interaction content.
- Retention period: while account exists.
- End of retention:
  - deleted when account is deleted; or
  - deleted after extended inactivity (typically 1 to 2 years), based on configured retention windows.

## 3) Authentication Data
- Data covered: password hash, federated login identifiers (for example, Google ID), OTP and lockout metadata.
- Retention period: while account exists.
- End of retention: deleted immediately upon account deletion.

## 4) Activity and Security Logs
- Data covered: login history and system/audit logs.
- Retention period: short-term only, typically 30 to 90 days.
- End of retention: automatically deleted by scheduled retention jobs.

## 5) Automation and Enforcement
- Retention cleanup runs automatically on a scheduled interval.
- Retention windows are configurable using server environment variables.
- Account deletion also removes linked interactions and associated message uploads where applicable.

## 6) Policy Updates
- This policy may be updated as operational, legal, or security requirements evolve.
