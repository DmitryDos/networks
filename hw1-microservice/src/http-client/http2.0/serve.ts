import net from "node:net";
import { Flag, Frame, FrameType, readFrame, writeFrame } from "./frames";
import { HpackCodec } from "./hpack";
import { HeaderField, Http2Handler, Http2Request, Http2Response } from "./message";

const PREFACE = Buffer.from("PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n", "latin1");

interface StreamState {
    headerBlock: Buffer[];
    headers: HeaderField[];
    body: Buffer[];
}

export function serveHttp2(socket: net.Socket, handler: Http2Handler, initial: Buffer): void {
    const hpack = new HpackCodec();
    const streams = new Map<number, StreamState>();
    let buffer = initial;
    let prefaceConsumed = false;
    let processing = false;
    let closed = false;

    const write = (data: Buffer): void => {
        if (!closed) {
            socket.write(data);
        }
    };

    write(writeFrame(FrameType.SETTINGS, 0, 0, Buffer.alloc(0)));

    const stream = (id: number): StreamState => {
        let state = streams.get(id);
        if (!state) {
            state = { headerBlock: [], headers: [], body: [] };
            streams.set(id, state);
        }
        return state;
    };

    const respond = async (streamId: number, request: Http2Request): Promise<void> => {
        let response: Http2Response;
        try {
            response = await handler(request);
        } catch {
            response = { status: 500, headers: [], body: Buffer.alloc(0) };
        }
        const fields: HeaderField[] = [{ name: ":status", value: String(response.status) }];
        for (const header of response.headers) {
            fields.push({ name: header.name.toLowerCase(), value: header.value });
        }
        const hasBody = response.body.length > 0;
        const hasTrailers = response.trailers !== undefined && response.trailers.length > 0;
        const headerFlags = Flag.END_HEADERS | (!hasBody && !hasTrailers ? Flag.END_STREAM : 0);
        write(writeFrame(FrameType.HEADERS, headerFlags, streamId, hpack.encode(fields)));
        if (hasBody) {
            write(writeFrame(FrameType.DATA, hasTrailers ? 0 : Flag.END_STREAM, streamId, response.body));
        }
        if (hasTrailers) {
            const trailerFields = response.trailers!.map((trailer) => ({
                name: trailer.name.toLowerCase(),
                value: trailer.value,
            }));
            write(writeFrame(FrameType.HEADERS, Flag.END_HEADERS | Flag.END_STREAM, streamId, hpack.encode(trailerFields)));
        }
        streams.delete(streamId);
    };

    const finalize = (streamId: number): void => {
        const state = streams.get(streamId);
        if (!state) {
            return;
        }
        void respond(streamId, buildRequest(state));
    };

    const handleFrame = (frame: Frame): void => {
        switch (frame.type) {
            case FrameType.SETTINGS:
                if (!(frame.flags & Flag.ACK)) {
                    write(writeFrame(FrameType.SETTINGS, Flag.ACK, 0, Buffer.alloc(0)));
                }
                break;
            case FrameType.PING:
                if (!(frame.flags & Flag.ACK)) {
                    write(writeFrame(FrameType.PING, Flag.ACK, 0, frame.payload));
                }
                break;
            case FrameType.RST_STREAM:
                streams.delete(frame.streamId);
                break;
            case FrameType.GOAWAY:
                closed = true;
                socket.end();
                break;
            case FrameType.HEADERS: {
                const state = stream(frame.streamId);
                state.headerBlock.push(stripHeaderPadding(frame));
                if (frame.flags & Flag.END_HEADERS) {
                    state.headers = hpack.decode(Buffer.concat(state.headerBlock));
                }
                if (frame.flags & Flag.END_STREAM) {
                    finalize(frame.streamId);
                }
                break;
            }
            case FrameType.CONTINUATION: {
                const state = stream(frame.streamId);
                state.headerBlock.push(frame.payload);
                if (frame.flags & Flag.END_HEADERS) {
                    state.headers = hpack.decode(Buffer.concat(state.headerBlock));
                }
                break;
            }
            case FrameType.DATA: {
                const state = stream(frame.streamId);
                state.body.push(stripDataPadding(frame));
                if (frame.flags & Flag.END_STREAM) {
                    finalize(frame.streamId);
                }
                break;
            }
            default:
                break;
        }
    };

    const pump = (): void => {
        if (processing) {
            return;
        }
        processing = true;
        try {
            if (!prefaceConsumed) {
                if (buffer.length < PREFACE.length) {
                    return;
                }
                if (!buffer.subarray(0, PREFACE.length).equals(PREFACE)) {
                    socket.destroy();
                    closed = true;
                    return;
                }
                buffer = buffer.subarray(PREFACE.length);
                prefaceConsumed = true;
            }
            for (;;) {
                const read = readFrame(buffer);
                if (!read) {
                    break;
                }
                buffer = buffer.subarray(read.consumed);
                handleFrame(read.frame);
                if (closed) {
                    break;
                }
            }
        } finally {
            processing = false;
        }
    };

    socket.on("data", (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        pump();
    });
    socket.on("error", () => {
        closed = true;
    });
    socket.on("close", () => {
        closed = true;
    });

    pump();
}

function stripHeaderPadding(frame: Frame): Buffer {
    let offset = 0;
    let padLength = 0;
    if (frame.flags & Flag.PADDED) {
        padLength = frame.payload[0];
        offset = 1;
    }
    if (frame.flags & Flag.PRIORITY) {
        offset += 5;
    }
    return frame.payload.subarray(offset, frame.payload.length - padLength);
}

function stripDataPadding(frame: Frame): Buffer {
    if (frame.flags & Flag.PADDED) {
        const padLength = frame.payload[0];
        return frame.payload.subarray(1, frame.payload.length - padLength);
    }
    return frame.payload;
}

function buildRequest(state: StreamState): Http2Request {
    const find = (name: string): string => {
        const field = state.headers.find((header) => header.name === name);
        return field ? field.value : "";
    };
    return {
        method: find(":method") || "GET",
        path: find(":path") || "/",
        scheme: find(":scheme") || "http",
        authority: find(":authority"),
        contentType: find("content-type"),
        headers: state.headers,
        body: Buffer.concat(state.body),
    };
}
