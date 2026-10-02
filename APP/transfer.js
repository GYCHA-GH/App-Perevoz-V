const fs = require("fs");
const http = require("http");
const path = require("path");

const DATABASE_HOST = "database";
const DATABASE_PORT = 3001;
const TEMPORARY_FILE = path.join(__dirname, "temporary.json");

function readRequests() {
    return JSON.parse(fs.readFileSync(TEMPORARY_FILE, "utf8"));
}

function clearRequests() {
    fs.writeFileSync(TEMPORARY_FILE, JSON.stringify([], null, 4));
}

function transferRequests(requests) {
    const payload = JSON.stringify({ data: requests });

    const request = http.request(
        {
            hostname: DATABASE_HOST,
            port: DATABASE_PORT,
            path: "/receive",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
            },
        },
        response => {
            let body = "";

            response.on("data", chunk => {
                body += chunk;
            });

            response.on("end", () => {
                console.log(`DATABASE ответил: ${body}`);

                if (response.statusCode >= 200 && response.statusCode < 300) {
                    clearRequests();
                    console.log("Данные успешно переданы в DATABASE.");
                    return;
                }

                console.error("Ошибка передачи данных.");
                process.exitCode = 1;
            });
        },
    );

    request.on("error", error => {
        console.error("Ошибка соединения с DATABASE:", error.message);
        process.exitCode = 1;
    });

    request.end(payload);
}

const requests = readRequests();

if (!requests.length) {
    console.log("В temporary.json нет данных.");
    process.exit(0);
}

transferRequests(requests);
