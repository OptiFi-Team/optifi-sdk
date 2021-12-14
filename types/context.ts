import * as anchor from "@project-serum/anchor";
import {OptifiExchangeIDL} from "./optifi-exchange-types";
import {Keypair} from "@solana/web3.js";

export default interface Context {
    program: anchor.Program<OptifiExchangeIDL>,
    user: Keypair,
}