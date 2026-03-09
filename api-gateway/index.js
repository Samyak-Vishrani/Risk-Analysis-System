// const express = require("express");
import express from "express";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API Gateway Running");
});

app.listen(5000, () => {
  console.log("API Gateway running on port 5000");
});