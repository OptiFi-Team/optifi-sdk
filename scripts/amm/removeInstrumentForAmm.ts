import { initializeContext } from "../../index";
import { SUPPORTED_ASSETS } from "../../constants";
import Context from "../../types/context";
import { initializeAmm } from "../../instructions/initializeAmm";
import { formatExplorerAddress, SolanaEntityType } from "../../utils/debug";
import { AmmAccount, Chain, Duration, OptifiMarket } from "../../types/optifi-exchange-types";
import { findOptifiMarkets } from "../../utils/market";
import { ammIndex } from "./constants";
import { removeInstrumentsFromAmm } from "./utils";

initializeContext().then((context) => {
    removeInstrumentsFromAmm(context, ammIndex)
})
