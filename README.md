# Project Documentation

## Overview

This project is a serverless application built with the Serverless Framework, TypeScript, and AWS services. It provides an enrichment service that processes contact information and enriches it with additional data.

## Showcase

[![Watch the video](./docs/showcase.gif)](https://cln.sh/TRQshCbV)

## Datadog

- Dashboard: [Link](https://p.datadoghq.com/sb/836b9d5c-b1bf-11ef-a55b-0ee733f937a2-ff8b75cf46559dca2d25a0e8de156a49?refresh_mode=sliding&from_ts=1733306292479&to_ts=1733320692479&live=true)
- Logs: [Link](https://app.datadoghq.com/logs?saved-view-id=3174992)
- APM: [Link](https://app.datadoghq.com/apm/entity/service%3Aprimer-integration-pipeline?dependencyMap=qson%3A%28data%3A%28telemetrySelection%3Aall_sources%29%2Cversion%3A%210%29&deployments=qson%3A%28data%3A%28hits%3A%28selected%3Aversion_count%29%2Cerrors%3A%28selected%3Aversion_count%29%2Clatency%3A%28selected%3Ap95%29%2CtopN%3A%215%29%2Cversion%3A%210%29&env=dev&errors=qson%3A%28data%3A%28issueSort%3AFIRST_SEEN%29%2Cversion%3A%210%29&fromUser=false&groupMapByOperation=null&infrastructure=qson%3A%28data%3A%28viewType%3Apods%29%2Cversion%3A%210%29&isInferred=false&logs=qson%3A%28data%3A%28indexes%3A%5B%5D%29%2Cversion%3A%210%29&operationName=aws.lambda&panels=qson%3A%28data%3A%28%29%2Cversion%3A%210%29&resources=qson%3A%28data%3A%28visible%3A%21t%2Chits%3A%28selected%3Atotal%29%2Cerrors%3A%28selected%3Atotal%29%2Clatency%3A%28selected%3Ap95%29%2CtopN%3A%215%29%2Cversion%3A%211%29&summary=qson%3A%28data%3A%28visible%3A%21t%2Cchanges%3A%28%29%2Cerrors%3A%28selected%3Acount%29%2Chits%3A%28selected%3Acount%29%2Clatency%3A%28selected%3Alatency%2Cslot%3A%28agg%3A95%29%2Cdistribution%3A%28isLogScale%3A%21f%29%2CshowTraceOutliers%3A%21t%29%2Csublayer%3A%28slot%3A%28layers%3Aservice%29%2Cselected%3Apercentage%29%2ClagMetrics%3A%28selectedMetric%3A%21s%2CselectedGroupBy%3A%21s%29%29%2Cversion%3A%211%29&traces=qson%3A%28data%3A%28%29%2Cversion%3A%210%29&start=1733314516685&end=1733318116685&paused=false#resources)

## Architecture

The application is designed using a microservices architecture, leveraging AWS Lambda, S3, SQS, and DynamoDB. Below is a high-level architecture diagram:

```mermaid
graph TD;
A[API Gateway] --> B[Lambda Function: Create Enrichment]
B --> C[S3 Bucket]
B --> D[SQS Queue]
D --> E[Lambda Function: Process Enrichment]
E --> F[DynamoDB: Status Table]
F --> G[Lambda Function: Get Enrichment Status]
G --> A
```

### 1. Create Enrichment

```mermaid
sequenceDiagram
    participant Client
    participant API Gateway
    participant CreateHandler
    participant S3
    participant SQS
    participant DynamoDB

    Client->>API Gateway: POST /enrichment
    API Gateway->>CreateHandler: Trigger
    CreateHandler->>CreateHandler: Validate Input
    CreateHandler->>S3: Upload input.json
    CreateHandler->>S3: Create empty output.json
    CreateHandler->>DynamoDB: Save request status
    CreateHandler->>SQS: Send batched messages
    CreateHandler->>API Gateway: Return requestId
    API Gateway->>Client: 200 OK + requestId
```

### 2. Process Enrichment

```mermaid
sequenceDiagram
    participant SQS
    participant Process Lambda
    participant Mock API
    participant S3
    participant DynamoDB

    SQS->>Process Lambda: Trigger (batch=1)
    Process Lambda->>Mock API: Enrich contacts
    Mock API-->>Process Lambda: Return enriched data
    Process Lambda->>S3: Get current output.json
    Process Lambda->>S3: Update output.json
    Process Lambda->>DynamoDB: Increment processed count
    Process Lambda->>DynamoDB: Update status if complete
```

### 3. Get Enrichment Status

```mermaid
sequenceDiagram
    participant Client
    participant API Gateway
    participant Get Lambda
    participant DynamoDB

    Client->>API Gateway: GET /enrichment/{id}
    API Gateway->>Get Lambda: Trigger
    Get Lambda->>DynamoDB: Query status
    DynamoDB-->>Get Lambda: Return status
    Get Lambda-->>API Gateway: Return status
    API Gateway-->>Client: 200 OK + status
```

## Key Components

### Handlers

- **Create Handler**: Handles incoming requests to create enrichment tasks. It validates input, stores data in S3, and sends messages to SQS for processing. Fan-out pattern.

- **Process Handler**: Processes messages from SQS, enriches contact data using a mock API, and updates the status in DynamoDB. Worker pattern.

- **Get Handler**: Retrieves the status of enrichment requests from DynamoDB.

### Infrastructure

- **S3 Adapter**: Manages interactions with AWS S3 for storing and retrieving objects.

- **SQS Adapter**: Handles sending messages to AWS SQS.

- **Status Repository**: Interacts with DynamoDB to manage the status of enrichment requests.

## Scripts

- **createEnrichment.sh**: Shell script to send a POST request to the enrichment API.
- **getEnrichment.sh**: Shell script to retrieve the status of an enrichment request.

## Configuration

- **tsconfig.json**: TypeScript configuration file.
- **.nvmrc**: Node version manager configuration file.

## Deployment

To deploy the application, use the following command:

```
npm run deploy
```
