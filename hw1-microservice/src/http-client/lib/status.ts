const STATUS_TEXT: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    400: "Bad Request",
    404: "Not Found",
    405: "Method Not Allowed",
    412: "Precondition Failed",
    415: "Unsupported Media Type",
    500: "Internal Server Error",
};

export function statusText(status: number): string {
    return STATUS_TEXT[status] ?? "Unknown";
}
