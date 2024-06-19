import express from "express";
import cors from "cors";
const path = require("path");
const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
import KucoinSocket from "./components/kucoin"
import WazirxSocket from "./components/wazirx"
import { EventEmitter } from 'events';

import {Server} from 'socket.io';
import allExchangeSymbols from "./components/symbol";
import {diffrencePer} from "./function/function"

const server = app.listen(3334, () => {
  console.log(`Server is running on port 3334`);
});

const io = new Server(server, {
  cors: {
    origin: "*",
  },
})

const clients: { [key: string]: any } = {};

const startExchanges = async(sockid : string, isHedge : boolean) =>{
  const {filterSymbol , inrSymbols} = await allExchangeSymbols(isHedge)
  KucoinSocket(clients[sockid]["socket"], sockid, filterSymbol, inrSymbols, clients, isHedge)
  if(!isHedge){
    WazirxSocket(clients[sockid]["socket"], sockid, filterSymbol, inrSymbols, clients, isHedge)
  }
}

io.on("connection", (socket : any) => {
  clients[socket.id] = {data : {Fw : 0.1 , Rev : 0.1} , socket : socket};
  
  console.log("current clients :", Object.keys(clients).length , socket.id)

  socket.on('startKuCoin', async() => {
    console.log('Starting KuCoin WebSocket...');
    
    await startExchanges(socket.id, false)
    
    
  });

  socket.on("diffPer" , (data : any)=>{
    clients[socket.id]["data"]["Fw"] = data["Fw"]
    clients[socket.id]["data"]["Rev"] = data["Rev"]
    
  })

  socket.on('startKuCoinHedge', async() => {
    console.log('Starting KuCoin Hedge WebSocket...');
    
    await startExchanges(socket.id, true)
    startInterval()
    
  });


  socket.on('disconnect', () => {
    console.log("Client disconnected:", socket.id);
    delete clients[socket.id];
    if (Object.keys(clients).length === 0) {
      stopInterval();
    }
});
});

const dataEmitter = new EventEmitter();

const symbolData : {[key:string] : {kucoinData : {asks : string[][], bids : string[][]} | null, wazirxData : {INR : {asks : string[][], bids : string[][]} | null , USDT : {asks : string[][], bids : string[][]} | null}}} = {};
const symbolDataHedge : {[key:string] : {Spot : {asks : string[][], bids : string[][]} | null , Fut : {asks : string[][], bids : string[][]} | null}} = {}
let UsdtData : {asks : string[][] , bids : string[][]} = {asks: [], bids: []}

interface processDataTypes {
  symbol : string , 
  isHedge? : boolean,
  socketId : string
}

let processedDataBuffer : {[key : string]:{[key : string] : {[key : string] : number}}} = {};

const updateObject = (key : string, value : any, socketId : string) => {
  if (!processedDataBuffer[socketId]) {
    processedDataBuffer[socketId] = {};
  }

  if (!processedDataBuffer[socketId][key]) {
    processedDataBuffer[socketId][key] = {};
  }
  processedDataBuffer[socketId][key] = value;

}

let sendInterval: NodeJS.Timeout | null = null;

const startInterval = () => {
  if (sendInterval) return; 
  sendInterval = setInterval(() => {
    const refData = { ...processedDataBuffer };
    
    if (Object.keys(refData).length > 0) {
      Object.keys(refData).forEach((item)=>{
        clients[item]["socket"].emit('priceDifference', refData[item]);
      })
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



const processData = ({symbol , isHedge, socketId}:processDataTypes) => {

  if (!isHedge){

    const { kucoinData, wazirxData } = symbolData[symbol];

    if (kucoinData && wazirxData) {
      const kucoinPrice = parseFloat(kucoinData["asks"][0][0]);
      let percentageDifferenceInr = 0
      let percentageDifferenceUsdt = 0
      let wazirxPriceInr = 0
      let wazirxPrice = 0
      let priceInUsdt = 0

      if(wazirxData["INR"] && UsdtData["asks"].length > 0  && wazirxData["INR"]["bids"].length > 0){
        wazirxPriceInr = parseFloat(wazirxData["INR"]["bids"][0][0])
        priceInUsdt = wazirxPriceInr / parseFloat(UsdtData["asks"][0][0])
        percentageDifferenceInr = diffrencePer(kucoinPrice, priceInUsdt);
        console.log(symbol, percentageDifferenceInr, kucoinPrice , priceInUsdt)

      }else if(wazirxData["USDT"] && wazirxData["USDT"]["bids"].length > 0){
        wazirxPrice = parseFloat(wazirxData["USDT"]["bids"][0][0])
        percentageDifferenceUsdt = diffrencePer(kucoinPrice, wazirxPrice);
        console.log(symbol, percentageDifferenceUsdt, kucoinPrice, wazirxPrice)
      }

      if (Math.abs(percentageDifferenceInr) > 1 || Math.abs(percentageDifferenceUsdt) > 1) {
        // Send the processed data to the frontend
        io.emit('priceDifference', {
          [symbol] : {"USDT" : {kucoinPrice, wazirxPrice, percentageDifferenceUsdt} , "INR" : {kucoinPrice , priceInUsdt , UsdtData, percentageDifferenceInr}},
        });
      }
    }

  }else{
    const { Spot, Fut } = symbolDataHedge[symbol];

    if(Spot && Fut){
      const spotBuyPrice = parseFloat(Spot["asks"][0][0])
      const spotSellPrice = parseFloat(Spot["bids"][0][0])
      const futBuyPrice = parseFloat(Fut["asks"][0][0])
      const futSellPrice = parseFloat(Fut["bids"][0][0])

      const fwDiffPer = diffrencePer(futSellPrice ,spotBuyPrice);
      const revDiffPer = diffrencePer(spotSellPrice ,futBuyPrice);
      if(clients.hasOwnProperty(socketId) && clients[socketId].hasOwnProperty("data")){
        if ((fwDiffPer - 0.3) > clients[socketId]["data"]["Fw"] || (revDiffPer - 0.3) > clients[socketId]["data"]["Rev"]) {
          // Send the processed data to the frontend
          
          updateObject(symbol, {fwDiffPer : fwDiffPer - 0.3, spotBuyPrice, futSellPrice, revDiffPer : revDiffPer - 0.3, futBuyPrice , spotSellPrice} , socketId)
        
          // io.emit('priceDifference', {
          //   [symbol] : {fwDiffPer : fwDiffPer - 0.3, spotBuyPrice, futSellPrice, revDiffPer : revDiffPer - 0.3, futBuyPrice , spotSellPrice}
          // });
        }
      }
     

    }

  }

  
};

interface handleMessageTypes{
  exchange : string, 
  data : {asks : string[][] , bids : string[][]}, 
  symbol : string,
  market? : "Spot" | "Fut",
  isHedge : boolean,
  socketId: string
}

const handleMessage = ({exchange, data, symbol, market, isHedge, socketId}:handleMessageTypes) => {
  
  const  replacedSymbol = symbol.endsWith("INR") ? symbol.replace("INR", "") : symbol.replace("USDT", "")

  
  if (exchange === 'kucoin') {
    if(isHedge){
      if (!symbolDataHedge[replacedSymbol]) {
        symbolDataHedge[replacedSymbol] = {
          Spot : null,
          Fut : null,
        };
      }
      if(market){
        symbolDataHedge[replacedSymbol][market] = data;
      }
      
      
    }else{
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
    
  } else if (exchange === 'wazirx') {
    if (!symbolData[replacedSymbol] && replacedSymbol !== "USDT") {
      symbolData[replacedSymbol] = {
        kucoinData: null,
        wazirxData: {
          INR: null,
          USDT: null
        },
      };
    }

    if(symbol.includes("INR")){
      if(symbol === "USDTINR"){
        UsdtData = data
      }else{
        symbolData[replacedSymbol]["wazirxData"]["INR"] = data;
      }
    }else{
      symbolData[replacedSymbol]["wazirxData"]["USDT"] = data;
    }
    
  }

  if(!isHedge && symbolData.hasOwnProperty(replacedSymbol)){
    if (symbolData[replacedSymbol]["kucoinData"] !== null && (symbolData[replacedSymbol]["wazirxData"]["USDT"] !== null || symbolData[replacedSymbol]["wazirxData"]["INR"] !== null)) {
      processData({
        symbol : replacedSymbol,
        socketId : socketId
      });  
    }
  }else if(isHedge && symbolDataHedge.hasOwnProperty(replacedSymbol) && symbolDataHedge[replacedSymbol]["Spot"] !== null && symbolDataHedge[replacedSymbol]["Fut"] !== null){
      processData({
        symbol : replacedSymbol, 
        isHedge : isHedge,
        socketId : socketId
      });  
  }
  
};

export {clients, dataEmitter, processData, handleMessage}
                
