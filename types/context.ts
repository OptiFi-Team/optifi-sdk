import * as anchor from "@project-serum/anchor";
import {OptifiExchangeIDL} from "./optifi-exchange-types";
import {Connection, Keypair} from "@solana/web3.js";
import {SolanaEndpoint} from "../constants";
import { Wallet } from "@project-serum/anchor/dist/cjs/provider";


export default interface Context {
    program: anchor.Program<OptifiExchangeIDL>,
    user?: Keypair,
    endpoint: SolanaEndpoint,
    connection: Connection
}