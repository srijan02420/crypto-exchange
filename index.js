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
        values[pairsInr[pairs.indexOf(pair)]] = json['last']*inrRate
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
      let percentages = {}
      for (var key in pairs) {
        percentages[key] = ((json['prices'][key] - pairs[key])/pairs[key])*100
      }
      callback(null, percentages)
    }).catch(function(err) {
        callback(err, null)
        return;
    });
}

app.listen(3000, () => {
  async.waterfall([
    getINRRate,
    getBitStampRates,
    getKoinexRates
  ],function (err, result) {
      console.log(result)
      const keysSorted = Object.keys(result).sort(function(a,b){return result[a]-result[b]})
      const maxKey = keysSorted[keysSorted.length - 1]
      const minKey = keysSorted[0]
      let mostdiff = result[maxKey] - result[minKey]
      console.log(`Buy "${minKey}" from koinex and convert to "${maxKey}" in Bitstamp\nAnd earn - "${mostdiff}%" profit`)
  });
})
