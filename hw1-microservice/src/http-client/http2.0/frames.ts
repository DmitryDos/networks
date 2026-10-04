export const FRAME_HEADER_SIZE = 9;

export const FrameType = {
    DATA: 0x0,
    HEADERS: 0x1,
    PRIORITY: 0x2,
    RST_STREAM: 0x3,
    SETTINGS: 0x4,
    PING: 0x6,
    GOAWAY: 0x7,
    WINDOW_UPDATE: 0x8,
    CONTINUATION: 0x9,
} as const;

export const Flag = {
    ACK: 0x1,
    END_STREAM: 0x1,
    END_HEADERS: 0x4,
    PADDED: 0x8,
    PRIORITY: 0x20,
} as const;

export interface Frame {
    type: number;
    flags: number;
    streamId: number;
    payload: Buffer;
}

export interface ReadFrame {
    frame: Frame;
    consumed: number;
}

export function readFrame(buffer: Buffer): ReadFrame | null {
    if (buffer.length < FRAME_HEADER_SIZE) {
        return null;
    }
    const length = (buffer[0] << 16) | (buffer[1] << 8) | buffer[2];
    if (buffer.length < FRAME_HEADER_SIZE + length) {
        return null;
    }
    const type = buffer[3];
    const flags = buffer[4];
    const streamId = buffer.readUInt32BE(5) & 0x7fffffff;
    const payload = buffer.subarray(FRAME_HEADER_SIZE, FRAME_HEADER_SIZE + length);
    return { frame: { type, flags, streamId, payload }, consumed: FRAME_HEADER_SIZE + length };
}

export function writeFrame(type: number, flags: number, streamId: number, payload: Buffer): Buffer {
    const header = Buffer.alloc(FRAME_HEADER_SIZE);
    header[0] = (payload.length >> 16) & 0xff;
    header[1] = (payload.length >> 8) & 0xff;
    header[2] = payload.length & 0xff;
    header[3] = type;
    header[4] = flags;
    header.writeUInt32BE(streamId >>> 0, 5);
    return Buffer.concat([header, payload]);
}
