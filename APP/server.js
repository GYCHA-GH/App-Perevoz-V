const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");
const querystring = require("querystring");

const PORT = 3001;
const DATABASE_HOST = "database";
const DATABASE_PORT = 3001;
const PUBLIC_FILE = path.join(__dirname, "public", "index.html");
const TEMPORARY_FILE = path.join(__dirname, "temporary.json");

function sendResponse(response, statusCode, body = "", headers = {}) {
    response.writeHead(statusCode, headers);
    response.end(body);
}

function redirectToHome(response) {
    sendResponse(response, 302, "", { Location: "/" });
}

function readRequests() {
    if (!fs.existsSync(TEMPORARY_FILE)) {
        return [];
    }

    return JSON.parse(fs.readFileSync(TEMPORARY_FILE, "utf8"));
}

function saveRequests(requests) {
    fs.writeFileSync(
        TEMPORARY_FILE,
        JSON.stringify(requests, null, 4),
    );
}

function handleHome(response) {
    const html = fs.readFileSync(PUBLIC_FILE);

    sendResponse(response, 200, html, {
        "Content-Type": "text/html; charset=utf-8",
    });
}

function handleRequestForm(request, response) {
    let body = "";

    request.on("data", chunk => {
        body += chunk;
    });

    request.on("end", () => {
        try {
            const formData = querystring.parse(body);
            const requests = readRequests();

            requests.push({
                id: requests.length + 1,
                fullName: formData.fullName,
                phone: formData.phone,
                email: formData.email,
                message: formData.message,
                createdAt: new Date().toISOString(),
            });

            saveRequests(requests);
            console.log("Новая заявка сохранена в temporary.json");
            redirectToHome(response);
        } catch (error) {
            console.error("Ошибка сохранения заявки:", error);
            sendResponse(response, 500, "Ошибка сохранения заявки", {
                "Content-Type": "text/plain; charset=utf-8",
            });
        }
    });
}

function handleTransfer(response) {
    console.log("Запуск передачи данных в DATABASE...");

    const transferProcess = spawn("node", ["transfer.js"], {
        cwd: __dirname,
    });

    transferProcess.stdout.on("data", data => {
        console.log(`[TRANSFER] ${data}`);
    });

    transferProcess.stderr.on("data", data => {
        console.error(`[TRANSFER ERROR] ${data}`);
    });

    transferProcess.on("close", code => {
        console.log(`Передача завершена. Код: ${code}`);
        redirectToHome(response);
    });
}

const server = http.createServer((request, response) => {
    if (request.method === "GET" && request.url === "/") {
        return handleHome(response);
    }

    if (request.method === "POST" && request.url === "/request") {
        return handleRequestForm(request, response);
    }

    if (request.method === "POST" && request.url === "/transfer") {
        return handleTransfer(response);
    }

    sendResponse(response, 404, "Not Found", {
        "Content-Type": "text/plain; charset=utf-8",
    });
});

server.listen(PORT, () => {
    console.log(`APP запущен внутри контейнера на порту ${PORT}`);
    console.log(`DATABASE: ${DATABASE_HOST}:${DATABASE_PORT}`);
});
