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
exports.diffrencePer = exports.extractSymbol = exports.chunkArray = exports.similarSymbol = exports.symbolFilter = exports.symbolRetrive = void 0;
const axios_1 = __importDefault(require("axios"));
const proxies = [
    'http://154.73.29.201',
    'http://189.193.254.98',
];
const getRandomProxy = () => {
    const randomIndex = Math.floor(Math.random() * proxies.length);
    return proxies[randomIndex];
};
const symbolRetrive = (url) => __awaiter(void 0, void 0, void 0, function* () {
    const proxy = getRandomProxy();
    const config = {
        proxy: {
            protocol: proxy.startsWith('https') ? 'https' : 'http',
            host: proxy.split('://')[1],
            port: 8080
        },
    };
    try {
        const response = yield axios_1.default.get(url);
        return response.data;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error('Error message:', error.message);
            // Handle Axios specific error here
        }
        else {
            console.error('Unexpected error:', error);
        }
        throw error;
    }
});
exports.symbolRetrive = symbolRetrive;
const symbolFilter = ({ paths, replaceString, data, dataPaths }) => {
    let symbolData = data;
    dataPaths.forEach((item) => {
        symbolData = symbolData[item];
    });
    const symbols = [];
    const inrPairs = [];
    symbolData.forEach((item) => {
        let symbol = item;
        paths.forEach((path) => {
            symbol = symbol[path];
        });
        replaceString.forEach((item) => {
            const symbolName = (symbol.replace(item, "")).toLowerCase();
            if (symbol.includes(item) && !symbols.includes(symbolName)) {
                if (item === "inr" && !inrPairs.includes(symbolName)) {
                    inrPairs.push(symbolName);
                }
                symbols.push(symbolName);
            }
        });
    });
    return { symbols, inrPairs };
};
exports.symbolFilter = symbolFilter;
const similarSymbol = ({ symbolsA, symbolsB }) => {
    const symbols = symbolsA.filter((item) => symbolsB.includes(item));
    return symbols;
};
exports.similarSymbol = similarSymbol;
const chunkArray = ({ array, chunkSize, extendString, isJoin, inrSymbols, isUpperCase, isHedge, exceptionSymbols }) => {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.slice(i, i + chunkSize);
        const modifiedArray = [];
        chunk.forEach(item => {
            extendString.forEach((v) => {
                if (!(exceptionSymbols === null || exceptionSymbols === void 0 ? void 0 : exceptionSymbols.includes(item))) {
                    if (isHedge) {
                        if (inrSymbols.includes(item) && v.includes("inr")) {
                            modifiedArray.push(isUpperCase ? item.toUpperCase() + v : item.toLowerCase() + v);
                        }
                        else {
                            modifiedArray.push(isUpperCase ? item.toUpperCase() + v : item.toLowerCase() + v);
                        }
                    }
                    else {
                        modifiedArray.push(isUpperCase ? item.toUpperCase() + v : item.toLowerCase() + v);
                    }
                }
            });
        });
        if (isJoin) {
            chunkedArray.push(modifiedArray.join(","));
        }
        else {
            chunkedArray.push(modifiedArray);
        }
    }
    if (!isJoin) {
        chunkedArray.push(["usdtinr@depth20@100ms"]);
    }
    return chunkedArray;
};
exports.chunkArray = chunkArray;
const diffrencePer = (price1, price2) => {
    const difference = price1 - price2;
    return (difference / price1) * 100;
};
exports.diffrencePer = diffrencePer;
const extractSymbol = (str, exchange) => {
    if (exchange === "kucoin") {
        const match = str.match(/:([^:]*)$/);
        const symbol = match ? match[1] : null;
        let symbolName;
        if (symbol === null || symbol === void 0 ? void 0 : symbol.includes("USDTM")) {
            symbolName = symbol.replace("USDTM", "");
        }
        else if (symbol === null || symbol === void 0 ? void 0 : symbol.includes("-USDT")) {
            symbolName = symbol.replace("-USDT", "");
        }
        else {
            symbolName = null;
        }
        return symbolName;
    }
    else {
        return str.toUpperCase();
    }
};
exports.extractSymbol = extractSymbol;
