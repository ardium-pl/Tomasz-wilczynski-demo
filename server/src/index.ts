import bodyParser from "body-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { invoiceProcessorRouter } from "../api/routers.js";
import { logger } from "./utils/logger.js";
import { clientRouter } from "./client.js";

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

app.use(invoiceProcessorRouter);
app.use(clientRouter);

app.listen(port, () => {
  logger.info(`Server is running on http://tomasz-wilczynski-demo-development.up.railway.app:${port}`);
});
