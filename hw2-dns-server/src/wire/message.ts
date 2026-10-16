export interface DnsHeader {
    id: number;
    qr: boolean;
    opcode: number;
    aa: boolean;
    tc: boolean;
    rd: boolean;
    ra: boolean;
    rcode: number;
    qdcount: number;
    ancount: number;
    nscount: number;
    arcount: number;
}

export interface DnsQuestion {
    name: string;
    type: number;
    class: number;
}

export interface DnsRecord {
    name: string;
    type: number;
    class: number;
    ttl: number;
    rdata: Buffer;
}

export interface DnsMessage {
    header: DnsHeader;
    questions: DnsQuestion[];
    answers: DnsRecord[];
}
