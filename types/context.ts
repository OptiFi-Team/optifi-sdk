import * as anchor from "@project-serum/anchor";
import { OptifiExchangeIDL } from "./optifi-exchange-types";
import { Connection, Keypair, } from "@solana/web3.js";
import { SolanaEndpoint } from "../constants";
import WalletType from "./walletType";


export default interface Context {
    program: anchor.Program<OptifiExchangeIDL>,
    endpoint: SolanaEndpoint,
    connection: Connection,
    exchangeUUID: string,
    provider: anchor.Provider,
    walletType: WalletType,
    walletKeypair?: Keypair
}