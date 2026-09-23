# Minimal TypeScript Lambda

This project uses an AWS Lambda Function URL, so no Express server or database is needed.

```text
Postman -> Lambda Function URL -> Node.js + TypeScript Lambda
                                      |- GET  /hello
                                      `- POST /users
```

## Run locally and package

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build TypeScript into `dist/`:

   ```bash
   npm run build
   ```

3. Create the deployment ZIP:

   ```bash
   npm run package
   ```

   This creates `lambda.zip`. It contains `handler.js` at the ZIP root, which is required for the configured handler name `handler.handler`.

## Deploy in AWS Console

1. In the AWS Console, open **Lambda** and choose **Create function**.
2. Choose **Author from scratch**, give it a name such as `lambda-postman-demo`, select **Node.js 22.x** (or another supported Node.js runtime), and choose or create an execution role with basic Lambda permissions. Choose **Create function**.
3. In the function page, open the **Code** tab. Choose **Upload from** -> **.zip file**, select `lambda.zip`, and confirm the upload.
4. Under **Runtime settings**, choose **Edit** and set **Handler** to `handler.handler`. Save.
5. Open **Configuration** -> **Function URL**, choose **Create function URL**. Select **NONE** for auth only for this learning/test endpoint, acknowledge the warning, and create it. Copy the generated URL.

## Test with Postman

Use the copied Function URL as the base URL (without a trailing slash).

### GET `/hello`

- Method: `GET`
- URL: `https://your-function-id.lambda-url.your-region.on.aws/hello`

Expected response:

```json
{
  "success": true,
  "message": "Hello from AWS Lambda"
}
```

### POST `/users`

- Method: `POST`
- URL: `https://your-function-id.lambda-url.your-region.on.aws/users`
- Header: `Content-Type: application/json`
- Body: select **raw** -> **JSON**, then enter:

```json
{
  "name": "Revanth"
}
```

Expected response:

```json
{
  "success": true,
  "message": "User received",
  "name": "Revanth"
}
```
