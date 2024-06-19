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
exports.handleMessage = exports.processData = exports.dataEmitter = exports.clients = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path = require("path");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({ origin: "*" }));
app.use(express_1.default.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
const kucoin_1 = __importDefault(require("./components/kucoin"));
const wazirx_1 = __importDefault(require("./components/wazirx"));
const events_1 = require("events");
const socket_io_1 = require("socket.io");
const symbol_1 = __importDefault(require("./components/symbol"));
const function_1 = require("./function/function");
const server = app.listen(3334, () => {
    console.log(`Server is running on port 3334`);
});
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
});
const clients = {};
exports.clients = clients;
const startExchanges = (sockid, isHedge) => __awaiter(void 0, void 0, void 0, function* () {
    const { filterSymbol, inrSymbols } = yield (0, symbol_1.default)(isHedge);
    (0, kucoin_1.default)(clients[sockid]["socket"], sockid, filterSymbol, inrSymbols, clients, isHedge);
    if (!isHedge) {
        (0, wazirx_1.default)(clients[sockid]["socket"], sockid, filterSymbol, inrSymbols, clients, isHedge);
    }
});
io.on("connection", (socket) => {
    clients[socket.id] = { data: { Fw: 0.1, Rev: 0.1 }, socket: socket };
    console.log("current clients :", Object.keys(clients).length, socket.id);
    socket.on('startKuCoin', () => __awaiter(void 0, void 0, void 0, function* () {
        console.log('Starting KuCoin WebSocket...');
        yield startExchanges(socket.id, false);
    }));
    socket.on("diffPer", (data) => {
        clients[socket.id]["data"]["Fw"] = data["Fw"];
        clients[socket.id]["data"]["Rev"] = data["Rev"];
    });
    socket.on('startKuCoinHedge', () => __awaiter(void 0, void 0, void 0, function* () {
        console.log('Starting KuCoin Hedge WebSocket...');
        yield startExchanges(socket.id, true);
        startInterval();
    }));
    socket.on('disconnect', () => {
        console.log("Client disconnected:", socket.id);
        delete clients[socket.id];
        if (Object.keys(clients).length === 0) {
            stopInterval();
        }
    });
});
const dataEmitter = new events_1.EventEmitter();
exports.dataEmitter = dataEmitter;
const symbolData = {};
const symbolDataHedge = {};
let UsdtData = { asks: [], bids: [] };
let processedDataBuffer = {};
const updateObject = (key, value, socketId) => {
    if (!processedDataBuffer[socketId]) {
        processedDataBuffer[socketId] = {};
    }
    if (!processedDataBuffer[socketId][key]) {
        processedDataBuffer[socketId][key] = {};
    }
    processedDataBuffer[socketId][key] = value;
};
let sendInterval = null;
const startInterval = () => {
    if (sendInterval)
        return;
    sendInterval = setInterval(() => {
        const refData = Object.assign({}, processedDataBuffer);
        if (Object.keys(refData).length > 0) {
            Object.keys(refData).forEach((item) => {
                clients[item]["socket"].emit('priceDifference', refData[item]);
            });
            processedDataBuffer = {};
        }
    }, 1500);
};
const stopInterval = () => {
    if (sendInterval) {
        clearInterval(sendInterval);
        sendInterval = null;
    }
};
const processData = ({ symbol, isHedge, socketId }) => {
    if (!isHedge) {
        const { kucoinData, wazirxData } = symbolData[symbol];
        if (kucoinData && wazirxData) {
            const kucoinPrice = parseFloat(kucoinData["asks"][0][0]);
            let percentageDifferenceInr = 0;
            let percentageDifferenceUsdt = 0;
            let wazirxPriceInr = 0;
            let wazirxPrice = 0;
            let priceInUsdt = 0;
            if (wazirxData["INR"] && UsdtData["asks"].length > 0 && wazirxData["INR"]["bids"].length > 0) {
                wazirxPriceInr = parseFloat(wazirxData["INR"]["bids"][0][0]);
                priceInUsdt = wazirxPriceInr / parseFloat(UsdtData["asks"][0][0]);
                percentageDifferenceInr = (0, function_1.diffrencePer)(kucoinPrice, priceInUsdt);
                console.log(symbol, percentageDifferenceInr, kucoinPrice, priceInUsdt);
            }
            else if (wazirxData["USDT"] && wazirxData["USDT"]["bids"].length > 0) {
                wazirxPrice = parseFloat(wazirxData["USDT"]["bids"][0][0]);
                percentageDifferenceUsdt = (0, function_1.diffrencePer)(kucoinPrice, wazirxPrice);
                console.log(symbol, percentageDifferenceUsdt, kucoinPrice, wazirxPrice);
            }
            if (Math.abs(percentageDifferenceInr) > 1 || Math.abs(percentageDifferenceUsdt) > 1) {
                // Send the processed data to the frontend
                io.emit('priceDifference', {
                    [symbol]: { "USDT": { kucoinPrice, wazirxPrice, percentageDifferenceUsdt }, "INR": { kucoinPrice, priceInUsdt, UsdtData, percentageDifferenceInr } },
                });
            }
        }
    }
    else {
        const { Spot, Fut } = symbolDataHedge[symbol];
        if (Spot && Fut) {
            const spotBuyPrice = parseFloat(Spot["asks"][0][0]);
            const spotSellPrice = parseFloat(Spot["bids"][0][0]);
            const futBuyPrice = parseFloat(Fut["asks"][0][0]);
            const futSellPrice = parseFloat(Fut["bids"][0][0]);
            const fwDiffPer = (0, function_1.diffrencePer)(futSellPrice, spotBuyPrice);
            const revDiffPer = (0, function_1.diffrencePer)(spotSellPrice, futBuyPrice);
            if (clients.hasOwnProperty(socketId) && clients[socketId].hasOwnProperty("data")) {
                if ((fwDiffPer - 0.3) > clients[socketId]["data"]["Fw"] || (revDiffPer - 0.3) > clients[socketId]["data"]["Rev"]) {
                    // Send the processed data to the frontend
                    updateObject(symbol, { fwDiffPer: fwDiffPer - 0.3, spotBuyPrice, futSellPrice, revDiffPer: revDiffPer - 0.3, futBuyPrice, spotSellPrice }, socketId);
                    // io.emit('priceDifference', {
                    //   [symbol] : {fwDiffPer : fwDiffPer - 0.3, spotBuyPrice, futSellPrice, revDiffPer : revDiffPer - 0.3, futBuyPrice , spotSellPrice}
                    // });
                }
            }
        }
    }
};
exports.processData = processData;
const handleMessage = ({ exchange, data, symbol, market, isHedge, socketId }) => {
    const replacedSymbol = symbol.endsWith("INR") ? symbol.replace("INR", "") : symbol.replace("USDT", "");
    if (exchange === 'kucoin') {
        if (isHedge) {
            if (!symbolDataHedge[replacedSymbol]) {
                symbolDataHedge[replacedSymbol] = {
                    Spot: null,
                    Fut: null,
                };
            }
            if (market) {
                symbolDataHedge[replacedSymbol][market] = data;
            }
        }
        else {
            if (!symbolData[replacedSymbol]) {
                symbolData[replacedSymbol] = {
                    kucoinData: null,
                    wazirxData: {
                        INR: null,
                        USDT: null
                    },
                };
            }
            symbolData[replacedSymbol].kucoinData = data;
        }
    }
    else if (exchange === 'wazirx') {
        if (!symbolData[replacedSymbol] && replacedSymbol !== "USDT") {
            symbolData[replacedSymbol] = {
                kucoinData: null,
                wazirxData: {
                    INR: null,
                    USDT: null
                },
            };
        }
        if (symbol.includes("INR")) {
            if (symbol === "USDTINR") {
                UsdtData = data;
            }
            else {
                symbolData[replacedSymbol]["wazirxData"]["INR"] = data;
            }
        }
        else {
            symbolData[replacedSymbol]["wazirxData"]["USDT"] = data;
        }
    }
    if (!isHedge && symbolData.hasOwnProperty(replacedSymbol)) {
        if (symbolData[replacedSymbol]["kucoinData"] !== null && (symbolData[replacedSymbol]["wazirxData"]["USDT"] !== null || symbolData[replacedSymbol]["wazirxData"]["INR"] !== null)) {
            processData({
                symbol: replacedSymbol,
                socketId: socketId
            });
        }
    }
    else if (isHedge && symbolDataHedge.hasOwnProperty(replacedSymbol) && symbolDataHedge[replacedSymbol]["Spot"] !== null && symbolDataHedge[replacedSymbol]["Fut"] !== null) {
        processData({
            symbol: replacedSymbol,
            isHedge: isHedge,
            socketId: socketId
        });
    }
};
exports.handleMessage = handleMessage;
