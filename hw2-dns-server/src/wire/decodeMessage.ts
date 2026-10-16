import { DnsMessage, DnsQuestion } from "./message";
import { decodeName } from "./name";

export function decodeMessage(buffer: Buffer): DnsMessage {
    const header = {
        id: buffer.readUInt16BE(0),
        qr: (buffer[2] & 0x80) !== 0,
        opcode: (buffer[2] >> 3) & 0x0f,
        aa: (buffer[2] & 0x04) !== 0,
        tc: (buffer[2] & 0x02) !== 0,
        rd: (buffer[2] & 0x01) !== 0,
        ra: (buffer[3] & 0x80) !== 0,
        rcode: buffer[3] & 0x0f,
        qdcount: buffer.readUInt16BE(4),
        ancount: buffer.readUInt16BE(6),
        nscount: buffer.readUInt16BE(8),
        arcount: buffer.readUInt16BE(10),
    };
    let offset = 12;
    const questions: DnsQuestion[] = [];

    for (let i = 0; i < header.qdcount; i += 1) {
        const decoded = decodeName(buffer, offset);
        offset = decoded.next;
        const type = buffer.readUInt16BE(offset);
        const klass = buffer.readUInt16BE(offset + 2);
        offset += 4;
        questions.push({ name: decoded.name, type, class: klass });
    }
    
    return { header, questions, answers: [] };
}
