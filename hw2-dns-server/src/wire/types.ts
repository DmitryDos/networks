export const RecordType = {
    A: 1,
    NS: 2,
    CNAME: 5,
    SOA: 6,
    PTR: 12,
    MX: 15,
    TXT: 16,
    AAAA: 28,
} as const;

export const RecordClass = {
    IN: 1,
} as const;

export const Rcode = {
    NOERROR: 0,
    FORMERR: 1,
    SERVFAIL: 2,
    NXDOMAIN: 3,
    NOTIMP: 4,
} as const;

export const recordTypeByName: Record<string, number> = {
    A: RecordType.A,
    NS: RecordType.NS,
    CNAME: RecordType.CNAME,
    SOA: RecordType.SOA,
    PTR: RecordType.PTR,
    MX: RecordType.MX,
    TXT: RecordType.TXT,
    AAAA: RecordType.AAAA,
};
