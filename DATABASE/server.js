const fs = require("fs");
const http = require("http");
const path = require("path");

const pool = require("./database");

const PORT = 3001;
const TEMPORARY_FILE = path.join(__dirname, "temporary.json");

function sendJson(response, statusCode, data) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(data));
}

function saveTemporaryData(data) {
    fs.writeFileSync(TEMPORARY_FILE, JSON.stringify(data, null, 4));
}

async function saveRequests(data) {
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
                item.createdAt,
            ],
        );
    }
}

function handleReceive(request, response) {
    let body = "";

    request.on("data", chunk => {
        body += chunk;
    });

    request.on("end", async () => {
        try {
            const { data } = JSON.parse(body);

            if (!Array.isArray(data)) {
                throw new Error("Поле data должно быть массивом");
            }

            saveTemporaryData(data);
            await saveRequests(data);
            saveTemporaryData([]);

            sendJson(response, 200, {
                success: true,
                message: "Данные сохранены в PostgreSQL",
            });
        } catch (error) {
            console.error("Ошибка сохранения данных:", error);
            sendJson(response, 500, {
                success: false,
                message: "Ошибка сохранения данных",
            });
        }
    });
}

const server = http.createServer((request, response) => {
    if (request.method === "POST" && request.url === "/receive") {
        return handleReceive(request, response);
    }

    response.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("Not Found");
});

server.listen(PORT, () => {
    console.log(`DATABASE запущен: http://localhost:${PORT}`);
});
