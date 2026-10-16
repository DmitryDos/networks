import { DnsMessage } from "./message";
import { encodeName } from "./name";

export function encodeMessage(message: DnsMessage): Buffer {
    const header = Buffer.alloc(12);
    const h = message.header;
    header.writeUInt16BE(h.id, 0);
    let flags1 = 0;
    if (h.qr) flags1 |= 0x80;
    flags1 |= (h.opcode & 0x0f) << 3;
    if (h.aa) flags1 |= 0x04;
    if (h.tc) flags1 |= 0x02;
    if (h.rd) flags1 |= 0x01;
    let flags2 = 0;
    if (h.ra) flags2 |= 0x80;
    flags2 |= h.rcode & 0x0f;
    header[2] = flags1;
    header[3] = flags2;
    header.writeUInt16BE(message.questions.length, 4);
    header.writeUInt16BE(message.answers.length, 6);
    header.writeUInt16BE(0, 8);
    header.writeUInt16BE(0, 10);

    const parts: Buffer[] = [header];

    for (const question of message.questions) {
        const tail = Buffer.alloc(4);
        tail.writeUInt16BE(question.type, 0);
        tail.writeUInt16BE(question.class, 2);
        parts.push(encodeName(question.name), tail);
    }

    for (const record of message.answers) {
        const head = Buffer.alloc(8);
        head.writeUInt16BE(record.type, 0);
        head.writeUInt16BE(record.class, 2);
        head.writeUInt32BE(record.ttl >>> 0, 4);
        const rdlength = Buffer.alloc(2);
        rdlength.writeUInt16BE(record.rdata.length, 0);
        parts.push(encodeName(record.name), head, rdlength, record.rdata);
    }

    return Buffer.concat(parts);
}
