import createAMMAccounts from "../../sequences/createAMMAccounts";
import { sleep } from "../../utils/generic";
import initializeAmmOnMarkets from "../../sequences/initializeAMMOnMarkets";
import { initializeContext } from "../../index";

initializeContext().then((context) => {

    createAMMAccounts(context).then(async () => {
        console.log("Created AMM accounts, waiting 10 seconds before initializing them on the markets");
        await sleep(10 * 1000);
        initializeAmmOnMarkets(context).then((res) => {
            console.log("Initialized AMM on markets! Bootstrapping complete");
        }).catch((err) => {
            console.error(err);
        })
    })



})

