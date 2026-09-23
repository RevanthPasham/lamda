"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const pg_1 = require("pg");
const json = (statusCode, body) => ({
    statusCode,
    headers: {
        "content-type": "application/json"
    },
    body: JSON.stringify(body)
});
const handler = async (event) => {
    const method = event.requestContext?.http?.method;
    const path = event.rawPath;
    if (method === "GET" && path === "/db-test") {
        const client = new pg_1.Client({
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
        }
        catch (error) {
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
exports.handler = handler;
