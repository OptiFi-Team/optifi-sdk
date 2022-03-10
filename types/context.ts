import * as anchor from "@project-serum/anchor";
import { OptifiExchangeIDL } from "./optifi-exchange-types";
import { Connection, Keypair, } from "@solana/web3.js";
import { SolanaEndpoint } from "../constants";
import WalletType from "./walletType";


export default interface Context extends ContextWithoutWallets {
    provider: anchor.Provider,
    walletType: WalletType,
    walletKeypair?: Keypair
}

export interface ContextWithoutWallets {
    program: anchor.Program<OptifiExchangeIDL>,
    endpoint: SolanaEndpoint,
    connection: Connection,
    exchangeUUID: string,
}