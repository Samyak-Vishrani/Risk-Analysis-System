// const { Worker } = require("bullmq");
import { Worker } from "bullmq";

const worker = new Worker("fraudQueue", async job => {
  console.log("Processing transaction:", job.data);
});