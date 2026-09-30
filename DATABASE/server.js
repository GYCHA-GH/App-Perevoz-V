const http = require("http");
const fs = require("fs");
const path = require("path");

const pool = require("./database");

const PORT = 3001;

const temporaryFile = path.join(
    __dirname,
    "temporary.json"
);

const server = http.createServer((req, res) => {

    // Приём данных от APP
    if (req.method === "POST" && req.url === "/receive") {

        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", async () => {

            try {

                const requestData = JSON.parse(body);

                const data = requestData.data;

                // Сохраняем во временный JSON
                fs.writeFileSync(
                    temporaryFile,
                    JSON.stringify(data, null, 4)
                );

                // Сохраняем каждую заявку в PostgreSQL
                for (const item of data) {

                    await pool.query(
                        `
                        INSERT INTO requests
                        (full_name, phone, email, message, created_at)
                        VALUES ($1, $2, $3, $4, $5)
                        `,
                        [
                            item.fullName,
                            item.phone,
                            item.email,
                            item.message,
                            item.createdAt
                        ]
                    );
                }

                // После успешного сохранения
                // очищаем временную базу
                fs.writeFileSync(
                    temporaryFile,
                    JSON.stringify([], null, 4)
                );

                res.writeHead(200, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify({
                    success: true,
                    message: "Данные сохранены в PostgreSQL"
                }));

            } catch (error) {

                console.error(error);

                res.writeHead(500, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify({
                    success: false,
                    message: "Ошибка сохранения данных"
                }));
            }
        });

        return;
    }

    res.writeHead(404);
    res.end("Not Found");
});

server.listen(PORT, () => {
    console.log(`DATABASE запущен: http://localhost:${PORT}`);
});