#!/bin/sh
set -e
cd "$(dirname "$0")"
DAYS=3650

[ -f ca.crt ] && { echo "certs already present"; exit 0; }

openssl req -x509 -newkey rsa:2048 -nodes -keyout ca.key -out ca.crt -days "$DAYS" -subj "/CN=mesh-ca" 2>/dev/null

gen() {
    name="$1"
    sans="$2"
    openssl req -newkey rsa:2048 -nodes -keyout "$name.key" -out "$name.csr" -subj "/CN=$name" 2>/dev/null
    printf "subjectAltName=%s\n" "$sans" > "$name.ext"
    openssl x509 -req -in "$name.csr" -CA ca.crt -CAkey ca.key -CAcreateserial \
        -out "$name.crt" -days "$DAYS" -extfile "$name.ext" 2>/dev/null
    rm -f "$name.csr" "$name.ext"
}

gen notes "DNS:notes-proxy,DNS:notes,DNS:localhost,IP:127.0.0.1"
gen mail "DNS:mail-proxy,DNS:mail,DNS:localhost,IP:127.0.0.1"

echo "generated: ca.crt notes.crt notes.key mail.crt mail.key"
