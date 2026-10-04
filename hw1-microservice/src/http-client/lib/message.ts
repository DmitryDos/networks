import { HttpHeaders } from "./headers";

export interface HttpRequest {
    method: string;
    target: string;
    path: string;
    query: Record<string, string>;
    version: string;
    headers: HttpHeaders;
    body: Buffer;
}

export interface HttpResponse {
    status: number;
    reason?: string;
    headers: HttpHeaders;
    body: Buffer;
}

export type Handler = (request: HttpRequest) => HttpResponse | Promise<HttpResponse>;
