import { Client } from "pg";

type LambdaEvent = {
  rawPath?: string;
  requestContext?: {
    http?: {
      method?: string;
    };
  };
};

type LambdaResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

const json = (statusCode: number, body: unknown): LambdaResponse => ({
  statusCode,
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify(body)
});

export const handler = async (
  event: LambdaEvent
): Promise<LambdaResponse> => {

  const method = event.requestContext?.http?.method;
  const path = event.rawPath;

  
  if (method === "GET" && path === "/db") {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    try {
      await client.connect();

      const result = await client.query("SELECT NOW() AS current_time");

      await client.end();

      return json(200, {
        success: true,
        message: "Connected to Neon successfully",
        databaseTime: result.rows[0].current_time
      });

    } catch (error) {
      console.error("Database error:", error);

      return json(500, {
        success: false,
        message: "Database connection failed"
      });
    }
  }

  return json(404, {
    success: false,
    message: "Route not found"
  });
};