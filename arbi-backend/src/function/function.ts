import axios from 'axios';


interface SymbolFilterParams {
    paths: Array<string>;
    replaceString: string[];
    data : Array<string>;
    dataPaths : string[]
}

interface similarSymbolTypes{
    symbolsA : string[],
    symbolsB : string[]
}

interface chunkArrayTypes {
    array : string[], 
    chunkSize : number, 
    extendString : string[], 
    isJoin : boolean, 
    inrSymbols: string[],
    isUpperCase : boolean,
    isHedge : boolean,
    exceptionSymbols? : string[]
}

const proxies = [
    'http://154.73.29.201',
    'http://189.193.254.98',
];

const getRandomProxy = () =>{
    const randomIndex = Math.floor(Math.random() * proxies.length);
    return proxies[randomIndex];
}

const symbolRetrive = async(url : string) => {
    const proxy = getRandomProxy();
    const config = {
        proxy: {
            protocol: proxy.startsWith('https') ? 'https' : 'http',
            host: proxy.split('://')[1],
            port: 8080
        },
    };
    try {
        const response = await axios.get(url);
        return response.data;

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error message:', error.message);
            // Handle Axios specific error here
        } else {
            console.error('Unexpected error:', error);
        }
        throw error;
    }
}

const symbolFilter = ({paths , replaceString, data , dataPaths} : SymbolFilterParams) => {
    let symbolData : any = data
    
    dataPaths.forEach((item : any)=>{
        symbolData = symbolData[item]
    })

    const symbols : string[] = []
    const inrPairs : string[] = []


    symbolData.forEach((item : any)=>{

        let symbol = item

        paths.forEach((path)=>{
            symbol = symbol[path]
        })

        replaceString.forEach((item)=>{
            const symbolName = (symbol.replace(item, "")).toLowerCase()
            if(symbol.includes(item) && !symbols.includes(symbolName)){
                if(item === "inr" && !inrPairs.includes(symbolName)){
                    inrPairs.push(symbolName)
                }
                symbols.push(symbolName)   
            }
        })   
    })

    return {symbols , inrPairs}
}

const similarSymbol = ({symbolsA , symbolsB} : similarSymbolTypes) => {
    const symbols =  symbolsA.filter((item)=> symbolsB.includes(item))
    return symbols
}

const chunkArray = ({array, chunkSize, extendString, isJoin, inrSymbols, isUpperCase, isHedge, exceptionSymbols}:chunkArrayTypes) => {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.slice(i, i + chunkSize);
        const modifiedArray  : string[] = []

        chunk.forEach(item => {
            extendString.forEach((v)=>{
                if(!exceptionSymbols?.includes(item)){
                    
                    if(isHedge){
                        if (inrSymbols.includes(item) && v.includes("inr")){
                            modifiedArray.push(isUpperCase ? item.toUpperCase() + v : item.toLowerCase() + v)
                        }else{
                            modifiedArray.push(isUpperCase ? item.toUpperCase() + v : item.toLowerCase() + v)
                        }
                    }else{
                        modifiedArray.push(isUpperCase ? item.toUpperCase() + v : item.toLowerCase() + v)
                    }
                }           
            })
            
        });

        if(isJoin){
            chunkedArray.push(modifiedArray.join(","))
        }else{
            chunkedArray.push(modifiedArray)
        }
        
    }
    if(!isJoin){
        chunkedArray.push(["usdtinr@depth20@100ms"])
    }
    return chunkedArray;
}

const diffrencePer = (price1: number, price2: number): number => {
    const difference = price1 - price2;
    return (difference / price1) * 100;
  };

const extractSymbol = (str : string, exchange : string) => {
    if(exchange === "kucoin"){
        const match = str.match(/:([^:]*)$/);
        const symbol = match ? match[1] : null
        let symbolName

        if(symbol?.includes("USDTM")){
            symbolName = symbol.replace("USDTM", "")
        }else if (symbol?.includes("-USDT")){
            symbolName = symbol.replace("-USDT", "")
        }else{
            symbolName = null
        }

        return symbolName

    }else{ 
        return str.toUpperCase()
    }
   
  };

export {symbolRetrive, symbolFilter, similarSymbol, chunkArray, extractSymbol, diffrencePer}