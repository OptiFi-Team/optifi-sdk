import * as anchor from "@project-serum/anchor";
import { OptifiExchangeIDL } from "./optifi-exchange-types";
import { Connection, Keypair, } from "@solana/web3.js";
import { SolanaCluster } from "../constants";
import WalletType from "./walletType";


export default interface Context {
    program: anchor.Program<OptifiExchangeIDL>,
    endpoint: SolanaCluster,
    connection: Connection,
    exchangeUUID: string,
    provider: anchor.AnchorProvider,
    walletType: WalletType,
    walletKeypair?: Keypair
}