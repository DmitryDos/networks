import { readFileSync } from "node:fs";

export interface ConfigRecord {
    name: string;
    type: string;
    value: string;
    ttl?: number;
}

export interface DnsConfig {
    port: number;
    forward?: string;
    records: ConfigRecord[];
}

export function loadConfig(path: string): DnsConfig {
    const data = JSON.parse(readFileSync(path, "utf8"));
    
    return {
        port: Number(data.port ?? 53),
        forward: data.forward,
        records: Array.isArray(data.records) ? data.records : [],
    };
}
