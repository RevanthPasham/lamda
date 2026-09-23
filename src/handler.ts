import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { Client } from "pg";

type LambdaEvent = {
  rawPath?: string;
  requestContext?: {
    http?: {
      method?: string;
    };
  };
  body?: string | null;
};

type LambdaResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

const json = (
  statusCode: number,
  body: unknown
): LambdaResponse => ({
  statusCode,
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify(body),
});

/*
 * AWS Systems Manager Parameter Store client
 */
const ssm = new SSMClient({
  region: process.env.AWS_REGION || "eu-north-1",
});

/*
 * Cache the DATABASE_URL between Lambda invocations.
 *
 * This prevents Lambda from calling SSM on every request
 * while the execution environment is warm.
 */
let cachedDatabaseUrl: string | undefined;

/*
 * Get DATABASE_URL from SSM Parameter Store
 */
const getDatabaseUrl = async (): Promise<string> => {
  // Use cached value if Lambda container is already warm
  if (cachedDatabaseUrl) {
    return cachedDatabaseUrl;
  }

  const result = await ssm.send(
    new GetParameterCommand({
      Name: "/prod/lambda/DATABASE_URL",
      WithDecryption: true,
    })
  );

  const value = result.Parameter?.Value;

  if (!value) {
    throw new Error(
      "DATABASE_URL not found in SSM Parameter Store"
    );
  }

  // Cache it for future invocations
  cachedDatabaseUrl = value;

  return value;
};

export const handler = async (
  event: LambdaEvent
): Promise<LambdaResponse> => {
  const method = event.requestContext?.http?.method;
  const path = event.rawPath;

  /*
   * GET /hello
   */
  if (method === "GET" && path === "/hello") {
    return json(200, {
      success: true,
      message: "Hello from AWS Lambda",
    });
  }

  /*
   * POST /users
   */
  if (method === "POST" && path === "/users") {
    try {
      const body = JSON.parse(
        event.body ?? "{}"
      ) as {
        name?: unknown;
      };

      if (
        typeof body.name !== "string" ||
        body.name.trim() === ""
      ) {
        return json(400, {
          success: false,
          message: "A non-empty name is required",
        });
      }

      return json(200, {
        success: true,
        message: "User received",
        name: body.name,
      });
    } catch {
      return json(400, {
        success: false,
        message: "Request body must be valid JSON",
      });
    }
  }

  /*
   * GET /db-test
   *
   * DATABASE_URL comes from:
   * SSM Parameter Store
   * /prod/lambda/DATABASE_URL
   */
  if (method === "GET" && path === "/db-test") {
    let client: Client | undefined;

    try {
      // Get DATABASE_URL from SSM
      const databaseUrl = await getDatabaseUrl();

      // Create PostgreSQL client
      client = new Client({
        connectionString: databaseUrl,
        ssl: {
          rejectUnauthorized: false,
        },
      });

      // Connect to Neon PostgreSQL
      await client.connect();

      // Test database
      const result = await client.query(
        "SELECT NOW() AS current_time"
      );

      return json(200, {
        success: true,
        message: "Database connection successful",
        currentTime: result.rows[0]?.current_time,
      });
    } catch (error) {
      console.error("Database test failed:", error);

      return json(500, {
        success: false,
        message: "Database connection failed",
      });
    } finally {
      // Always close PostgreSQL connection
      if (client) {
        try {
          await client.end();
        } catch (error) {
          console.error(
            "Failed to close database connection:",
            error
          );
        }
      }
    }
  }

  /*
   * Route not found
   */
  return json(404, {
    success: false,
    message: "Route not found",
  });
};