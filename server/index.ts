import bodyParser from "body-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { invoiceProcessorRouter } from "./api/routers.ts";
import { logger } from "./src/utils/logger.ts";

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

app.use(invoiceProcessorRouter);

app.listen(port, () => {
  logger.info(`Server is running on http://tomasz-wilczynski-demo-development.up.railway.app:${port}`);
});
