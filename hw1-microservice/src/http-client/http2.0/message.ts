export interface HeaderField {
    name: string;
    value: string;
}

export interface Http2Request {
    method: string;
    path: string;
    scheme: string;
    authority: string;
    contentType: string;
    headers: HeaderField[];
    body: Buffer;
}

export interface Http2Response {
    status: number;
    headers: HeaderField[];
    body: Buffer;
    trailers?: HeaderField[];
}

export type Http2Handler = (request: Http2Request) => Http2Response | Promise<Http2Response>;
