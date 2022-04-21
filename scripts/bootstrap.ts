import { initializeContext } from "../index";
import Context from "../types/context";
import boostrap from "../sequences/boostrap";

initializeContext().then((context: Context) => {
    console.log("Initialized")
    boostrap(context).then((res) => {
        console.log(res)
        console.log("Bootstrapped")
    }).catch((err) => {
        console.error(err);
        console.error("Got error");
    })
}).catch((err) => {
    console.error(err);
    console.error("Got error");
})