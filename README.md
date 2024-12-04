# Project Documentation

## Overview

This project is a serverless application built with the Serverless Framework, TypeScript, and AWS services. It provides an enrichment service that processes contact information and enriches it with additional data.

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
