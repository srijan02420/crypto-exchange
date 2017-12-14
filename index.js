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
      let ourpairs = {}
      for (var key in pairs) {
        ourpairs[key] = {
          "bitstamp": pairs[key],
          "koinex": json['prices'][key],
          "koinex-bitstamp": ((json['prices'][key] - pairs[key])/json['prices'][key])*100,
          "bitstamp-koinex": ((json['prices'][key] - pairs[key])/pairs[key])*100,
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

const getMinByKey = (object, key) => {
  let minVal = Infinity
  let minKey = null
  for (var a in object) {
    if(object[a][key] < minVal){
      minVal = object[a][key]
      minKey = a
    }
  }
  return minKey
}

app.listen(3000, () => {
  async.waterfall([
    getINRRate,
    getBitStampRates,
    getKoinexRates
  ],function (err, result) {
      console.log(result)
      const buyMin = getMinByKey(result, 'koinex-bitstamp')
      const sellMax = getMaxByKey(result, 'bitstamp-koinex')
      let mostdiff = result[sellMax]['bitstamp-koinex'] - result[buyMin]['koinex-bitstamp']
      console.log(`Buy "${buyMin}" from koinex and convert to "${sellMax}" in Bitstamp\nAnd earn - "${mostdiff}%" profit`)
  });
})
