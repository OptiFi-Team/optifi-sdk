import * as anchor from "@project-serum/anchor";
import { OptifiExchangeIDL } from "./optifi-exchange-types";
import { OptifiUsdc } from "./optifi_usdc";
import { Connection, Keypair, } from "@solana/web3.js";
import { SolanaCluster } from "../constants";
import WalletType from "./walletType";


export default interface Context {
    program: anchor.Program<OptifiExchangeIDL>,
    cluster: SolanaCluster,
    connection: Connection,
    exchangeUUID: string,
    provider: anchor.AnchorProvider,
    walletType: WalletType,
    walletKeypair?: Keypair,
    optifiUSDCProgram: anchor.Program<OptifiUsdc>
}