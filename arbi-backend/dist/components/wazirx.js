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
const ws_1 = __importDefault(require("ws"));
const function_1 = require("../function/function");
const app_1 = require("../app");
const WazirxSocket = (sockio, socketId, symbols, inrSymbols, clients, isHedge) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("in WazirxSocket");
    const websocketConnection = () => {
        const url = `wss://stream.wazirx.com/stream`;
        const socket = new ws_1.default(url);
        const pingInterval = setInterval(() => {
            if (socket.readyState === ws_1.default.OPEN) {
                socket.ping();
                console.log('Ping sent to Wazirx WebSocket');
            }
        }, 30000);
        socket.on('open', () => {
            console.log('Connected to the Wazirx WebSocket server');
            const symbolsArray = (0, function_1.chunkArray)({ array: symbols, chunkSize: 20, extendString: ["inr@depth20@100ms", "usdt@depth20@100ms"], isJoin: false, inrSymbols: inrSymbols, isUpperCase: false, isHedge: isHedge });
            let id = 6573947;
            symbolsArray.forEach((item, index) => {
                console.log(item);
                setTimeout(() => {
                    socket.send(JSON.stringify({
                        "event": "subscribe",
                        "streams": item
                    }));
                    id += 1;
                }, index * 1000);
            });
        });
        socket.on('message', (data) => {
            if (Object.keys(clients).length === 0) {
                socket.close();
            }
            const parsedData = JSON.parse(data.toString());
            const symbol = parsedData.hasOwnProperty("data") && parsedData["data"].hasOwnProperty("s") ? (0, function_1.extractSymbol)(parsedData["data"]["s"], "wazirx") : null;
            // console.log(parsedData["data"])
            if (symbol !== null) {
                // dataEmitter.emit(symbol, { exchange: 'kucoin', data: parsedData["data"] });
                (0, app_1.handleMessage)({
                    exchange: 'wazirx',
                    data: { asks: parsedData["data"]["a"], bids: parsedData["data"]["b"] },
                    symbol: symbol,
                    isHedge: isHedge,
                    socketId: socketId
                });
            }
            // sockio.emit("Data" , data.toString())
        });
        socket.on('close', () => {
            console.log('Disconnected from the WebSocket server');
            clearInterval(pingInterval);
        });
        socket.on('error', (err) => {
            console.error('WebSocket error:', err);
        });
    };
    websocketConnection();
});
exports.default = WazirxSocket;
