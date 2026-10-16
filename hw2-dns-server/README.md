dns-server

Сборка и запуск:

```
cd hw2-dns-server
npm install
npm run build && npm start
```

Записи задаются в dns.config.json, порт по умолчанию 5300. Порт и путь к конфигу можно задать через DNS_PORT и DNS_CONFIG.

Проверка:

```
dig @127.0.0.1 -p 5300 example.com A
dig @127.0.0.1 -p 5300 example.com AAAA
dig @127.0.0.1 -p 5300 www.example.com CNAME
dig @127.0.0.1 -p 5300 example.com MX
dig @127.0.0.1 -p 5300 example.com TXT
dig @127.0.0.1 -p 5300 google.com A
dig +tcp @127.0.0.1 -p 5300 example.com A
```
