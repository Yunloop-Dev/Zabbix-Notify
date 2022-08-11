# Оповещения заббикс в ТГ

Настроить файл `config.json`

```json
{
  "token": "token",
  "launchOptions": { "headless": false, "args": ["--start-maximized"] },
  "log_channel_id": "chatID",
  "ip": "http://zabbix-ip",  
  "login": "admin",
  "password": "admin"
}
```

`Получить chatID можно написав команду /getID`

# Запуск

Установить node_modules : `npm i`

Запуск программы : `npm start`

Запуск программы(через PM2) : `npm run pm2`
