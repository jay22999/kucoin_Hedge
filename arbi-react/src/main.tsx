import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import theme from "./theme/theme.ts";
import "./index.css";
import { ChakraProvider } from "@chakra-ui/react";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ChakraProvider theme={theme}>
    <App />
  </ChakraProvider>
);
