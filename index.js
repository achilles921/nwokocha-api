const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const ethers = require("ethers");
const bodyParser = require('body-parser');

require('dotenv').config();

const app = express();

const abi = require('./src/abis/predictionAbi.json');

const port = process.env.API_PORT || 3001;
const appPort = process.env.SERVER_PORT || 3000;
const appOrigins = [
  `http://localhost:${appPort}`,
  `http://${process.env.SERVER_IP}:${appPort}`,
];
const gasPrice = 3000000000;
const gasLimit = 12000000;



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(helmet());
app.use(cors({ origin: appOrigins }));

const handleError = (e) => {
  if (e.reason == "cancelled") {
    return "tx cancelled";
  } else if (e.reason == "transaction failed") {
    return "tx failed";
  } else if (e.reason == "insufficient funds for intrinsic transaction cost") {
    return "insufficient balance"
  } else if (e.reason == "replaced") {
    return "tx replaced";
  } else {
    return "unknown";
  }
}

app.post("/api/bet", async (req, res) => {
  const { direction, epoch, amount, password } = req.body;
  console.log("direction: ", direction == 0 ? "up" : "down", "epoch: ", epoch);
  
  if (password !== "1028GTS") {
    res.send({
      success: false,
      error: "wrong password"
    });
  }

  try {
    const provider = new ethers.WebSocketProvider(process.env.WEB_SOCKET_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet)

    let tx_res;
    let betAmount = amount;
    if (amount > 0.21) {
      betAmount = 0.21;
    }

    console.log("bet amount:", amount);
    if (direction == 0) {
      tx_res = await contract.betBull(epoch, {
        value: ethers.parseEther(betAmount.toFixed(4)),
        gasPrice: gasPrice,
        gasLimit: gasLimit
      });
    } else {
      tx_res = await contract.betBear(epoch, {
        value: ethers.parseEther(betAmount.toFixed(4)),
        gasPrice: gasPrice,
        gasLimit: gasLimit
      });
    }
    
    console.log("bet done, wating for result.");
    bet_res = await tx_res.wait(1);
  } catch(e) {
    console.log(e);
    
    res.send({
      success: false,
      error: handleError(e)
    });
    return;
  }

  res.send({
    success: true,
  });
});

app.get("/api/history", async (req, res) => {
  // const time = new Date();
  // const strTimePassed = time.toLocaleString('en-US', {
  //   hour: '2-digit',
  //   minute: '2-digit',
  //   hour12: false,
  //   timeZone: 'UTC',
  // });
  // const timePassed = parseInt(strTimePassed.substring(0, 2)) * 60 + parseInt(strTimePassed.substring(3));
  // const roundCount = parseInt(timePassed / 5) + 1;
  const provider = new ethers.WebSocketProvider(process.env.WEB_SOCKET_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet)

  const roundLength = parseInt(await contract.getUserRoundsLength(wallet.address));

  const userRounds = await contract.getUserRounds(wallet.address, 0, roundLength);
  roundList = userRounds[1];
  epochList = userRounds[0];
  console.log(roundList);
  console.log("---")
  console.log(epochList);

  res.send({
    success: true,
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.log(reason)
});

process.on('uncaughtException', (reason) => {
  console.log(reason)
});

app.listen(port, () => console.log(`API Server listening on port ${port}`));
