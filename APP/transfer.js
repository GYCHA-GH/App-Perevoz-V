const http = require("http");
const fs = require("fs");
const path = require("path");

const temporaryFile = path.join(
    __dirname,
    "temporary.json"
);

const data = JSON.parse(
    fs.readFileSync(
        temporaryFile,
        "utf-8"
    )
);

if (!data.length) {
    console.log("В temporary.json нет данных.");
    process.exit(0);
}

const postData = JSON.stringify({
    data: data
});

const options = {
    hostname: "database",
    port: 3001,
    path: "/receive",
    method: "POST",

    headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
    }
};

const request = http.request(
    options,
    response => {

        let body = "";

        response.on(
            "data",
            chunk => {
                body += chunk;
            }
        );

        response.on(
            "end",
            () => {

                console.log(
                    `DATABASE ответил: ${body}`
                );

                if (
                    response.statusCode >= 200 &&
                    response.statusCode < 300
                ) {

                    console.log(
                        "Данные успешно переданы в DATABASE."
                    );

                    // Очищаем временную базу APP
                    fs.writeFileSync(
                        temporaryFile,
                        JSON.stringify([], null, 4)
                    );

                } else {

                    console.error(
                        "Ошибка передачи данных."
                    );

                    process.exitCode = 1;
                }

            }
        );

    }
);

request.on(
    "error",
    error => {

        console.error(
            "Ошибка соединения с DATABASE:",
            error.message
        );

        process.exitCode = 1;
    }
);

request.write(postData);

request.end();