# 📄 AI Document Q&A Agent

## 1. Project Overview 🚀

The **AI Document Q&A Agent** is a serverless application that enables users to upload documents, extract their content (e.g., from PDFs), and query them using natural language.  
It leverages OpenAI embeddings for semantic understanding, Pinecone for vector search, and supports Retrieval-Augmented Generation (RAG) workflows.

## 2. Features ✨

- Upload and store documents (PDF, etc.) in S3
- Extract content from PDFs using `pdf-parse`
- Query documents using natural language (OpenAI, LangChain)
- Semantic search and vector storage with Pinecone
- Session management (DynamoDB)
- Secure presigned S3 upload URLs
- Serverless architecture (AWS Lambda, S3, DynamoDB, API Gateway)
- Easily extensible and configurable

## 3. Tech Stack 🛠️

**Languages & Frameworks:**

- 🟦 TypeScript
- 🏗️ AWS CDK

**AWS Services:**

- S3, DynamoDB, SQS, API Gateway, Lambda, IAM, SSM Parameter Store

## 4. Installation ⚡

**Prerequisite:**

- You must have the AWS CLI installed and configured (`aws configure`) with credentials that have permission to deploy resources and access SSM Parameter Store.

```bash
# 1. Clone the repository
git clone https://github.com/Bart-15/ai-document-qa-agent.git
cd ai-document-qa-agent

# 2. Install dependencies
npm install

# 3. Configure your environment variables
cp .env.template .env
# Edit .env with your Pinecone index

# 4. Build the project
npm run build

# 5. Deploy infrastructure (requires AWS credentials)
npm run cdk deploy
```

## 5. Usage 📝

### Generate a Presigned S3 Upload URL 🔑

You can generate a presigned S3 upload URL using the API or directly from the service class:

#### API Example

```bash
curl -X POST <API_URL>/upload-url -H "Content-Type: application/json" -d '{"filename":"mydoc.pdf","contentType":"application/pdf"}'
```

### Ask a Question 🤔

```bash
curl -X POST <API_URL>/ask -H "Content-Type: application/json" -d '{"question":"What is the main topic?", "sessionId":"abc123"}'
```

### Retrieve Session Info 🗂️

```bash
curl "<API_URL>/session?userId=USER_ID&sessionId=SESSION_ID"
```

## 6. Configuration ⚙️

Set the following environment variables in your `.env` file:

```
PINECONE_INDEX=your_pinecone_index
```

### Using AWS SSM Parameter Store for Secrets 🔒

For better security, store your API keys (e.g., OpenAI and Pinecone) in AWS SSM Parameter Store as SecureString parameters. Example commands:

```bash
# Store OpenAI API key
aws ssm put-parameter \
  --name "/ai-qa-agent/dev/OPENAI_API_KEY" \
  --value "sk-..." \
  --type SecureString \
  --overwrite

# Store Pinecone API key
aws ssm put-parameter \
  --name "/ai-qa-agent/dev/PINECONE_API_KEY" \
  --value "your-pinecone-key" \
  --type SecureString \
  --overwrite
```

Your Lambda functions will retrieve these secrets at runtime. Make sure your Lambda execution role has permission to read these parameters.

**Note:**

- 🛠️ You must have the AWS CLI installed and configured (`aws configure`).
- 🔑 Your AWS credentials must have permission to use SSM Parameter Store.
- 🧪 For local development, you can still use a `.env` file, but production deployments should use SSM for secrets.

## 7. API Reference 📚

| Endpoint            | Method | Description                 | Body/Params                                   |
| ------------------- | ------ | --------------------------- | --------------------------------------------- |
| `/upload-url`       | POST   | Get presigned S3 upload URL | `{ "filename": "...", "contentType": "..." }` |
| `/ask`              | POST   | Query a document            | `{ "question": "...", "sessionId": "..." }`   |
| `/process-document` | POST   | Trigger document processing | `{ "documentId": "..." }`                     |
| `/session`          | GET    | Retrieve session info       | `userId`, `sessionId` (query params)          |

**Note:**

- All endpoints expect and return JSON.

## Author 👷🏻‍♂️

Bart Tabusao - Software Engineer 👷🏻‍♂️
