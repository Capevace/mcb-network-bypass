const isOnline = require('is-online');
const puppeteer = require('puppeteer');
const exec = require('child_process').exec;
const randomMac = require('random-mac');
const interval = require('interval-promise');

let busy = false;

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
	exec(`sudo ifconfig en1 ether ${mac}`);
}

async function restartWifi() {
	exec('sudo ifconfig en1 down');

	await delay(200);

	exec('sudo ifconfig en1 up');
}

async function reAuthenticate() {
	console.log('Reauthenticating...');
	console.log('Opening browser...');

	const browser = await puppeteer.launch({headless: true});

	const page = await browser.newPage();
	
	let wifiReady = false;
	await interval(async (n, stop) => {
		try {
			await page.goto('http://captive.apple.com');
			
			console.log('WiFi ready!');
			wifiReady = true;
			stop();
		} catch (e) {
			console.log('WiFi down. Retrying...');
		}
	}, 200 /*, {iterations: 40} */);

	// console.log('Opening login...');
	// await Promise.all([
	//  	page.waitForNavigation(),
	// 	page.click('#button'),
	// ]);

	console.log('Logging in...');
	await page.type('form[name=form2] input', 'kingst2015');
	
	await Promise.all([
	 	page.waitForNavigation(),
		page.click('#button'),
	]);

	console.log('Closing in 10 seconds...');
	await delay(10000);
	await browser.close();
}

async function checkOnlineStatus() {
	if (busy) return;

	busy = true;

	console.log('Checking online status...');
	const online = await isOnline();

	if (online) {
		console.log('Is still online. Skipping...');
	} else {
		console.log('Offline. Starting bypass...');
		await renewMacAddress();
		await restartWifi();
		await reAuthenticate();
	}

	console.log('Finished. Waiting...');
	busy = false;
}

setInterval(checkOnlineStatus, 1000 * 30);
checkOnlineStatus();