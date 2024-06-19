import {
  Box,
  Button,
  Center,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Text,
  Input,
  Thead,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import io from "socket.io-client";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import moment from "moment";
import config from "./config";

interface priceDataType {
  [key: string]: { [key: string]: number } | null;
}

const socket = io(config["baseUrl"]);

function App() {
  const [priceData, setPriceData] = useState<priceDataType>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const DiffPerSchema = yup.object().shape({
    Fw: yup
      .number()
      .required("Fw Per is required")
      .test(
        "is-number",
        "Fw Per must be a number with up to 2 decimal places",
        (value) => {
          if (typeof value !== "number" || isNaN(value)) {
            return false;
          }

          const regex = /^-?\d+(\.\d{1,2})?$/;
          return regex.test(value.toString());
        }
      ),
    Rev: yup
      .number()
      .required("Rev Per is required")
      .test(
        "is-number",
        "Rev Per must be a number with up to 2 decimal places",
        (value) => {
          if (typeof value !== "number" || isNaN(value)) {
            return false;
          }

          const regex = /^-?\d+(\.\d{1,2})?$/;
          return regex.test(value.toString());
        }
      ),
  });

  const { register, handleSubmit, reset } = useForm({
    resolver: yupResolver(DiffPerSchema),
  });

  useEffect(() => {
    if (Object.keys(priceData).length > 0) {
      setLastUpdated(new Date());
    }
  }, [priceData]);

  useEffect(() => {
    if (lastUpdated) {
      const timer = setTimeout(() => {
        const now = new Date();
        const diff = now.getTime() - lastUpdated.getTime();
        if (diff >= 10000) {
          setPriceData({});
        }
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [lastUpdated]);

  // const handalonClick = () => {
  //   socket.emit("startKuCoin");
  // };

  const handalOnClick = () => {
    socket.emit("startKuCoinHedge");
  };

  const handalOnClickStop = () => {
    socket.disconnect();
    socket.connect();
  };

  socket.on("priceDifference", (data) => {
    setPriceData(data);
  });

  const handleOnSubmit = async (data: object) => {
    console.log(data);
    socket.emit("diffPer", data);
    reset();
  };

  const onSubmit = (data: object) => {
    handleOnSubmit(data);
  };

  return (
    <Box w="100vw" minH="100vh" bg={useColorModeValue("gray.100", "gray.900")}>
      <Center pt="20px">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box display="flex" w="40%">
            <Box>
              <Input
                placeholder="FW Per"
                size="md"
                mr="20px"
                w="100px"
                {...register("Fw")}
              />
              {/* {errors["Fw"] && <span>Only Numbers Accepted</span>} */}
            </Box>
            <Box>
              <Input
                placeholder="Rev Per"
                size="md"
                mr="20px"
                w="100px"
                {...register("Rev")}
              />
              {/* {errors["Rev"] && <span>Only Numbers Accepted</span>} */}
            </Box>
            <Box>
              <Button type="submit">Submit</Button>
            </Box>
          </Box>
        </form>
        <Box w="40%">
          <Center>
            <Button onClick={handalOnClick} mr="30px">
              Find Arbi
            </Button>
            <Button onClick={handalOnClickStop}>Restart</Button>
          </Center>
        </Box>
        <Box w="20%" textAlign="center">
          {lastUpdated && (
            <Text fontSize="md" as="b">
              Last Updated : {moment(lastUpdated).format("hh:mm:ss")}
            </Text>
          )}
        </Box>
      </Center>

      <Center pt="30px">
        <TableContainer w="98%" h="600px" overflowY="auto" backgroundColor="">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th fontSize="md" textAlign="center">
                  Symbol
                </Th>
                <Th fontSize="md" textAlign="center">
                  Fw
                </Th>
                <Th fontSize="md" textAlign="center">
                  Spot Buy
                </Th>
                <Th fontSize="md" textAlign="center">
                  Fut Sell
                </Th>
                <Th fontSize="md" textAlign="center">
                  Rev
                </Th>
                <Th fontSize="md" textAlign="center">
                  Spot Sell
                </Th>
                <Th fontSize="md" textAlign="center">
                  Fut Buy
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {Object.keys(priceData).length > 0 &&
                Object.entries(priceData).map(([k, v]) => {
                  const defaultValue: { [key: string]: number } = {
                    fwDiffPer: 0,
                    spotBuyPrice: 0,
                    futSellPrice: 0,
                    revDiffPer: 0,
                    futBuyPrice: 0,
                    spotSellPrice: 0,
                  };

                  const value: { [key: string]: number } = {
                    ...defaultValue,
                    ...v,
                  };
                  return (
                    <Tr>
                      <Td textAlign="center">{k}</Td>
                      <Td textAlign="center">
                        {value["fwDiffPer"].toFixed(2)}
                      </Td>
                      <Td textAlign="center">{value["spotBuyPrice"]}</Td>
                      <Td textAlign="center">{value["futSellPrice"]}</Td>
                      <Td textAlign="center">
                        {value["revDiffPer"].toFixed(2)}
                      </Td>
                      <Td textAlign="center">{value["futBuyPrice"]}</Td>
                      <Td textAlign="center">{value["spotSellPrice"]}</Td>
                    </Tr>
                  );
                })}
            </Tbody>
          </Table>
        </TableContainer>
      </Center>
    </Box>
  );
}

export default App;
