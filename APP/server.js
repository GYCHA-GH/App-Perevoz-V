const http = require("http");
const fs = require("fs");
const path = require("path");
const querystring = require("querystring");

const PORT = 3001;

const DATABASE_HOST = "database";
const DATABASE_PORT = 3001;

const temporaryFile = path.join(
    __dirname,
    "temporary.json"
);

const server = http.createServer((req, res) => {

    // ==========================================
    // Открытие главной страницы
    // ==========================================

    if (
        req.method === "GET" &&
        req.url === "/"
    ) {

        const html = fs.readFileSync(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

        res.writeHead(
            200,
            {
                "Content-Type":
                    "text/html; charset=utf-8"
            }
        );

        res.end(html);

        return;
    }


    // ==========================================
    // Получение данных формы
    // ==========================================

    if (
        req.method === "POST" &&
        req.url === "/request"
    ) {

        let body = "";


        req.on(
            "data",
            chunk => {

                body += chunk;

            }
        );


        req.on(
            "end",
            () => {

                try {

                    const data =
                        querystring.parse(body);


                    let requests = [];


                    if (
                        fs.existsSync(
                            temporaryFile
                        )
                    ) {

                        requests =
                            JSON.parse(
                                fs.readFileSync(
                                    temporaryFile,
                                    "utf-8"
                                )
                            );

                    }


                    requests.push({

                        id:
                            requests.length + 1,

                        fullName:
                            data.fullName,

                        phone:
                            data.phone,

                        email:
                            data.email,

                        message:
                            data.message,

                        createdAt:
                            new Date().toISOString()

                    });


                    fs.writeFileSync(

                        temporaryFile,

                        JSON.stringify(
                            requests,
                            null,
                            4
                        )

                    );


                    console.log(
                        "Новая заявка сохранена в temporary.json"
                    );


                    res.writeHead(
                        302,
                        {
                            Location: "/"
                        }
                    );


                    res.end();


                } catch (error) {

                    console.error(
                        "Ошибка сохранения заявки:",
                        error
                    );


                    res.writeHead(
                        500,
                        {
                            "Content-Type":
                                "text/plain; charset=utf-8"
                        }
                    );


                    res.end(
                        "Ошибка сохранения заявки"
                    );

                }

            }
        );


        return;
    }


    // ==========================================
    // Передача данных в DATABASE
    // ==========================================

    if (
        req.method === "POST" &&
        req.url === "/transfer"
    ) {

        console.log(
            "Запуск передачи данных в DATABASE..."
        );


        const transferProcess =
            require("child_process").spawn(
                "node",
                [
                    "transfer.js"
                ],
                {
                    cwd: __dirname
                }
            );


        transferProcess.stdout.on(
            "data",
            data => {

                console.log(
                    `[TRANSFER] ${data}`
                );

            }
        );


        transferProcess.stderr.on(
            "data",
            data => {

                console.error(
                    `[TRANSFER ERROR] ${data}`
                );

            }
        );


        transferProcess.on(
            "close",
            code => {

                console.log(
                    `Передача завершена. Код: ${code}`
                );


                res.writeHead(
                    302,
                    {
                        Location: "/"
                    }
                );


                res.end();

            }
        );


        return;
    }


    // ==========================================
    // 404
    // ==========================================

    res.writeHead(
        404,
        {
            "Content-Type":
                "text/plain; charset=utf-8"
        }
    );

    res.end(
        "Not Found"
    );

});


// ==========================================
// Запуск APP
// ==========================================

server.listen(
    PORT,
    () => {

        console.log(
            `APP запущен внутри контейнера на порту ${PORT}`
        );

        console.log(
            `DATABASE: ${DATABASE_HOST}:${DATABASE_PORT}`
        );

    }
);