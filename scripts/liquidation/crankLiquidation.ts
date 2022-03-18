import { publicKey } from "@project-serum/anchor/dist/cjs/utils";
import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import liquidateUser from "../../sequences/liquidateUser";
import { getAllUsersOnExchange } from "../../utils/accounts";
import { sleep } from "../../utils/generic";

const liquidationLoop = async (context) => {

    let Users = await getAllUsersOnExchange(context);

    Users.forEach((user) => {
        let userToLiquidate = user.publicKey;

        liquidateUser(context, userToLiquidate).then((res) => {
            console.log("Got liquidateUser res", res);
        }).catch((err) => {
            console.error(err);
        })
    });

    try {
        await sleep(1000);
        await liquidationLoop(context);
    } catch (e) {
        await sleep(5000);
    }
}

initializeContext().then((context) => {
    liquidationLoop(context);
})