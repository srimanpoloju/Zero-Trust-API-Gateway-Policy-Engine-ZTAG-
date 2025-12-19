import Fastify from "fastify";
import { fastifyLoggerOptions, logger } from "./utils/logger";
const port = Number(process.env.ECHO_SERVICE_PORT || 7070);
const host = "0.0.0.0";
async function start() {
    const app = Fastify({
        logger: fastifyLoggerOptions, // ✅ pass options, not pino instance
    });
    app.get("/health", async () => ({ ok: true }));
    app.get("/echo", async (request) => {
        // Use your singleton logger if you want custom fields
        logger.info({ query: request.query }, "Echo request received");
        return { query: request.query };
    });
    await app.listen({ host, port });
    logger.info(`Echo service running on http://${host}:${port}`);
}
start().catch((err) => {
    logger.error({ err }, "Echo service failed to start");
    process.exit(1);
});
//# sourceMappingURL=index.js.map