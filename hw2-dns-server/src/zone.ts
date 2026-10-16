import { ConfigRecord } from "./config";
import { DnsRecord } from "./wire/message";
import { encodeRdata } from "./wire/rdata";
import { RecordClass, recordTypeByName } from "./wire/types";

export class Zone {
    private readonly records: DnsRecord[];

    constructor(records: ConfigRecord[]) {
        this.records = records.map((record) => {
            const type = recordTypeByName[record.type.toUpperCase()];
            if (type === undefined) {
                throw new Error(`unknown record type in config: ${record.type}`);
            }

            return {
                name: normalize(record.name),
                type,
                class: RecordClass.IN,
                ttl: record.ttl ?? 300,
                rdata: encodeRdata(type, record.value),
            };
        });
    }

    lookup(name: string, type: number): DnsRecord[] {
        const target = normalize(name);

        return this.records.filter((record) => record.name === target && record.type === type);
    }

    has(name: string): boolean {
        const target = normalize(name);
        
        return this.records.some((record) => record.name === target);
    }
}

function normalize(name: string): string {
    return name.replace(/\.$/, "").toLowerCase();
}
