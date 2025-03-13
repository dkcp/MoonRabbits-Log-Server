import redisClient from "./redisClient.js";

const startTime = Date.now() - 5 * 60 * 1000;
const endTime = Date.now();

redisClient.zrangebyscore('serverLogs', startTime, endTime, (err, logs) => {
    if(err) {
        console.error('Redis 로그 조회 실패:', err);
    }
    const parsedLogs = logs.map((log) => JSON.parse(log));
    //parsedLogs.filter((log => log.slice()))

    console.log(parsedLogs);
});

