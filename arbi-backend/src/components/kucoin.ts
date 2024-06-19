import axios from 'axios';
import  WebSocket from 'ws';
import allExchangeSymbols from "./symbol"
import {chunkArray, extractSymbol} from "../function/function"
import {dataEmitter, handleMessage} from "../app"


let socket : WebSocket | undefined = undefined

const KucoinSocket  = async (sockio : WebSocket , socketId : string, symbols : string[] , inrSymbols : string[], clients : {[key:string] : any}, isHedge : boolean) => {
    console.log("in kucoin")

    async function postData(){
        try {
            if(!socket){   
                const tokenurl = "https://api.kucoin.com/api/v1/bullet-public"
                const response = await axios.post(tokenurl);
                const url = `wss://ws-api.kucoin.com/endpoint?token=${response.data.data.token}`
                return new WebSocket(url)
            }else{
                return socket
            }
           
        } catch (error) {
          console.error('Error making POST request:', error);
        }
    }

    socket = await postData()

    let reconnectInterval: NodeJS.Timeout | null = null;

    const attemptReconnect = () => {
        if (!reconnectInterval) {
          reconnectInterval = setInterval(() => {
            console.log('Attempting to reconnect...');
            websocketConnection();
          }, 5000); // Retry every 5 seconds
        }
    };
   
    const websocketConnection = () => {

        console.log("in websocketConnection")

        const pingInterval = setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) {
                socket?.ping();
              console.log('Ping sent to KuCoin WebSocket');
            }
          }, 30000);

        socket?.on('pong', () => {
            console.log('Received pong from server');
          });
    
        socket?.on('open', () => {
            console.log('Connected to the Kucoin WebSocket server');
            
            const symbolsArray = chunkArray({array: symbols, chunkSize: 20, extendString: ["-USDT", "USDTM"], isJoin: true, inrSymbols: inrSymbols, isUpperCase : true, isHedge : isHedge , exceptionSymbols : ["ace", "alt", "ai"]})

            let id = 6573947

            if (reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
            }

            symbolsArray.forEach((item, index) => {
                if(isHedge){
                    const topics = ["/spotMarket/level2Depth50:" , "/contractMarket/level2Depth50:"]
                    for (const topic of topics){
                        setTimeout(() => {
                            socket?.send(JSON.stringify({
                                "id": id,
                                "type": "subscribe",
                                "topic": `${topic}${item}`,
                                "privateChannel": false,
                                "response": true
                            }));
                            id += 1;
                        }, index * 1000);
                        
                    }
                }else{
                    setTimeout(() => {
                        socket?.send(JSON.stringify({
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
        
        socket?.on('message', (data: WebSocket.Data) => {
            if(Object.keys(clients).length === 0){
                console.log("there is no client available")
                socket?.close()
            }
            const parsedData = JSON.parse(data.toString());
            
            const symbol = parsedData.hasOwnProperty("topic") ? extractSymbol(parsedData["topic"], "kucoin") : null;
            
            if(symbol !== null){
                // dataEmitter.emit(symbol, { exchange: 'kucoin', data: parsedData["data"] });
                const market = parsedData["topic"].includes("/spotMarket/level2Depth50") ? "Spot" : "Fut"
                
                handleMessage({
                    exchange : 'kucoin', 
                    data : {asks : parsedData["data"]["asks"] , bids : parsedData["data"]["bids"]}, 
                    symbol : `${symbol}USDT`,
                    isHedge : isHedge,
                    market : market,
                    socketId : socketId
                });

                
            }
            
            // sockio.emit("Data" , data.toString())
        });
        
        socket?.on('close', (code, resone) => {
            console.log('Disconnected from the WebSocket server',code, resone);
            if (code !== 1000) { // Handle abnormal closures
                console.error('Abnormal closure detected. Attempting to reconnect...');
                attemptReconnect();
            }
            clearInterval(pingInterval);
        });
        
        socket?.on('error', (err: Error) => {
            console.error('WebSocket error:', err);
        });
    }

    if(socket){
        websocketConnection()
    }

    
    
}

export default KucoinSocket










