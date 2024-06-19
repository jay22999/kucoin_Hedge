import { symbolRetrive, symbolFilter, similarSymbol } from "../function/function"

interface exchangeDetailsTypes {
    [key: string]: {
        baseUrl : string,
        endpoint : string;
        paths : string[],
        replaceString : string[],
        dataPaths : string[],
    };
}

interface ExchangeDetailValueTypes {
    baseUrl: string;
    endpoint : string;
    paths: string[];
    replaceString: string[];
    dataPaths : string[];
   
}


const allExchangeSymbols = async(isHedge : boolean) => {
    const symbolsArray : string[][]  = []
    let inrSymbols : string[] = []

    const exchangeDetails : exchangeDetailsTypes = {
        kucoin : {
            baseUrl : "https://api.kucoin.com",
            endpoint : "/api/v2/symbols",
            paths : ["symbol"],
            dataPaths : ["data"],
            replaceString : ["-USDT"],

        },
        wazirx : {
            baseUrl : "https://api.wazirx.com",
            endpoint : "/sapi/v1/exchangeInfo",
            paths : ["symbol"],
            dataPaths : ["symbols"],
            replaceString : ["usdt" , "inr"],
        }
    }

    async function processExchangeDetails(exchangeDetails: any) {
       if(!isHedge){ 
            for (const [k, v] of Object.entries(exchangeDetails)) {
                const value : ExchangeDetailValueTypes = v as ExchangeDetailValueTypes;
                try {
                    const data = await symbolRetrive(`${value["baseUrl"]}${value["endpoint"]}`);
                    console.log(data)
                    const {symbols , inrPairs} = symbolFilter({ paths: value["paths"], dataPaths : value["dataPaths"] ,replaceString: value["replaceString"], data: data });
                    symbolsArray.push(symbols)
                    inrSymbols = inrPairs
                    
                } catch (error) {
                    console.error(`Error processing exchange detail ${k}:`, error);
            }
            
        }}else{
            const exchangeInfo : exchangeDetailsTypes  = {
                Future : {
                    replaceString : ["USDTM"],
                    baseUrl : "https://api-futures.kucoin.com",
                    endpoint : "/api/v1/contracts/active",
                    paths : ["symbol"],
                    dataPaths : ["data"],
                },
                Spot : {
                    baseUrl : "https://api.kucoin.com",
                    endpoint : "/api/v2/symbols",
                    paths : ["symbol"],
                    dataPaths : ["data"],
                    replaceString : ["-USDT"],
                }
            }

            for (const [k, v] of Object.entries(exchangeInfo)){
                const value : ExchangeDetailValueTypes = v as ExchangeDetailValueTypes;
                try {
                    const data = await symbolRetrive(`${value["baseUrl"]}${value["endpoint"]}`);
                    
                    const {symbols} = symbolFilter({ paths: value["paths"], dataPaths : value["dataPaths"] ,replaceString: value["replaceString"], data: data });
                    symbolsArray.push(symbols)
                    
                } catch (error) {
                    console.error(`Error processing exchange detail ${k}:`, error);
                }
            }
        }
    }

    await processExchangeDetails(exchangeDetails)
    const filterSymbol = similarSymbol({symbolsA : symbolsArray[0] , symbolsB : symbolsArray[1]})
    !isHedge && inrSymbols.filter((item)=> filterSymbol.includes(item))
    return {filterSymbol , inrSymbols}

}

export default allExchangeSymbols
