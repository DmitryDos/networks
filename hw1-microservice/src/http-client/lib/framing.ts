import { HttpHeaders } from "./headers";

export const CRLF = "\r\n";
export const HEADER_DELIMITER = Buffer.from("\r\n\r\n");

export interface BodyResult {
    data: Buffer;
    consumed: number;
}

export function firstLine(buffer: Buffer): string | null {
    const newline = buffer.indexOf(0x0a);
    if (newline === -1) {
        return null;
    }
    return buffer.subarray(0, newline).toString("latin1").replace(/\r$/, "");
}

export function isHttp09(line: string): boolean {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) {
        return false;
    }
    return !/^HTTP\/\d/i.test(parts[parts.length - 1]);
}

export function parseRequestLine(line: string): [string, string, string] {
    const parts = line.split(" ");
    if (parts.length < 3) {
        throw new Error("malformed request line");
    }
    const method = parts[0];
    const version = parts[parts.length - 1];
    const target = parts.slice(1, parts.length - 1).join(" ");
    return [method, target, version];
}

export function parseHeaderLines(lines: string[]): HttpHeaders {
    const headers = new HttpHeaders();
    for (const line of lines) {
        if (line.length === 0) {
            continue;
        }
        const separator = line.indexOf(":");
        if (separator === -1) {
            throw new Error("malformed header line");
        }
        const name = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim();
        headers.append(name, value);
    }
    return headers;
}

export function splitTarget(target: string): { path: string; query: Record<string, string> } {
    const index = target.indexOf("?");
    const query: Record<string, string> = {};
    if (index === -1) {
        return { path: target, query };
    }
    for (const [key, value] of new URLSearchParams(target.slice(index + 1))) {
        query[key] = value;
    }
    return { path: target.slice(0, index), query };
}

export function readBody(buffer: Buffer, start: number, headers: HttpHeaders): BodyResult | null {
    const transferEncoding = (headers.get("transfer-encoding") ?? "").toLowerCase();
    if (transferEncoding.includes("chunked")) {
        return readChunkedBody(buffer, start);
    }
    const lengthRaw = headers.get("content-length");
    if (lengthRaw === undefined) {
        return { data: Buffer.alloc(0), consumed: start };
    }
    const length = Number.parseInt(lengthRaw, 10);
    if (Number.isNaN(length) || length < 0) {
        throw new Error("invalid content-length");
    }
    const end = start + length;
    if (buffer.length < end) {
        return null;
    }
    return { data: buffer.subarray(start, end), consumed: end };
}

export function wantsKeepAlive(version: string, headers: HttpHeaders): boolean {
    const connection = (headers.get("connection") ?? "").toLowerCase();
    if (version === "HTTP/1.0") {
        return connection.includes("keep-alive");
    }
    return !connection.includes("close");
}

function readChunkedBody(buffer: Buffer, start: number): BodyResult | null {
    const parts: Buffer[] = [];
    let offset = start;
    for (;;) {
        const lineEnd = buffer.indexOf(CRLF, offset);
        if (lineEnd === -1) {
            return null;
        }
        const token = buffer.subarray(offset, lineEnd).toString("latin1").split(";")[0].trim();
        const size = Number.parseInt(token, 16);
        if (Number.isNaN(size) || size < 0) {
            throw new Error("invalid chunk size");
        }
        const dataStart = lineEnd + CRLF.length;
        if (size === 0) {
            const terminator = buffer.indexOf(CRLF, dataStart);
            if (terminator === -1) {
                return null;
            }
            return { data: Buffer.concat(parts), consumed: terminator + CRLF.length };
        }
        const dataEnd = dataStart + size;
        if (buffer.length < dataEnd + CRLF.length) {
            return null;
        }
        parts.push(buffer.subarray(dataStart, dataEnd));
        offset = dataEnd + CRLF.length;
    }
}
