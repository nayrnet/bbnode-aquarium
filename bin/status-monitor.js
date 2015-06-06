#!/usr/bin/nodejs
// Status Monitor
// Monitors the Aquarium for Changes / Alerts
// Copyright 2015 by Ryan  Hunt <admin@nayr.net> 
// license CC-BY-NC

var w1bus = require('node-w1bus');			// npm install node-w1bus
var bus = w1bus.create();
var fs = require('fs');
var request = require('request'); 			// npm install request
var Gpio = require('onoff').Gpio,
	float = new Gpio(73, 'in', 'both'),
	pump = new Gpio(70, 'low', 'both'),
	fill = new Gpio(74, 'low', 'both'),
	drain = new Gpio(75, 'low', 'both');

var greenLed = '/sys/class/pwm/pwm5/';			// Path to Green LED
var redLed = '/sys/class/pwm/pwm4/';			// Path to Red LED
var fan = '/sys/class/pwm/pwm0/';			// Path to FAN
var lights = '/sys/class/pwm/pwm3/';			// Path to Lights
var probe = '28-000005e94350';				// ID of 1-Wire Temp Sensor
var baseuri = 'http://127.0.0.1:8081/json.htm?';       // Domoticz Base URL for % json update


var max_temp = 25;					// 77F
var min_temp = 20;					// 69.8F

// Globals
var blink;
var tempSet;
var status = 0;
var tempStatus = 0;
var fanStatus = 0;
var lightStatus = 0;
var AuxStatus = 0;
var floodStatus = 0;
var floatStatus = float.readSync();
var pumpStatus = pump.readSync();
var fillStatus = fill.readSync();
var drainStatus = drain.readSync();

function init() { 					// Initalize Watchers
	setIndicator(1)
	updateLights()
	updateFan()
	readTemp()
	updateFloat(floatStatus)
	updatePump(pumpStatus)
	updateFill(fillStatus)
	updateDrain(drainStatus)

	float.watch(function(err, value) {
		updateFloat(value);
	});
	pump.watch(function(err, value) {
		updatePump(value);
	});
	fill.watch(function(err, value) {
		updateFill(value);
	});
	drain.watch(function(err, value) {
		updateDrain(value);
	});


	setInterval(readTemp, 300000);			// Check temp every 5 mins
	setInterval(function() {			// Update Indicators
		if(floodStatus) { setIndicator(4) }					// Indicate Flood Activity
		else if(tempStatus > 1) { setIndicator(tempStatus) }			// Indicate Temp Status
		else if(!fanStatus && tempSet > min_temp) { setIndicator(1); console.log('fan') }		// Indicate FAN is off
		else if(pumpStatus) { setIndicator(1) ; console.log('pump')}					// Indicate Pump is off
		else if(fillStatus) { setIndicator(1); console.log('fill') }					// Indicate Fill Activity
		else if(drainStatus) { setIndicator(1); console.log('drain') }				// Indicate Fill Activity
		else { setIndicator(0) }						// All is normal
	}, 2500);
}

function setIndicator(level) {				// Sets Indicator LED's
	status = level;
	clearInterval(blink);
	fs.writeFileSync(greenLed + "run", 1);
	fs.writeFileSync(redLed + "run", 1);
	if (level == 0) {				// Solid Green
		console.log('indicator: solid green');
		fs.writeFileSync(greenLed + "duty_ns", 12500);
		fs.writeFileSync(redLed + "duty_ns", 0);
	        request(baseuri + 'type=command&param=udevice&idx=35&nvalue=1;svalue=idle');
	} else if (level == 1) {			// Flashing Yellow
                console.log('indicator: blinking yellow');
                fs.writeFileSync(greenLed + "duty_ns", 25000);
                fs.writeFileSync(redLed + "duty_ns", 8000);
                request(baseuri + 'type=command&param=udevice&idx=35&nvalue=2;svalue=caution');
                blink = setInterval(function(){
                        fs.writeFileSync(greenLed + 'run',readIndicator(greenLed) === 0 ? 1 : 0)
                        fs.writeFileSync(redLed + 'run',readIndicator(redLed) === 0 ? 1 : 0)
                }, 500);
	} else if (level == 2) {			// Flashing Orange
		console.log('indicator: blinking orange');
		fs.writeFileSync(greenLed + "duty_ns", 25000);
		fs.writeFileSync(redLed + "duty_ns", 25000);
	        request(baseuri + 'type=command&param=udevice&idx=35&nvalue=3;svalue=caution');
		blink = setInterval(function(){ 
			fs.writeFileSync(greenLed + 'run',readIndicator(greenLed) === 0 ? 1 : 0)
			fs.writeFileSync(redLed + 'run',readIndicator(redLed) === 0 ? 1 : 0)
		}, 500);
	} else if (level == 3) {			// Flashing RED
		console.log('indicator: blinking red');
		fs.writeFileSync(greenLed + "duty_ns", 0);
		fs.writeFileSync(redLed + "duty_ns", 25000);
	        request(baseuri + 'type=command&param=udevice&idx=35&nvalue=4;svalue=warning');
		blink = setInterval(function(){ 
			fs.writeFileSync(redLed + 'run',readIndicator(redLed) === 0 ? 1 : 0)
		}, 500);
	} else if (level == 4) {			// RED ALERT
		console.log('indicator: RED ALERT');
		fs.writeFileSync(greenLed + "duty_ns", 0);
		fs.writeFileSync(redLed + "duty_ns", 25000);
	        request(baseuri + 'type=command&param=udevice&idx=35&nvalue=4;svalue=ALERT!');
		fs.writeFileSync("/sys/class/pwm/pwm6/run", 0); // White Lamp Channel
		fs.writeFileSync("/sys/class/pwm/pwm0/run", 0); // Blue Lamp Channel
		fs.writeFileSync("/sys/class/pwm/pwm3/run", 1); // RED Lamp Channel
		fs.writeFileSync("/sys/class/pwm/pwm3/duty", 25000); // RED Lamp Channel
	}
}

function readIndicator(color) {
        var duty = parseInt(fs.readFileSync(color + 'duty_ns', 'utf8'),10);
	return duty;
}

function checkTemp(temp) {	// Checks Aquarium Temp
	tempSet = temp
	if (temp > max_temp) { tempStatus = 3; }
	else if (temp > (max_temp - .5)) { tempStatus = 2; }
	else if (temp < min_temp) { tempStatus = 3; }
	else if (temp < (min_temp + .5)) { tempStatus = 2; }
	else { tempStatus = 0; }
}

function readTemp() {	// Read Aquarium Temp
	bus.getValueFrom(probe, "temperature")
		.then(function(res){
		    checkTemp(res['result']['value']);
		});	
}

function updateLights() { // Update Light Switch in Domoticz
        var run = parseInt(fs.readFileSync(lights + 'run', 'utf8'),10);
        var duty = parseInt(fs.readFileSync(lights + 'duty_ns', 'utf8'),10);
	if (run == 0 || duty == 0) {
		if (lightStatus) {
		        request(baseuri + 'type=command&param=switchlight&idx=13&switchcmd=Off');
		}
		lightStatus = 0;
	} else {
		if (!lightStatus) {
		        request(baseuri + 'type=command&param=switchlight&idx=13&switchcmd=On');
		}
		lightStatus = 1;
	}
}

function updateFan() {	// Update FAN Switch in Domoticz
        var run = parseInt(fs.readFileSync(fan + 'run', 'utf8'),10);
        var duty = parseInt(fs.readFileSync(fan + 'duty_ns', 'utf8'),10);
	if (run == 0) {
		if (fanStatus) {
		        request(baseuri + 'type=command&param=switchlight&idx=28&switchcmd=Off');
		}
		fanStatus = 0;
	} else {
		if (!fanStatus) {
		        request(baseuri + 'type=command&param=switchlight&idx=28&switchcmd=On');
		}
		fanStatus = 1;
	}
}

function updateFloat(value) {	// Update Float Switch in Domoticz
		if(value) {
			fill.writeSync(0)
			drain.writeSync(0)
			pump.writeSync(0)
	        	request(baseuri + 'type=command&param=switchlight&idx=8&switchcmd=Off');
	        	request(baseuri + 'type=command&param=switchlight&idx=9&switchcmd=Off');
		}
	        request(baseuri + 'type=command&param=udevice&idx=14&nvalue=' + value);
		floatStatus = value
		console.log('float: '+value)
}

function updatePump(value) {	// Update Pump Switch in Domoticz
		if(value) {
		        request(baseuri + 'type=command&param=switchlight&idx=5&switchcmd=Off');
		} else {
		        request(baseuri + 'type=command&param=switchlight&idx=5&switchcmd=On');
		}
		pumpStatus = value
		console.log('pump: '+value)
}

function updateFill(value) {	// Update Fill Switch in Domoticz
		if(value) {
			drain.writeSync(0)
			pump.writeSync(1)
		}
	        request(baseuri + 'type=command&param=udevice&idx=7&nvalue=' + value);
		fillStatus = value
		console.log('fill: '+value)
}

function updateDrain(value) {	// Update Drain Switch in Domoticz
		if(value) {
			fill.writeSync(0)
			pump.writeSync(1)
		}
	        request(baseuri + 'type=command&param=udevice&idx=6&nvalue=' + value);
		drainStatus = value
		console.log('drain: '+value)
}

function setupGpio() {
	var duty_max = 25000;
	fs.writeFile(greenLed + "period_ns", duty_max, function(err) { if(err) { return console.log(err); } }); 
	fs.writeFile(redLed + "period_ns", duty_max, function(err) { if(err) { return console.log(err); } }); 
}

// TODO: Watch Water Alarm
// TODO: Watch Filter Pump
// TODO: Watch pH Levels

setupGpio();
init();
