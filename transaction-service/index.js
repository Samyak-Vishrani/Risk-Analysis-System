import app from "./src/server.js";

// const PORT = 5001;

app.listen(process.env.TRANSACTION_SERVICE_PORT, () => {
  console.log(`Transaction Service running on port ${process.env.TRANSACTION_SERVICE_PORT}`);
});