import { RecordType } from "./types";
import { encodeName } from "./name";

export function encodeRdata(type: number, value: string): Buffer {
    switch (type) {
        case RecordType.A:
            return encodeIpv4(value);
        case RecordType.AAAA:
            return encodeIpv6(value);
        case RecordType.CNAME:
        case RecordType.NS:
        case RecordType.PTR:
            return encodeName(value);
        case RecordType.MX:
            return encodeMx(value);
        case RecordType.TXT:
            return encodeTxt(value);
        default:
            throw new Error(`unsupported record type: ${type}`);
    }
}

function encodeIpv4(value: string): Buffer {
    const parts = value.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
        throw new Error(`invalid IPv4: ${value}`);
    }
    return Buffer.from(parts);
}

function encodeIpv6(value: string): Buffer {
    const halves = value.split("::");
    const head = halves[0].length > 0 ? halves[0].split(":") : [];
    const tail = halves.length > 1 && halves[1].length > 0 ? halves[1].split(":") : [];
    let groups: string[];
    if (halves.length > 1) {
        const missing = 8 - head.length - tail.length;
        groups = [...head, ...new Array(missing).fill("0"), ...tail];
    } else {
        groups = head;
    }
    if (groups.length !== 8) {
        throw new Error(`invalid IPv6: ${value}`);
    }
    const buffer = Buffer.alloc(16);
    groups.forEach((group, index) => {
        buffer.writeUInt16BE(parseInt(group || "0", 16) & 0xffff, index * 2);
    });
    return buffer;
}

function encodeMx(value: string): Buffer {
    const tokens = value.trim().split(/\s+/);
    const preference = Number(tokens[0]);
    const exchange = tokens.slice(1).join("");
    const head = Buffer.alloc(2);
    head.writeUInt16BE(Number.isNaN(preference) ? 0 : preference & 0xffff, 0);
    return Buffer.concat([head, encodeName(exchange)]);
}

function encodeTxt(value: string): Buffer {
    const bytes = Buffer.from(value, "utf8");
    const chunks: Buffer[] = [];
    for (let offset = 0; offset < bytes.length; offset += 255) {
        const slice = bytes.subarray(offset, offset + 255);
        chunks.push(Buffer.from([slice.length]), slice);
    }
    if (chunks.length === 0) {
        chunks.push(Buffer.from([0]));
    }
    return Buffer.concat(chunks);
}
