import { rejects } from "assert";
import { resolve } from "path";
import WebSocket from "ws";
import { initializeContext } from "../index";
import { findOptifiInstruments } from "../utils/market";
const SamplingTime = 4 * 1000; // ms to get once data

export type Instrument = {
  tick_size: number;
  taker_commission: number;
  strike: number;
  settlement_period: String;
  quote_currency: String;
  option_type: String;
  min_trade_amount: number;
  maker_commission: number;
  kind: String;
  is_active: true;
  instrument_name: String;
  expiration_timestamp: number;
  creation_timestamp: number;
  contract_size: number;
  block_trade_commission: number;
  base_currency: String;
};

export type Trades = {
  trades: Trade[];
  has_more: boolean;
};

export type Trade = {
  trade_seq: number; // The sequence number of the trade within instrument
  trade_id: String; // Unique (per currency) trade identifier
  timestamp: number;
  tick_direction: number;
  price: number;
  mark_price: number;
  iv: number;
  instrument_name: String;
  index_price: number;
  direction: String;
  amount: number;
};

async function getInstruments(): Promise<Instrument[]> {
  let results: Instrument[] = [];

  let msg = {
    jsonrpc: "2.0",
    id: 7617,
    method: "public/get_instruments",
    params: {
      currency: "BTC",
      kind: "option",
      expired: false,
    },
  };
  let ws = new WebSocket("wss://test.deribit.com/ws/api/v2");

  ws.onmessage = function (e) {
    // do something with the response...
    results = JSON.parse(e.data.toString()).result;

    // close the connection from the server
    ws.close();
  };

  ws.onopen = function () {
    ws.send(JSON.stringify(msg));
  };

  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(results), 5000);
  });
}

async function matchStrike(
  allInstrument: Instrument[],
  optifiStrike: number[]
): Promise<Instrument[]> {
  let result = allInstrument.filter((e) => {
    //try to match a strike to test(to save time...)
    if (e.strike == optifiStrike[0]) {
      return true;
    }
    return false;

    // for (let strike of optifiStrike) {
    //   if (e.strike == strike) {
    //     return true;
    //   }
    // }
    // return false;
  });

  return result;
}

async function getTradesByNameAndTime(
  i: String,
  start_timestamp: number,
  end_timestamp: number
): Promise<Trade> {
  let ws = new WebSocket("wss://test.deribit.com/ws/api/v2");
  let trades: Trade[] = [];
  var msg = {
    jsonrpc: "2.0",
    //id: 3983,
    method: "public/get_last_trades_by_instrument_and_time",
    params: {
      instrument_name: i,
      start_timestamp: start_timestamp,
      end_timestamp: end_timestamp,
      count: 1, // ask for how many trades
    },
  };

  ws.onmessage = function (e) {
    let results: Trades = JSON.parse(e.data.toString()).result;

    trades = results.trades;
    ws.close();
  };
  ws.onopen = function () {
    ws.send(JSON.stringify(msg));
  };

  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(trades[0]), SamplingTime);
  });
}

export async function getInstrumentWithMatchStrike(): Promise<Instrument[]> {
  return new Promise(async (resolve, rejects) => {
    //get all deribit instrument
    let allInstrument = await getInstruments();
    console.log("all instrument amount: " + allInstrument.length);

    //get optifi market strike
    let context = await initializeContext();
    let instruments = await findOptifiInstruments(context);
    let optifiStrike: number[] = [];
    for (let i of instruments) {
      optifiStrike.push(i[0].strike.toNumber());
    }

    //use all deribit instrument and optifi strike to get instrument with match strike
    let instrumentWithMatchStrike = await matchStrike(
      allInstrument,
      optifiStrike
    );
    console.log(
      "instrument with match strike amount: " + instrumentWithMatchStrike.length
    );
    resolve(instrumentWithMatchStrike);
  });
}

export function getTrades(
  instrumentWithMatchStrike: Instrument[],
  start_timestamp: number,
  end_timestamp: number
): Promise<Trade[]> {
  return new Promise(async (resolve, reject) => {

    //get trade from match instrument
    //the trade which:
    //1. is not in timestamp range
    //2. is empty
    //will not be pushed in
    let trades: Trade[] = [];
    //console.log("time range: " + start_timestamp + " - " + end_timestamp);
    for (let i of instrumentWithMatchStrike) {
  
      //instrument_name example:"BTC-21JAN22-42000-P" / "BTC-PERPETUAL"
      let trade = await getTradesByNameAndTime(
        i.instrument_name,
        start_timestamp,
        end_timestamp
      );
      if (trade) {
        trades.push(trade);
      }
      // else {
      //   console.log("this instrument can't find trades: ");
      //   console.log(i)
      // };
    }
    resolve(trades);
  });
}

//1650960932000
//1590480022768
//1589780436099
