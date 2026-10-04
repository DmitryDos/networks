import {
    CRLF,
    HEADER_DELIMITER,
    parseHeaderLines,
    parseRequestLine,
    readBody,
    splitTarget,
} from "../lib/framing";
import { HttpRequest } from "../lib/message";

export interface ParsedRequest {
    request: HttpRequest;
    consumed: number;
}

export function parseRequest(buffer: Buffer): ParsedRequest | null {
    const headerEnd = buffer.indexOf(HEADER_DELIMITER);
    if (headerEnd === -1) {
        return null;
    }
    const lines = buffer.subarray(0, headerEnd).toString("latin1").split(CRLF);
    const [method, target, version] = parseRequestLine(lines[0]);
    const headers = parseHeaderLines(lines.slice(1));
    const body = readBody(buffer, headerEnd + HEADER_DELIMITER.length, headers);
    if (body === null) {
        return null;
    }
    const { path, query } = splitTarget(target);
    return {
        request: { method, target, path, query, version, headers, body: body.data },
        consumed: body.consumed,
    };
}
