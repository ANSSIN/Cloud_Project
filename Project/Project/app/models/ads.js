// app/models/ads.js

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var AdsSchema   = new Schema({},{ strict:false });

module.exports = Ads = mongoose.model('ads', AdsSchema);