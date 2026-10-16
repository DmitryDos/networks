export interface DecodedName {
    name: string;
    next: number;
}

export function decodeName(buffer: Buffer, offset: number): DecodedName {
    const labels: string[] = [];
    let position = offset;
    let next = 0;
    let jumped = false;
    
    for (;;) {
        const length = buffer[position];
        if ((length & 0xc0) === 0xc0) {
            if (!jumped) {
                next = position + 2;
            }
            position = ((length & 0x3f) << 8) | buffer[position + 1];
            jumped = true;
            continue;
        }
        if (length === 0) {
            if (!jumped) {
                next = position + 1;
            }
            break;
        }
        labels.push(buffer.toString("latin1", position + 1, position + 1 + length));
        position += 1 + length;
    }

    return { name: labels.join("."), next };
}

export function encodeName(name: string): Buffer {
    const parts = name.split(".").filter((part) => part.length > 0);
    const chunks: Buffer[] = [];

    for (const part of parts) {
        const bytes = Buffer.from(part, "latin1");
        chunks.push(Buffer.from([bytes.length]), bytes);
    }
    chunks.push(Buffer.from([0]));

    return Buffer.concat(chunks);
}
