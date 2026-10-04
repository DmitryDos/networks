# examples

## Запуск

```
cd hw1-microservice
npm install
npm run build && npm start
```

## HTTP/0.9

```
printf 'GET /notes\r\n' | nc localhost 8080
```

```
bc65bbce-9983-4547-961e-92f3b2db80d5	updated
```

## HTTP/1.1

```
curl -i -X POST http://localhost:8080/notes \
  -H 'Content-Type: application/json' \
  -d '{"title":"first","content":"hello"}'
```

```
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
ETag: "f4425fdb1997c7c80a09f5d919dc5032d6130396"
Location: /notes/bc65bbce-9983-4547-961e-92f3b2db80d5
Connection: keep-alive
Date: Sun, 04 Oct 2026 12:32:10 GMT
Content-Length: 169

{"id":"bc65bbce-9983-4547-961e-92f3b2db80d5","title":"first","content":"hello","version":1,"createdAt":"2026-10-04T12:32:10.004Z","updatedAt":"2026-10-04T12:32:10.004Z"}
```

```
curl -s http://localhost:8080/notes -H 'Accept: application/xml'
```

```
<notes><note><id>bc65bbce-9983-4547-961e-92f3b2db80d5</id><title>first</title><content>hello</content><version>1</version><createdAt>2026-10-04T12:32:10.004Z</createdAt><updatedAt>2026-10-04T12:32:10.004Z</updatedAt></note></notes>
```

```
curl -o /dev/null -w '%{http_code}\n' -X PUT http://localhost:8080/notes/<id> \
  -H 'Content-Type: application/json' -H 'If-Match: "wrong"' \
  -d '{"title":"u","content":"u"}'
# 412

curl -o /dev/null -w '%{http_code}\n' -X PUT http://localhost:8080/notes/<id> \
  -H 'Content-Type: application/json' -H 'If-Match: "<etag>"' \
  -d '{"title":"updated","content":"changed"}'
# 200
```
