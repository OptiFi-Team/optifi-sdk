
import { initializeContext } from "../../index";
import cleanExpiredInstruments from "../../instructions/cleanExpiredInstruments";

initializeContext().then(async (context) => {
    let res = await cleanExpiredInstruments(context);
    console.log(res)
})