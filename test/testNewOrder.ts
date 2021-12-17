import {initializeContext} from "../index";
import {findUserAccount, userAccountExists} from "../utils/accounts";
import * as assert from "assert";
import * as anchor from "@project-serum/anchor";
import initUserOnOptifiMarket from "../instructions/initUserOnOptifiMarket";
import newOrder from "../instructions/newOrder";
import { OrderSide } from '../types/optifi-exchange-types';

describe('Initialize a new order', () => {
    let context = initializeContext();

    it('Can derive a user address', () => {
        assert.doesNotReject(findUserAccount(context))
    });

    it('Initialize a new order', () => {
        console.log("Trying to make an order");
        newOrder(context, OrderSide.Ask).then((tx: any) => {
            console.log('Order', tx)
            assert.ok("Finished order");
        }).catch((err) => {
            console.log('error trying to initialize')
            console.log(err)
            assert.fail("Couldn't inialize");
        });

    })
})