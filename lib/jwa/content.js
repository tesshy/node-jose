"use strict";
var crypto = require("crypto");
var BigNumber = require("bn.js");

var encrypter = {
	"CBC": createCbcEncrypter,
	"GCM": createGcmEncrypter
}

var decrypter = {
	"CBC": createCbcDecrypter,
	"GCM": createGcmDecrypter
}

function verifyBuffer(buf, param) {
	if(!Buffer.isBuffer(buf)) {
		throw new Error(param + " must be a buffer");
	}
}

function createCbcEncrypter(keySize, hmacSize) {
	return function encrypt(plaintext, aad, iv, key) {
		if("string" === typeof plaintext) {
			plaintext = new Buffer(plaintext);
		}
		verifyBuffer(plaintext, "plaintext");
		verifyBuffer(aad, "aad");
		verifyBuffer(iv, "iv");
		verifyBuffer(key, "key");

		if(key.length != keySize/4) {
			throw new Error("key must have " + (keySize*2)/8 + " octets");
		}

		var macKey = key.slice(0, keySize/8);
		var encKey = key.slice(keySize/8);
		//ciphertext
		var cipher = crypto.createCipheriv("AES-" + keySize + "-CBC", encKey, iv);
		var ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
		//al
		var alPlain = new BigNumber(aad.length, 10).muln(8);
		var al = new Buffer(alPlain.toArray("be", 8));
		//auth tag
		var hmac = crypto.createHmac("SHA" + hmacSize, macKey);
		hmac.update(aad);
		hmac.update(iv);
		hmac.update(ciphertext);
		hmac.update(al);
		var tag = hmac.digest().slice(0, keySize/8);
		return {
			cipher: ciphertext,
			tag: tag
		}
	}
}

function createCbcDecrypter(keySize, hmacSize) {
	return function decrypt() {}
}

function createGcmEncrypter(keySize) {
	return function encrypt(plaintext, aad, iv, key) {
		verifyBuffer(aad, "aad");
		verifyBuffer(iv, "iv");
		verifyBuffer(key, "key");
	}
}

function createGcmDecrypter(keySize) {
	return function decrypt() {}
}

module.exports = function(mode, keySize, hmacSize) {
	if(mode === "CBC" && hmacSize != (keySize*2)) {
		throw new TypeError("Invalid algorithm");
	}

	return {
		encrypt: encrypter[mode](keySize, hmacSize),
		decrypt: decrypter[mode](keySize, hmacSize)
	}
}