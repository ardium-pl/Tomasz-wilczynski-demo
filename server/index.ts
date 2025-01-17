import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { invoiceProcessorRouter } from "./api/routers.js";
import { logger } from "./src/utils/logger.js";
import { clientRouter } from "./client.js";
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

app.use(invoiceProcessorRouter);
// app.use(clientRouter);

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});
