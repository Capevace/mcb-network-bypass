#!/usr/bin/env node

console.log('\nWelcome to MCB WiFi Bypass!\n');

const networkInterface = process.argv[2] || 'en1';
console.log(`Using network interface ${networkInterface}.`);

const isOnline = require('is-online');
const puppeteer = require('puppeteer');
const exec = require('child_process').exec;
const randomMac = require('random-mac');
const interval = require('interval-promise');
const notifier = require('node-notifier');

const notifyMessage = message =>
	notifier.notify({ title: 'MCB WiFi Bypass', message });

function delay(t, val) {
	return new Promise(function(resolve) {
		setTimeout(function() {
			resolve(val);
		}, t);
	});
}

async function renewMacAddress() {
	const mac = randomMac();

	console.log(`Setting new MAC address: ${mac}`);
	exec(`sudo ifconfig ${networkInterface} ether ${mac}`);
}

async function restartWifi() {
	exec(`sudo ifconfig ${networkInterface} down`);

	await delay(200);

	exec(`sudo ifconfig ${networkInterface} up`);
}

async function reAuthenticate() {
	console.log('Reauthenticating...');
	console.log('Opening browser...');

	const browser = await puppeteer.launch({ headless: true });
	const page = await browser.newPage();

	await interval(async (n, stop) => {
		try {
			await page.goto('http://captive.apple.com');

			console.log('WiFi ready!');
			stop();
		} catch (e) {
			console.log('WiFi down. Retrying...');
		}
	}, 200);

	// console.log('Opening login...');
	// await Promise.all([
	//  	page.waitForNavigation(),
	// 	page.click('#button'),
	// ]);

	console.log('Logging in...');
	await page.type('form[name=form2] input', 'kingst2015');

	await Promise.all([page.waitForNavigation(), page.click('#button')]);

	notifyMessage('Connection will be restored within 10 seconds.');
	console.log('Closing in 10 seconds...');
	await delay(10000);
	await browser.close();
}

async function checkOnlineStatus(n, stop) {
	console.log('Checking online status...');
	const online = await isOnline();

	if (online) {
		console.log('Is still online. Skipping...');
	} else {
		console.log('Offline. Starting bypass...');
		notifyMessage('Data limit reached. Restoring connection...');
		await renewMacAddress();
		await restartWifi();
		await reAuthenticate();
	}

	console.log('Finished. Waiting...');
}

interval(checkOnlineStatus, 1000 * 30);
checkOnlineStatus();
