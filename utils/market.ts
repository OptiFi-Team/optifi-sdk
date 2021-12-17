import Context from "../types/context";
import {PublicKey} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Market } from "@project-serum/serum";


export function getMarketInfo (context: Context): Promise<Market> {
    return Market.load(
        context.connection,
        /* marketAddress serumMarket */new PublicKey("DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY"),
        undefined,
        new PublicKey("DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY")
      );
} 