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
Object.defineProperty(exports, "__esModule", { value: true });
const function_1 = require("../function/function");
const allExchangeSymbols = (isHedge) => __awaiter(void 0, void 0, void 0, function* () {
    const symbolsArray = [];
    let inrSymbols = [];
    const exchangeDetails = {
        kucoin: {
            baseUrl: "https://api.kucoin.com",
            endpoint: "/api/v2/symbols",
            paths: ["symbol"],
            dataPaths: ["data"],
            replaceString: ["-USDT"],
        },
        wazirx: {
            baseUrl: "https://api.wazirx.com",
            endpoint: "/sapi/v1/exchangeInfo",
            paths: ["symbol"],
            dataPaths: ["symbols"],
            replaceString: ["usdt", "inr"],
        }
    };
    function processExchangeDetails(exchangeDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!isHedge) {
                for (const [k, v] of Object.entries(exchangeDetails)) {
                    const value = v;
                    try {
                        const data = yield (0, function_1.symbolRetrive)(`${value["baseUrl"]}${value["endpoint"]}`);
                        console.log(data);
                        const { symbols, inrPairs } = (0, function_1.symbolFilter)({ paths: value["paths"], dataPaths: value["dataPaths"], replaceString: value["replaceString"], data: data });
                        symbolsArray.push(symbols);
                        inrSymbols = inrPairs;
                    }
                    catch (error) {
                        console.error(`Error processing exchange detail ${k}:`, error);
                    }
                }
            }
            else {
                const exchangeInfo = {
                    Future: {
                        replaceString: ["USDTM"],
                        baseUrl: "https://api-futures.kucoin.com",
                        endpoint: "/api/v1/contracts/active",
                        paths: ["symbol"],
                        dataPaths: ["data"],
                    },
                    Spot: {
                        baseUrl: "https://api.kucoin.com",
                        endpoint: "/api/v2/symbols",
                        paths: ["symbol"],
                        dataPaths: ["data"],
                        replaceString: ["-USDT"],
                    }
                };
                for (const [k, v] of Object.entries(exchangeInfo)) {
                    const value = v;
                    try {
                        const data = yield (0, function_1.symbolRetrive)(`${value["baseUrl"]}${value["endpoint"]}`);
                        const { symbols } = (0, function_1.symbolFilter)({ paths: value["paths"], dataPaths: value["dataPaths"], replaceString: value["replaceString"], data: data });
                        symbolsArray.push(symbols);
                    }
                    catch (error) {
                        console.error(`Error processing exchange detail ${k}:`, error);
                    }
                }
            }
        });
    }
    yield processExchangeDetails(exchangeDetails);
    const filterSymbol = (0, function_1.similarSymbol)({ symbolsA: symbolsArray[0], symbolsB: symbolsArray[1] });
    !isHedge && inrSymbols.filter((item) => filterSymbol.includes(item));
    return { filterSymbol, inrSymbols };
});
exports.default = allExchangeSymbols;
