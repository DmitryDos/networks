import { loadConfig } from "./config";
import { createServer } from "./server";

const config = loadConfig();
const server = createServer(config);
server.listen(config.port);

const shutdown = (): void => {
    server.close();
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
