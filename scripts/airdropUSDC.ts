
import airdropUSDC from "../utils/faucet"
import { initializeContext } from "../index";

initializeContext().then((context) => {
    airdropUSDC(context).then(txid => console.log("airdropUSDC txid: ", txid))
})