import { PublicKey } from "@solana/web3.js";
import { initializeContext } from "../../index";
import addAuthority from "../../instructions/marginStress/addAuthority";

let newAuthority = new PublicKey("6nZJeVbGNNxQfre7RCYRjMuA1JmexQkyFYJtWm2TZ4J1")

initializeContext().then((context) => {
    addAuthority(context, newAuthority).then((res) => {
        console.log(res);
    }).catch((err) => {
        console.error(err);
    })
})