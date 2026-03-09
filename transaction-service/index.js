import express from "express"

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Transaction Service Running");
});

app.listen(5001, () => {
  console.log("Transaction Service running on port 5001");
});