require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();

const TELEGRAM_API_TOKEN = process.env.TELEGRAM_API_TOKEN;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/", (req, res) => {
  const { message } = req.body;

  if (!message || message.text.toLowerCase().indexOf("marco") < 0) {
    return res.end();
  }

  const apiURL = `https://api.telegram.org/bot${TELEGRAM_API_TOKEN}/sendMessage`;
  const payload = { chat_id: message.chat.id, text: "test" };

  axios
    .post(apiURL, payload)
    .then(() => res.end("ok"))
    .catch((err) => res.end("Error: " + err));
});

app.listen(process.env.PORT);
