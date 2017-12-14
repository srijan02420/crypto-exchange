const express = require('express')
const async = require('async');
const fetch = require('node-fetch');
const app = express()

const getINRRate = (callback) => {
  fetch('https://api.fixer.io/latest?symbols=USD,INR&base=USD')
    .then(function(res) {
        return res.json();
    }).then(function(json) {
        callback(null, json['rates']['INR'])
    }).catch(function(err) {
        callback(err, null)
        return;
    });
}

const getBitStampRates = (inrRate, finalCallback) => {
  const pairs = ["btcusd", "xrpusd", "ltcusd", "ethusd", "bchusd"]
  const pairsInr = ["BTC", "XRP", "LTC", "ETH", "BCH"]
  let values = {}
  async.each(pairs, function(pair, callback) {
    fetch(`https://www.bitstamp.net/api/v2/ticker/${pair}/`)
      .then(function(res) {
          return res.json();
      }).then(function(json) {
        values[pairsInr[pairs.indexOf(pair)]] = {
          "ask": json['ask']*inrRate,
          "bid": json['bid']*inrRate
        }
        callback()
      }).catch(function(err) {
          callback(err, null)
          return;
      });
  }, function(err) {
  	if (err) {
      console.log(err);
  		finalCallback(err, null)
  	} else {
      finalCallback(null, values);
  	}
  });
}

const getKoinexRates = (pairs, callback) => {
  fetch('https://koinex.in/api/ticker')
    .then(function(res) {
        return res.json();
    }).then(function(json) {
      let ourpairs = {}
      for (var key in pairs) {
        ourpairs[key] = {
          "bitstamp": pairs[key],
          "koinex": {
            "ask": json['stats'][key]["lowest_ask"],
            "bid": json['stats'][key]["highest_bid"]
          },
          "koinex/bitstamp": json['stats'][key]["highest_bid"]/pairs[key]['ask'],
          "bitstamp/koinex": pairs[key]['bid']/json['stats'][key]["lowest_ask"],
        }
      }
      callback(null, ourpairs)
    }).catch(function(err) {
        callback(err, null)
        return;
    });
}

const getMaxByKey = (object, key) => {
  let maxVal = 0
  let maxKey = null
  for (var a in object) {
    if(object[a][key] > maxVal){
      maxVal = object[a][key]
      maxKey = a
    }
  }
  return maxKey
}

app.listen(3000, () => {
  async.waterfall([
    getINRRate,
    getBitStampRates,
    getKoinexRates
  ],function (err, result) {
      console.log(result)
      const sellMax = getMaxByKey(result, 'koinex/bitstamp')
      const buyMin = getMaxByKey(result, 'bitstamp/koinex')
      const boughtFromkoinex = (100000/result[buyMin]['koinex']['ask'])
      const soldRsInBitstamp = (boughtFromkoinex)*result[buyMin]['bitstamp']['bid']
      const boughtFromBitstamp = (soldRsInBitstamp/result[sellMax]['bitstamp']['ask'])
      const soldRsInkoinex = boughtFromBitstamp*result[sellMax]['koinex']['bid']
      console.log(`Buying ${boughtFromkoinex} "${buyMin}" from koinex at Rs ${result[buyMin]['koinex']['ask']} spent 1,00,000 Rs`)
      console.log(`Selling ${boughtFromkoinex} "${buyMin}" in BitStamp at Rs ${result[buyMin]['bitstamp']['bid']} got ${soldRsInBitstamp} Rs`)
      console.log(`Buying ${boughtFromBitstamp} "${sellMax}" from BitStamp at Rs ${result[sellMax]['bitstamp']['ask']} spent ${soldRsInBitstamp} Rs`)
      console.log(`Selling ${boughtFromBitstamp} "${sellMax}" in koinex at Rs ${result[sellMax]['koinex']['bid']} == ${soldRsInkoinex} Rs`)
      const mostdiff = ((result[buyMin]['bitstamp/koinex']*result[sellMax]['koinex/bitstamp']) - 1)*100
      console.log(`Buy "${buyMin}" from koinex and convert to "${sellMax}" in Bitstamp\nAnd earn - "${mostdiff}%" profit`)
  });
})
