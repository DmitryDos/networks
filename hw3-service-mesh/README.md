service-mesh

notes (hw1) и mail за nginx-сайдкарами с mTLS, трафик между сервисами только по TLS. mail шлёт заметки письмом в MailHog. Сертификаты генерятся при старте.

Запуск:

```
cd hw3-service-mesh
docker compose up --build
```

Проверка:

```
curl --cacert certs/ca.crt --cert certs/mail.crt --key certs/mail.key -X POST https://localhost:8443/notes -H 'Content-Type: application/json' -d '{"title":"first","content":"hello"}'
curl -X POST http://localhost:9000/send
open http://localhost:8025
curl --cacert certs/ca.crt https://localhost:8443/notes
```
