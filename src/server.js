import express from "express";
import fs from "fs";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import redisClient from "./redisClient.js";

const app = express();
const port = 4000;
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverLogFile = "server.log";
const locationLogFile = "location.log";
const chatLogFile = "chat.log";
const blacklistLogFile = "blacklist.log";

// 홈
app.get("/log", (req, res) => {
    const filePath = path.join(__dirname, "../app/log.html");
    res.status(200).sendFile(filePath, (err) => {
        if (err) {
            console.log("log.html 로드 오류", err);
            res.status(500).send("파일이 없습니다.");
        }
    });
});

// 서버 로그 페이지
app.get("/log/server", (req, res) => {
    let result = `<h1>Server Log</h1>
    <button onclick="navigateTo('/log/server/?range=1m')">1분</button>
    <button onclick="navigateTo('/log/server/?range=5m')">5분</button>
    <button onclick="navigateTo('/log/server/?range=10m')">10분</button>
    <button onclick="navigateTo('/log/server/?range=1h')">1시간</button>
    <button onclick="navigateTo('/log/')">홈</button>
    <script>
        function navigateTo(path) {
            const currentUrl = window.location.origin;
            window.location.href = currentUrl + path;
        }
    </script>`;

    const range = req.query.range;
    let startTime = 0;
    const endTime = Date.now();

    if (!range) {
        result += '<br><label>현재 기록하지 않음</label>';
        res.status(200).send(result);
        return;
    } else if (range === "1h") {
        result += `<h4>1시간 로그 조회</h4>`;
        startTime = Date.now() - 60 * 60 * 1000;
    } else if (range === "1m") {
        result += `<h4>1분간 로그 조회</h4>`;
        startTime = Date.now() - 60 * 1000;
    } else if (range === "5m") {
        result += `<h4>5분간 로그 조회</h4>`;
        startTime = Date.now() - 5 * 60 * 1000;
    } else if (range === "10m") {
        result += `<h4>10분간 로그 조회</h4>`;
        startTime = Date.now() - 10 * 60 * 1000;
    }

    result += '<table border="1" style="width: 100%; border-collapse: collapse;">';
    result +=
        '<thead><tr><th style="width: 80px;">날짜</th><th style="width: 80px;">시간</th><th>메시지</th></tr></thead>';
    result += "<tbody>";
    redisClient
        .zrangebyscore("serverLogs", startTime, endTime, (err, logs) => {
            if (err) {
                console.error("Redis 로그 조회 실패:", err);
                return res.status(500).send("로그 조회 실패");
            }
            logs.forEach((log) => {
                const parsedLog = JSON.parse(log);

                const date = new Date(parsedLog.time);
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const hours = String(date.getHours()).padStart(2, "0");
                const minutes = String(date.getMinutes()).padStart(2, "0");
                const seconds = String(date.getSeconds()).padStart(2, "0");
                const dateStr = `${month}-${day}`;
                const time = `${hours}:${minutes}:${seconds}`;
                result += `<tr><td>${dateStr}</td><td>${time}</td><td>${parsedLog.message}</td></tr>\n`;
            });
        })
        .then(() => {
            result += "</tbody></table>";
            res.send(result);
        });
});

// 위치 로그 페이지
app.get("/log/location", (req, res) => {
    const startTime = Date.now() - 5 * 60 * 1000;
    const endTime = Date.now();

    redisClient.zrangebyscore("locationLogs", startTime, endTime, (err, logs) => {
        if (err) {
            console.error("Redis 위치 로그 조회 실패:", err);
            return res.status(500).send("위치 로그 조회 실패");
        }
        const parsedLogs = logs.map((log) => JSON.parse(log));
        res.send(`<pre>[${parsedLogs.time}]${parsedLogs.message}</pre>`);
    });
});

// 채팅 로그 페이지
app.get("/log/chat", (req, res) => {
    const startTime = Date.now() - 5 * 60 * 1000;
    const endTime = Date.now();

    redisClient.zrangebyscore("chatLogs", startTime, endTime, (err, logs) => {
        if (err) {
            console.error("Redis 채팅 로그 조회 실패:", err);
            return res.status(500).send("채팅 로그 조회 실패");
        }
        const parsedLogs = logs.map((log) => JSON.parse(log));
        res.send(`<pre>${JSON.stringify(parsedLogs, null, 2)}</pre>`);
    });
});

// 블랙리스트 로그 페이지
app.get("/log/blacklist", (req, res) => {
    const startTime = Date.now() - 5 * 60 * 1000;
    const endTime = Date.now();

    redisClient.zrangebyscore("blacklistLogs", startTime, endTime, (err, logs) => {
        if (err) {
            console.error("Redis 메트릭 로그 조회 실패:", err);
            return res.status(500).send("메트릭 로그 조회 실패");
        }
        const parsedLogs = logs.map((log) => JSON.parse(log));
        res.send(`<pre>${JSON.stringify(parsedLogs, null, 2)}</pre>`);
    });
});

// 패킷 로그 페이지
app.get("/log/packet", (req, res) => {
    const filePath = path.join(__dirname, "../app/packetLog.html");
    res.status(200).sendFile(filePath, (err) => {
        if (err) {
            console.log("packetLog.html 로드 오류", err);
            res.status(500).send("파일이 없습니다.");
        }
    });
});

app.get("/log/packetLog/search", (req, res) => {
    const { packetType, range } = req.query;

    if (!packetType || !range) {
        return res.status(200).send("조건 선택 후 조회하세요");
    }

    let result = "";

    let startTime = Date.now() - range * 60 * 1000;
    const endTime = Date.now();
    result = `<h4>${1*range < 60 ? `${range}분간` : `1시간`} ${packetType} 패킷 로그 조회</h4>`;

    result += '<table border="1" style="width: 100%; border-collapse: collapse;">';
    result +=
        '<thead><tr><th style="width: 80px;">날짜</th><th style="width: 80px;">시간</th><th>메시지</th></tr></thead>';
    result += "<tbody>";

    redisClient
        .zrangebyscore("packetLogs", startTime, endTime, (err, logs) => {
            if (err) {
                console.error("Redis 패킷 로그 조회 실패:", err);
                return res.status(500).send("패킷 로그 조회 실패");
            }
            console.log('조회 성공', logs);
            logs.forEach((log) => {
                const parsedLog = JSON.parse(log);
                console.log(log);

                if (parsedLog.packetType === packetType) {
                    const date = new Date(parsedLog.time);
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    const hours = String(date.getHours()).padStart(2, "0");
                    const minutes = String(date.getMinutes()).padStart(2, "0");
                    const seconds = String(date.getSeconds()).padStart(2, "0");
                    const dateStr = `${month}-${day}`;
                    const time = `${hours}:${minutes}:${seconds}`;
                    result += `<tr><td>${dateStr}</td><td>${time}</td><td>${parsedLog.message}</td></tr>\n`;
                }
            });
        })
        .then(() => {
            result += "</tbody></table>";
            res.send(result);
        });
});

// 메트릭 로그 페이지
app.get("/log/metric", (req, res) => {
    let result = `<h1>Meric Log</h1>
    <button onclick="navigateTo('/log/metric/?range=1m')">1분</button>
    <button onclick="navigateTo('/log/metric/?range=5m')">5분</button>
    <button onclick="navigateTo('/log/metric/?range=10m')">10분</button>
    <button onclick="navigateTo('/log/metric/?range=1h')">1시간</button>
    <button onclick="navigateTo('/log/')">홈</button>
    <script>
        function navigateTo(path) {
            const currentUrl = window.location.origin;
            window.location.href = currentUrl + path;
        }
    </script>`;

    const range = req.query.range;
    let startTime = 0;
    const endTime = Date.now();

    if (!range) {
        startTime = Date.now() - 10 * 60 * 1000;
    } else if (range === "1h") {
        result += `<h4>1시간 로그 조회</h4>`;
        startTime = Date.now() - 60 * 60 * 1000;
    } else if (range === "1m") {
        result += `<h4>1분간 로그 조회</h4>`;
        startTime = Date.now() - 60 * 1000;
    } else if (range === "5m") {
        result += `<h4>5분간 로그 조회</h4>`;
        startTime = Date.now() - 5 * 60 * 1000;
    } else if (range === "10m") {
        result += `<h4>10분간 로그 조회</h4>`;
        startTime = Date.now() - 10 * 60 * 1000;
    }

    result += '<table border="1" style="width: 100%; border-collapse: collapse;">';
    result +=
        '<thead><tr><th style="width: 80px;">날짜</th><th style="width: 80px;">시간</th><th>메시지</th></tr></thead>';
    result += "<tbody>";
    redisClient
        .zrangebyscore("metricLogs", startTime, endTime, (err, logs) => {
            if (err) {
                console.error("Redis 메트릭 로그 조회 실패:", err);
                return res.status(500).send("메트릭 로그 조회 실패");
            }
            logs.forEach((log) => {
                const parsedLog = JSON.parse(log);

                const date = new Date(parsedLog.time);
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const hours = String(date.getHours()).padStart(2, "0");
                const minutes = String(date.getMinutes()).padStart(2, "0");
                const seconds = String(date.getSeconds()).padStart(2, "0");
                const dateStr = `${month}-${day}`;
                const time = `${hours}:${minutes}:${seconds}`;
                result += `<tr><td>${dateStr}</td><td>${time}</td><td>${parsedLog.message}</td></tr>\n`;
            });
        })
        .then(() => {
            result += "</tbody></table>";
            res.send(result);
        });
});

// 메트릭2 로그 페이지
app.get("/log/metric2", (req, res) => {
    const filePath = path.join(__dirname, "../app/metricLog.html");
    res.status(200).sendFile(filePath, (err) => {
        if (err) {
            console.log("metricLog.html 로드 오류", err);
            res.status(500).send("파일이 없습니다.");
        }
    });
});

app.get("/log/metric2/search", (req, res) => {
    const { metricType, range } = req.query;

    if (!metricType || !range) {
        return res.status(200).send("조건 선택 후 조회하세요");
    }

    let result = "";

    let startTime = Date.now() - range * 60 * 1000;
    const endTime = Date.now();
    result = `<h4>${range < 60 ? `${range}분간` : `1시간`} ${metricType} 조회</h4>`;

    result += '<table border="1" style="width: 100%; border-collapse: collapse;">';
    result +=
        `<thead><tr><th style="width: 80px;">날짜</th><th style="width: 80px;">시간</th><th>${metricType}</th></tr></thead>`;
    result += "<tbody>";

    redisClient
        .zrangebyscore("metricLogs2", startTime, endTime, (err, logs) => {
            if (err) {
                console.error("Redis 메트릭 로그 조회 실패:", err);
                return res.status(500).send("메트릭 로그 조회 실패");
            }
            logs.forEach((log) => {
                const parsedLog = JSON.parse(log);

                const date = new Date(parsedLog.time);
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const hours = String(date.getHours()).padStart(2, "0");
                const minutes = String(date.getMinutes()).padStart(2, "0");
                const seconds = String(date.getSeconds()).padStart(2, "0");
                const dateStr = `${month}-${day}`;
                const time = `${hours}:${minutes}:${seconds}`;
                result += `<tr><td>${dateStr}</td><td>${time}</td><td>${parsedLog[metricType]}</td></tr>\n`;
            });
        })
        .then(() => {
            result += "</tbody></table>";
            res.send(result);
        });
});

// 에러 로그 페이지
app.get("/log/error", (req, res) => {
    let result = `<h1>Error Log</h1>
    <button onclick="navigateTo('/log/error/?range=1m')">1분</button>
    <button onclick="navigateTo('/log/error/?range=5m')">5분</button>
    <button onclick="navigateTo('/log/error/?range=10m')">10분</button>
    <button onclick="navigateTo('/log/error/?range=1h')">1시간</button>
    <button onclick="navigateTo('/log/error/?range=6h')">6시간</button>
    <button onclick="navigateTo('/log/')">홈</button>
    <script>
        function navigateTo(path) {
            const currentUrl = window.location.origin;
            window.location.href = currentUrl + path;
        }
    </script>`;

    const range = req.query.range;
    let startTime = 0;
    const endTime = Date.now();

    if (!range) {
        result += '<br><label>버튼으로 검색</label>';
        res.status(200).send(result);
        return;
    } else if (range === "1h") {
        result += `<h4>1시간 로그 조회</h4>`;
        startTime = Date.now() - 60 * 60 * 1000;
    } else if (range === "6h") {
        result += `<h4>6시간 로그 조회</h4>`;
        startTime = Date.now() - 6 * 60 * 60 * 1000;
    } else if (range === "1m") {
        result += `<h4>1분간 로그 조회</h4>`;
        startTime = Date.now() - 60 * 1000;
    } else if (range === "5m") {
        result += `<h4>5분간 로그 조회</h4>`;
        startTime = Date.now() - 5 * 60 * 1000;
    } else if (range === "10m") {
        result += `<h4>10분간 로그 조회</h4>`;
        startTime = Date.now() - 10 * 60 * 1000;
    }

    result += '<table border="1" style="width: 100%; border-collapse: collapse;">';
    result +=
        '<thead><tr><th style="width: 80px;">날짜</th><th style="width: 80px;">시간</th><th>메시지</th></tr></thead>';
    result += "<tbody>";
    redisClient
        .zrangebyscore("errorLogs", startTime, endTime, (err, logs) => {
            if (err) {
                console.error("Redis 로그 조회 실패:", err);
                return res.status(500).send("로그 조회 실패");
            }
            logs.forEach((log) => {
                const parsedLog = JSON.parse(log);

                const date = new Date(parsedLog.time);
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const hours = String(date.getHours()).padStart(2, "0");
                const minutes = String(date.getMinutes()).padStart(2, "0");
                const seconds = String(date.getSeconds()).padStart(2, "0");
                const dateStr = `${month}-${day}`;
                const time = `${hours}:${minutes}:${seconds}`;
                result += `<tr><td>${dateStr}</td><td>${time}</td><td>${parsedLog.message}</td></tr>\n`;
            });
        })
        .then(() => {
            result += "</tbody></table>";
            res.send(result);
        });
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Express 서버가 실행 중입니다.`);
});
