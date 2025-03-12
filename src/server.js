import express from 'express';
import fs from 'fs'
import net from 'net';

const app = express();
const port = 4000;

app.use(express.json());

const serverLogFile = 'server.log';
const locationLogFile = 'location.log';
const chatLogFile = 'chat.log';
const blacklistLogFile = 'blacklist.log';

// 서버 로그 저장
app.post('/log/server', (req, res) => {
    const message = req.body.message;
    if(!message) return res.status(400);

    appendFile(serverLogFile);
});

// 위치 로그 저장
app.post('/log/location', (req, res) => {
    const message = req.body.message;
    if(!message) return res.status(400);

    appendFile(locationLogFile);
});

// 채팅 로그 저장
app.post('/log/chat', (req, res) => {
    const message = req.body.message;
    if(!message) return res.status(400);

    appendFile(chatLogFile);
});

// 블랙리스트 로그 저장
app.post('/log/blacklist', (req, res) => {
    const message = req.body.message;
    if(!message) return res.status(400);

    appendFile(blacklistLogFile);
});

function appendFile(file){
    fs.appendFile(`./log/${file}`, `${message}\n`, (err) => {
        if(err) {
            console.error(`${file} 저장 실패: ${err}`);
            return res.status(500);
        }
        console.log(`${file} 저장 완료:`, message);
        res.status(200);
    });
}

// 홈
app.get('/', (req, res) => {
    fs.readFile(serverLogFilePath, 'utf8', (err, data) => {
        // 버튼들 서버로그 확인, 블랙리스트 로그 확인, 이동로그 확인
        res.status(200).send(`<pre>${data}</pre>`);
    });
});

// 서버 로그 페이지
app.get('/log/server', (req, res) => {
    fs.readFile(`./log/${serverLogFile}`, 'utf8', (err, data) => {
        if(err){
            console.error(`${serverLogFile} 파일 읽기 실패: ${err}`);
            return res.status(500).send(`${serverLogFile} 파일 읽기 중 오류 발생`);
        }
        res.status(200).send(`<pre>${data}</pre>`);
    });
});

// 위치 로그 페이지
app.get('/log/location', (req, res) => {
    fs.readFile(`./log/${locationLogFile}`, 'utf8', (err, data) => {
        if(err){
            console.error(`${locationLogFile} 파일 읽기 실패: ${err}`);
            return res.status(500).send(`${locationLogFile} 파일 읽기 중 오류 발생`);
        }
        res.status(200).send(`<pre>${data}</pre>`);
    });
});

// 채팅 로그 페이지
app.get('/log/chat', (req, res) => {
    fs.readFile(`./log/${chatLogFile}`, 'utf8', (err, data) => {
        if(err){
            console.error(`${chatLogFile} 파일 읽기 실패: ${err}`);
            return res.status(500).send(`${chatLogFile} 파일 읽기 중 오류 발생`);
        }
        res.status(200).send(`<pre>${data}</pre>`);
    });
});

// 블랙리스트 로그 페이지
app.get('/log/blacklist', (req, res) => {
    fs.readFile(`./log/${blacklistLogFile}`, 'utf8', (err, data) => {
        if(err){
            console.error(`${blacklistLogFile} 파일 읽기 실패: ${err}`);
            return res.status(500).send(`${blacklistLogFile} 파일 읽기 중 오류 발생`);
        }
        res.status(200).send(`<pre>${data}</pre>`);
    });
});

app.listen(port, () => {
    console.log(`Express 서버가 실행 중입니다.`);
})