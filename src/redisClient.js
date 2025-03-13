import Redis from 'ioredis';

const REDIS_HOST = '218.237.144.112';
const REDIS_PASSWORD = 'qwer1234';
const REDIS_PORT = 6379;

const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,

  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// 연결 성공 시 로그 출력
redisClient.on('connect', () => {
  console.log(`Redis에 성공적으로 연결되었습니다.`);
});

// 에러 발생 시 로그 출력 (에러가 발생해도 server crash 없이 계속 운영)
redisClient.on('error', (error) => {
  console.error(`Redis 연결 에러 발생:`, error);
  // 에러가 발생해도 서버 종료 없이 재연결을 시도
});

export default redisClient;
