import axios from 'axios';
import  WebSocket from 'ws';
import allExchangeSymbols from "./symbol"
import {chunkArray, extractSymbol} from "../function/function"
import { handleMessage } from '../app';

const WazirxSocket  = async (sockio : WebSocket , socketId : string, symbols : string[] , inrSymbols : string[], clients : {[key:string] : any}, isHedge : boolean) => {
    console.log("in WazirxSocket")

    const websocketConnection = () => {

        const url = `wss://stream.wazirx.com/stream`
    
        const socket = new WebSocket(url);

        const pingInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.ping();
              console.log('Ping sent to Wazirx WebSocket');
            }
          }, 30000);
    
        socket.on('open', () => {
            console.log('Connected to the Wazirx WebSocket server');
            
            const symbolsArray = chunkArray({array: symbols, chunkSize: 20, extendString: ["inr@depth20@100ms", "usdt@depth20@100ms"], isJoin: false, inrSymbols: inrSymbols, isUpperCase : false, isHedge : isHedge})

            let id = 6573947

            symbolsArray.forEach((item, index) => {
                console.log(item)
                setTimeout(() => {
                    socket.send(JSON.stringify({
                            "event":"subscribe",
                            "streams": item
                        }
                        ));
                    id += 1;
                }, index * 1000);
            });

           
        });
        
        socket.on('message', (data: WebSocket.Data) => {
            if(Object.keys(clients).length === 0){
                socket.close()
            }
            const parsedData = JSON.parse(data.toString());
            const symbol = parsedData.hasOwnProperty("data") && parsedData["data"].hasOwnProperty("s")  ? extractSymbol(parsedData["data"]["s"], "wazirx") : null;
            // console.log(parsedData["data"])
        
            if(symbol !== null){
                
                // dataEmitter.emit(symbol, { exchange: 'kucoin', data: parsedData["data"] });
                handleMessage({
                    exchange : 'wazirx',
                    data : {asks : parsedData["data"]["a"] , bids : parsedData["data"]["b"]}, 
                    symbol : symbol,
                    isHedge : isHedge,
                    socketId : socketId
                });
            }
            // sockio.emit("Data" , data.toString())
        });
        
        socket.on('close', () => {
            console.log('Disconnected from the WebSocket server');
            clearInterval(pingInterval);
        });
        
        socket.on('error', (err: Error) => {
            console.error('WebSocket error:', err);
        });
    }

    websocketConnection()
}

export default WazirxSocket










