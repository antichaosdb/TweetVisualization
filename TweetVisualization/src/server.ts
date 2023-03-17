import * as chalk from "chalk";
import * as cors from "cors";
import * as express from "express";
import * as http from "http";
import path = require("path");
import { api } from "./api";
// tslint:disable: no-console
const app = express();
//app.use(cors());
app.use(express.static("build"));
app.use("/api", api);

const server = http.createServer(app);

server.listen(3000, "0.0.0.0", () => {
    console.log(
        `Serving at http://localhost:3000 ${chalk.green("✓")}. ${chalk.red("To run in dev mode: npm run dev")}`
    );
});
