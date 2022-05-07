//refer to strikes.py
//different:
//fix ts / ms (without multiplied by 1000), T in getStrikes()

export async function getStrikes(
    spot: number,
    vol: number,
    ts: number,
    mt: number
  ): Promise<number[]> {
    return new Promise<number[]>((resolve, reject) => {
      let str = Math.round(spot).toString();
      let int_len_spot = str.length;
      let target = spot / 10 ** (int_len_spot - 2);
  
      let base_int;
      if (target < 10) base_int = 1;
      else if (target < 20) base_int = 1;
      else if (target < 50) base_int = 2.5;
      else if (target < 75) base_int = 5;
      else base_int = 10;
  
      let T = 0.022509037;//(mt - ts) / 60 / 60 / 24 / 365 ;
      let inv_deltas: number[] = [
        -2.576, -1.282, -0.675, -0.385, 0.0, 0.385, 0.675, 1.282, 2.576,
      ];
  
      let vol_adj: number = vol * Math.sqrt(T);
  
      let strikes = inv_deltas.map((e) => {
        return Math.exp(e * vol_adj) * spot;
      });
  
      let range_lower = strikes[4] - strikes[0];
      let range_upper = strikes[8] - strikes[4];
  
      let incr_lower = range_lower / 4;
      let incr_upper = range_upper / 4;
  
      str = Math.round(incr_lower).toString();
      let int_len_low = str.length;
  
      str = Math.round(incr_upper).toString();
      let int_len_upp = str.length;
  
      let base_low = 10 ** (int_len_low - 1) * base_int;
      let base_upp = 10 ** (int_len_upp - 1) * base_int;
  
      base_low = Math.max(base_low, base_low * Math.round(incr_lower / base_low));
      base_upp = Math.max(base_upp, base_upp * Math.round(incr_upper / base_upp));
  
      base_low =
        10 ** (int_len_low - 1) *
        5 *
        Math.round(base_low / 10 ** (int_len_low - 1) / 5);
      if (base_low == 0) base_low = 10 ** (int_len_low - 1);
  
      base_upp =
        10 ** (int_len_upp - 1) *
        5 *
        Math.round(base_upp / 10 ** (int_len_upp - 1) / 5);
      if (base_upp == 0) base_upp = 10 ** (int_len_upp - 1);
  
      let atm = base_low * Math.round(spot / base_low);
  
      let strikes_out: number[] = [];
  
      strikes_out[0] = atm - 4 * base_low;
      strikes_out[1] = atm - 3 * base_low;
      strikes_out[2] = atm - 2 * base_low;
      strikes_out[3] = atm - 1 * base_low;
      strikes_out[4] = atm;
      strikes_out[5] = atm + 1 * Math.min(base_upp, atm);
      strikes_out[6] = atm + 2 * Math.min(base_upp, atm);
      strikes_out[7] = atm + 3 * Math.min(base_upp, atm);
      strikes_out[8] = atm + 4 * Math.min(base_upp, atm);
  
      resolve(strikes_out);
    });
  }
  
  export async function getNextStrike(
    s: number,
    vol: number,
    ts: number,
    mt: number,
    strikes: number[]
  ): Promise<number> {
    return new Promise(async (resolve, reject) => {
      let mid = strikes.length / 2;
  console.log("mid: "+mid);
      let idx = strikes.map((e) => {
        let ans: boolean = s > e ? true : false;
        return ans;
      });
  
      let ind: number = 0;
      for (let i of idx) {
        if (i) ind++;
      }
  console.log("ind: "+ ind);
      let strikes_to_add;
  
      if (ind > mid) {
        console.log("in 2");
        let strikesTrue: number[] = [];
  
        for (let i = 0; i < idx.length; i++) {
          if (idx[i]) strikesTrue.push(strikes[i]);
        }
  
        let tstrike = Math.max(...strikesTrue);
  
        let new_strikes = await getStrikes(tstrike, vol, ts, mt);
  
        let new_strikes_filter: number[] = new_strikes.filter(
          (e) => e > Math.max(...strikes)
        );
  
        strikes_to_add = Math.min(...new_strikes_filter);
      } else {
        console.log("in 1")
        let strikesFalse: number[] = [];
  
        for (let i = 0; i < idx.length; i++) {
          if (!idx[i]) strikesFalse.push(strikes[i]);
        }

        let tstrike = Math.min(...strikesFalse);
       console.log("tstrike: " + tstrike);
        let new_strikes = await getStrikes(tstrike, vol, ts, mt);
        console.log(new_strikes);  
        let new_strikes_filter: number[] = new_strikes.filter(
          (e) => e < Math.min(...strikes)
        );
  
        strikes_to_add = Math.max(...new_strikes_filter);
      }
  
      resolve(strikes_to_add);
    });
  }
  
  let vol = 0.53;
  let spot = 52000;
  let ts = Date.now();
  let mt = (Date.now() + 7 * 60 * 60 * 24);
  let s = 35718;
  
  (async () => {
    let strikes = [33000,36000,39000,44000,49000];//await getStrikes(87000, vol, ts, mt);
    console.log("strikes: " + strikes);
    let nextStrike = await getNextStrike(s, vol, ts, mt, strikes);
    console.log("nextStrike: " + nextStrike);
  })();
  