# Lambda Job Scheduling Specification

## ADDED Requirements

### Requirement: Lambda function creation for lesson generation
The system SHALL create a Lambda function that triggers the existing lesson generation API endpoint on a schedule.

#### Scenario: Lambda function deployment
- **WHEN** the Lambda function is deployed to AWS
- **THEN** it SHALL be named "generate-lessons-cron"
- **THEN** it SHALL use Node.js 20 runtime
- **THEN** it SHALL have the lesson generation logic packaged and ready to execute

#### Scenario: Lambda execution environment
- **WHEN** the Lambda function is configured
- **THEN** it SHALL have environment variables for API_URL and CRON_SECRET
- **THEN** it SHALL have appropriate IAM role for execution and CloudWatch logging

### Requirement: HTTP API invocation pattern
The system SHALL implement Lambda functions as HTTP callers that trigger existing API endpoints rather than duplicating business logic.

#### Scenario: Successful API call
- **WHEN** the Lambda function executes
- **THEN** it SHALL make an HTTPS GET request to `/api/cron/generate-lessons`
- **THEN** it SHALL include the Authorization header with Bearer token (CRON_SECRET)
- **THEN** it SHALL wait for the API response before completing

#### Scenario: API response handling
- **WHEN** the API endpoint returns a successful response (status 200)
- **THEN** the Lambda SHALL log the response data to CloudWatch
- **THEN** the Lambda SHALL return success status

#### Scenario: API error handling
- **WHEN** the API endpoint returns an error response (status 4xx or 5xx)
- **THEN** the Lambda SHALL log the error details to CloudWatch
- **THEN** the Lambda SHALL throw an error to trigger automatic retry
- **THEN** failed executions SHALL be retried up to 2 times by Lambda

### Requirement: EventBridge schedule configuration
The system SHALL use EventBridge to schedule Lambda function executions on a recurring basis.

#### Scenario: Daily lesson generation schedule
- **WHEN** the EventBridge rule is created
- **THEN** it SHALL be named "daily-lesson-generation"
- **THEN** it SHALL use cron expression `cron(0 2 * * ? *)` for daily 2 AM UTC execution
- **THEN** it SHALL target the "generate-lessons-cron" Lambda function

#### Scenario: EventBridge trigger verification
- **WHEN** the scheduled time is reached (2 AM UTC)
- **THEN** EventBridge SHALL automatically invoke the Lambda function
- **THEN** the invocation SHALL appear in CloudWatch logs

### Requirement: Manual testing capability
The system SHALL support manual Lambda invocation for testing purposes.

#### Scenario: Manual Lambda trigger
- **WHEN** a developer manually invokes the Lambda function via AWS Console
- **THEN** the function SHALL execute immediately without waiting for the schedule
- **THEN** the execution SHALL be logged in CloudWatch
- **THEN** the API endpoint SHALL be called as normal

### Requirement: Existing API endpoint compatibility
The system SHALL reuse existing `/api/cron/generate-lessons` endpoint without modifications.

#### Scenario: Endpoint authentication
- **WHEN** the Lambda function calls the API endpoint
- **THEN** the endpoint SHALL authenticate using the CRON_SECRET environment variable
- **THEN** unauthorized requests SHALL be rejected with 401 status

#### Scenario: Endpoint execution
- **WHEN** the authenticated request is received
- **THEN** the endpoint SHALL execute `generateFutureLessons()` from `lib/background-jobs.ts`
- **THEN** the endpoint SHALL return success/failure results in JSON format
- **THEN** all lesson generation logic SHALL remain in the application code

### Requirement: Secrets management
The system SHALL securely manage sensitive credentials used by Lambda functions.

#### Scenario: CRON_SECRET storage
- **WHEN** the Lambda function is deployed
- **THEN** the CRON_SECRET SHALL be stored as an environment variable in Lambda
- **THEN** the same CRON_SECRET SHALL be configured in the EC2 application environment
- **THEN** the secret SHALL not be committed to version control

#### Scenario: API URL configuration
- **WHEN** the Lambda function is deployed
- **THEN** the API_URL environment variable SHALL point to the production domain (https://app.guitarstrategies.com)
- **THEN** the URL SHALL be configurable for different environments

### Requirement: Vercel cron removal
The system SHALL remove Vercel cron configuration after EventBridge setup is verified.

#### Scenario: Configuration cleanup
- **WHEN** EventBridge scheduling is confirmed working
- **THEN** the `vercel.json` cron configuration SHALL be removed or commented out
- **THEN** the application SHALL no longer depend on Vercel for automated scheduling

### Requirement: Error logging and monitoring
The system SHALL provide visibility into Lambda execution status and failures.

#### Scenario: Successful execution logging
- **WHEN** a Lambda function executes successfully
- **THEN** it SHALL log the start time, API response, and completion status to CloudWatch
- **THEN** logs SHALL include structured data (timestamps, response codes, lesson counts)

#### Scenario: Failed execution logging
- **WHEN** a Lambda function fails (API error, timeout, exception)
- **THEN** it SHALL log the error message and stack trace to CloudWatch
- **THEN** the Lambda SHALL throw an error to mark the execution as failed
- **THEN** AWS SHALL automatically retry the function up to 2 times

### Requirement: Timeout configuration
The system SHALL configure appropriate timeout limits for Lambda executions.

#### Scenario: Lambda timeout setting
- **WHEN** the Lambda function is configured
- **THEN** it SHALL have a timeout of at least 60 seconds
- **THEN** this SHALL allow sufficient time for the API endpoint to process all teachers
- **THEN** if the timeout is exceeded, the Lambda SHALL fail and retry

### Requirement: Cost optimization
The system SHALL minimize Lambda execution costs while maintaining reliability.

#### Scenario: Minimal Lambda code
- **WHEN** the Lambda function is implemented
- **THEN** it SHALL contain only HTTP invocation logic (not business logic)
- **THEN** the deployment package SHALL be minimal in size
- **THEN** execution time SHALL be minimal (seconds, not minutes)

#### Scenario: Appropriate memory allocation
- **WHEN** the Lambda function is configured
- **THEN** it SHALL use minimal memory allocation (128-256 MB)
- **THEN** this SHALL be sufficient for making HTTP requests
- **THEN** monthly cost SHALL remain negligible (< $1)
