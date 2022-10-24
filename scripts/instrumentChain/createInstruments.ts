// @ts-ignore
import {initializeContext} from "../../index";
import Context from "../../types/context";
import boostrap from "../../sequences/boostrap";
import {createInstruments} from "../../sequences/createInstruments";

initializeContext().then((context: Context) => {
    console.log("Initialized")
    createInstruments(context).then((res) => {
        console.log(res)
        console.log("created instruments")
    }).catch((err) => {
        console.error(err);
        console.error("Got error");
    })
}).catch((err) => {
    console.error(err);
    console.error("Got error");
})