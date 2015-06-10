#!/usr/bin/nodejs
// Status Monitor
// Monitors the Aquarium for Changes / Alerts
// Copyright 2015 by Ryan  Hunt <admin@nayr.net> 
// license CC-BY-NC


// CONFIGURATION
var max_temp 		= 25					// 77F
var min_temp 		= 20					// 69.8F
var greenLed 		= '/sys/class/pwm/pwm5/'		// Path to Green LED
var redLed 		= '/sys/class/pwm/pwm4/'		// Path to Red LED
var fan 		= '/sys/class/pwm/pwm0/'		// Path to FAN
var lights 		= '/sys/class/pwm/pwm3/'		// Path to Lights
var probe 		= '28-000005e94350'			// ID of 1-Wire Temp Sensor
var baseuri 		= 'http://127.0.0.1:8081/json.htm?'	// Domoticz Base URL for % json update
var Gpio = require('onoff').Gpio,				// Initalize GPIO
	float 		= new Gpio(73, 'in', 'both'),
	pump 		= new Gpio(70, 'low', 'both'),
	fill 		= new Gpio(74, 'low', 'both'),
	drain 		= new Gpio(75, 'low', 'both');

// REQUIRED MODULES
var w1bus 		= require('node-w1bus')			// npm install node-w1bus
var fs 			= require('fs')
var request 		= require('request') 			// npm install request
var math 		= require('mathjs')			// npm install mathjs
//require('daemon')()						// npm install daemon

// GLOBALS
var bus 		= w1bus.create()
var floatStatus 	= float.readSync()
var pumpStatus 		= pump.readSync()
var fillStatus 		= fill.readSync()
var drainStatus 	= drain.readSync()
var blink, tempSet, pulse, status = 0, tempStatus = 0, fanStatus = 0, lightStatus = 0, AuxStatus = 0, floodStatus = 0

// INIT
fs.writeFileSync("/var/run/aquarium.pid", process.pid)
setupGpio()
setIndicator(1)
interrupts()
//updateLights()
//updateFan()
readTemp()

// TIMERS
setInterval(readTemp, 60000)			// Check temp
setInterval(updateLED, 2000)			// Update Indicators

// FUNCTIONS
function interrupts() { 			// Initalize interrupts
	updateFloat(floatStatus)
	updatePump(pumpStatus)
	updateFill(fillStatus)
	updateDrain(drainStatus)

	float.watch(function(err, value) {
		updateFloat(value)
	})
	pump.watch(function(err, value) {
		updatePump(value)
	})
	fill.watch(function(err, value) {
		updateFill(value)
	})
	drain.watch(function(err, value) {
		updateDrain(value)
	})
}

function updateLED() {
	if(floodStatus) { setIndicator(4) }							// Indicate Flood Activity
	else if(tempStatus > 1) { setIndicator(tempStatus) }					// Indicate Temp Status
	else if(!fanStatus && tempSet > min_temp) { setIndicator(1); console.log('fan') }	// Indicate FAN is off
	else if(pumpStatus) { setIndicator(1) ; console.log('pump')}				// Indicate Pump is off
	else if(fillStatus) { setIndicator(1); console.log('fill') }				// Indicate Fill Activity
	else if(drainStatus) { setIndicator(1); console.log('drain') }				// Indicate Fill Activity
	else { setIndicator(0) }								// All is normal
}

function setIndicator(level) {									// Sets Indicator LED's
	status = level
	if (level == 0) {									// Solid Green
		console.log('indicator: solid green')
		clearInterval(blink)
		writeDuty(greenLed, 12500)
		writeDuty(redLed, 0)
	        request(baseuri + 'type=command&param=udevice&idx=35&nvalue=1&svalue=idle')
	} else if (level == 1) {								// Pulsing Yellow
                console.log('indicator: blinking yellow')
                blink = setInterval(pulseY, 10)
                request(baseuri + 'type=command&param=udevice&idx=35&nvalue=2&svalue=caution')
	} else if (level == 2) {								// Pulsing Orange
		console.log('indicator: blinking orange')
                blink = setInterval(pulseO, 10)
	        request(baseuri + 'type=command&param=udevice&idx=35&nvalue=3&svalue=caution')
	} else if (level == 3) {								// Pulsing RED
		console.log('indicator: blinking red')
                blink = setInterval(pulseR, 10)
	        request(baseuri + 'type=command&param=udevice&idx=35&nvalue=4&svalue=warning')
	} else if (level == 4) {								// RED ALERT
		console.log('indicator: RED ALERT')
		writeDuty(greenLed, 0)
		writeDuty(redLed, 25000)
	        request(baseuri + 'type=command&param=udevice&idx=35&nvalue=4&svalue=ALERT!')
	}
}

function readIndicator(color) {
        var duty = parseInt(fs.readFileSync(color + 'duty_ns', 'utf8'),10)
	return duty
}

function checkTemp(temp) {	// Checks Aquarium Temp
	tempSet = temp
	if (temp > max_temp) { tempStatus = 3 }
	else if (temp > (max_temp - .5)) { tempStatus = 2 }
	else if (temp < min_temp) { tempStatus = 3 }
	else if (temp < (min_temp + .5)) { tempStatus = 2 }
	else { tempStatus = 0 }
}

function readTemp() {	// Read Aquarium Temp
	bus.getValueFrom(probe, "temperature")
		.then(function(res){
		    checkTemp(res['result']['value'])
		})	
}

function updateLights() { // Update Light Switch in Domoticz
        var run = parseInt(fs.readFileSync(lights + 'run', 'utf8'),10)
        var duty = parseInt(fs.readFileSync(lights + 'duty_ns', 'utf8'),10)
	if (run == 0 || duty == 0) {
		if (lightStatus) {
		        request(baseuri + 'type=command&param=switchlight&idx=13&switchcmd=Off')
		}
		lightStatus = 0
	} else {
		if (!lightStatus) {
		        request(baseuri + 'type=command&param=switchlight&idx=13&switchcmd=On')
		}
		lightStatus = 1
	}
}

function updateFan() {	// Update FAN Switch in Domoticz
        var run = parseInt(fs.readFileSync(fan + 'run', 'utf8'),10)
        var duty = parseInt(fs.readFileSync(fan + 'duty_ns', 'utf8'),10)
	if (run == 0) {
		if (fanStatus) {
		        request(baseuri + 'type=command&param=switchlight&idx=28&switchcmd=Off')
		}
		fanStatus = 0
	} else {
		if (!fanStatus) {
		        request(baseuri + 'type=command&param=switchlight&idx=28&switchcmd=On')
		}
		fanStatus = 1
	}
}

function updateFloat(value) {	// Update Float Switch in Domoticz
		if(value) {
			fill.writeSync(0)
			drain.writeSync(0)
			pump.writeSync(0)
	        	request(baseuri + 'type=command&param=switchlight&idx=8&switchcmd=Off')
	        	request(baseuri + 'type=command&param=switchlight&idx=9&switchcmd=Off')
		}
	        request(baseuri + 'type=command&param=udevice&idx=14&nvalue=' + value)
		floatStatus = value
		console.log('float: '+value)
}

function updatePump(value) {	// Update Pump Switch in Domoticz
		if(value) {
		        request(baseuri + 'type=command&param=switchlight&idx=5&switchcmd=Off')
		} else {
		        request(baseuri + 'type=command&param=switchlight&idx=5&switchcmd=On')
		}
		pumpStatus = value
		console.log('pump: '+value)
}

function updateFill(value) {	// Update Fill Switch in Domoticz
		if(value) {
			drain.writeSync(0)
			pump.writeSync(1)
		}
	        request(baseuri + 'type=command&param=udevice&idx=7&nvalue=' + value)
		fillStatus = value
		console.log('fill: '+value)
}

function updateDrain(value) {	// Update Drain Switch in Domoticz
		if(value) {
			fill.writeSync(0)
			pump.writeSync(1)
		}
	        request(baseuri + 'type=command&param=udevice&idx=6&nvalue=' + value)
		drainStatus = value
		console.log('drain: '+value)
}
function pulse() {

}
function writeDuty(c,duty) {
	fs.writeFileSync(c + "duty_ns", duty)
}
function sWave(waves,step,steps,min,max) {      // Calculate Position on S-Wave
        return math.round(((max-min)/waves) / math.pi * ( math.pi * step / (steps/waves) - math.cos( math.pi * step / (steps/waves)) * math.sin( math.pi * step / (steps/waves))) +min ,0)
}
function setupGpio() {
	var duty_max = 25000
	fs.writeFile(greenLed + "period_ns", duty_max, function(err) { if(err) { return console.log(err) } }) 
	fs.writeFile(redLed + "period_ns", duty_max, function(err) { if(err) { return console.log(err) } }) 
	fs.writeFile(greenLed + "run", 1, function(err) { if(err) { return console.log(err) } }) 
	fs.writeFile(redLed + "run", 1, function(err) { if(err) { return console.log(err) } }) 
}
// END
