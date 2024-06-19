"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const ws_1 = __importDefault(require("ws"));
const function_1 = require("../function/function");
const app_1 = require("../app");
let socket = undefined;
const KucoinSocket = (sockio, socketId, symbols, inrSymbols, clients, isHedge) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("in kucoin");
    function postData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!socket) {
                    const tokenurl = "https://api.kucoin.com/api/v1/bullet-public";
                    const response = yield axios_1.default.post(tokenurl);
                    const url = `wss://ws-api.kucoin.com/endpoint?token=${response.data.data.token}`;
                    return new ws_1.default(url);
                }
                else {
                    return socket;
                }
            }
            catch (error) {
                console.error('Error making POST request:', error);
            }
        });
    }
    socket = yield postData();
    let reconnectInterval = null;
    const attemptReconnect = () => {
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                console.log('Attempting to reconnect...');
                websocketConnection();
            }, 5000); // Retry every 5 seconds
        }
    };
    const websocketConnection = () => {
        console.log("in websocketConnection");
        const pingInterval = setInterval(() => {
            if ((socket === null || socket === void 0 ? void 0 : socket.readyState) === ws_1.default.OPEN) {
                socket === null || socket === void 0 ? void 0 : socket.ping();
                console.log('Ping sent to KuCoin WebSocket');
            }
        }, 30000);
        socket === null || socket === void 0 ? void 0 : socket.on('pong', () => {
            console.log('Received pong from server');
        });
        socket === null || socket === void 0 ? void 0 : socket.on('open', () => {
            console.log('Connected to the Kucoin WebSocket server');
            const symbolsArray = (0, function_1.chunkArray)({ array: symbols, chunkSize: 20, extendString: ["-USDT", "USDTM"], isJoin: true, inrSymbols: inrSymbols, isUpperCase: true, isHedge: isHedge, exceptionSymbols: ["ace", "alt", "ai"] });
            let id = 6573947;
            if (reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
            }
            symbolsArray.forEach((item, index) => {
                if (isHedge) {
                    const topics = ["/spotMarket/level2Depth50:", "/contractMarket/level2Depth50:"];
                    for (const topic of topics) {
                        setTimeout(() => {
                            socket === null || socket === void 0 ? void 0 : socket.send(JSON.stringify({
                                "id": id,
                                "type": "subscribe",
                                "topic": `${topic}${item}`,
                                "privateChannel": false,
                                "response": true
                            }));
                            id += 1;
                        }, index * 1000);
                    }
                }
                else {
                    setTimeout(() => {
                        socket === null || socket === void 0 ? void 0 : socket.send(JSON.stringify({
                            "id": id,
                            "type": "subscribe",
                            "topic": `/spotMarket/level2Depth50:${item}`,
                            "privateChannel": false,
                            "response": true
                        }));
                        id += 1;
                    }, index * 1000);
                }
            });
        });
        socket === null || socket === void 0 ? void 0 : socket.on('message', (data) => {
            if (Object.keys(clients).length === 0) {
                console.log("there is no client available");
                socket === null || socket === void 0 ? void 0 : socket.close();
            }
            const parsedData = JSON.parse(data.toString());
            const symbol = parsedData.hasOwnProperty("topic") ? (0, function_1.extractSymbol)(parsedData["topic"], "kucoin") : null;
            if (symbol !== null) {
                // dataEmitter.emit(symbol, { exchange: 'kucoin', data: parsedData["data"] });
                const market = parsedData["topic"].includes("/spotMarket/level2Depth50") ? "Spot" : "Fut";
                (0, app_1.handleMessage)({
                    exchange: 'kucoin',
                    data: { asks: parsedData["data"]["asks"], bids: parsedData["data"]["bids"] },
                    symbol: `${symbol}USDT`,
                    isHedge: isHedge,
                    market: market,
                    socketId: socketId
                });
            }
            // sockio.emit("Data" , data.toString())
        });
        socket === null || socket === void 0 ? void 0 : socket.on('close', (code, resone) => {
            console.log('Disconnected from the WebSocket server', code, resone);
            if (code !== 1000) { // Handle abnormal closures
                console.error('Abnormal closure detected. Attempting to reconnect...');
                attemptReconnect();
            }
            clearInterval(pingInterval);
        });
        socket === null || socket === void 0 ? void 0 : socket.on('error', (err) => {
            console.error('WebSocket error:', err);
        });
    };
    if (socket) {
        websocketConnection();
    }
});
exports.default = KucoinSocket;
