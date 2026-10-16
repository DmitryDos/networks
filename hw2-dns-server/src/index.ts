import { loadConfig } from "./config";
import { Zone } from "./zone";
import { Resolver } from "./resolver";
import { DnsServer } from "./dnsServer";

const config = loadConfig(process.env.DNS_CONFIG ?? "dns.config.json");
const port = Number(process.env.DNS_PORT ?? config.port);

const zone = new Zone(config.records);
const resolver = new Resolver(zone, config.forward);
const server = new DnsServer(resolver);

server.listen(port);

const shutdown = (): void => {
    server.close();
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
