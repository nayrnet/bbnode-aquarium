#!/usr/bin/nodejs
// Ramping Light Controller Daemon
//
// At SunRise 13h Sequence Starts
// Ramps up from 2%-100% (~7h) then down 100%-12% (~6h)
// Waits in  evening lighting until Shutoff by Domoticz Virtural Switch Schedule
// Updates Channel % in Domoticz
//
// Copyright 2015 by Ryan  Hunt <admin@nayr.net>, 
// license CC-BY-NC

// Configuration
var maxBright = 1;					// Scale for Maximum Brightness 1 = 100% / .5 = 50%
var baseuri = 'http://127.0.0.1:8081/json.htm?';	// Base URL for JSON Updates
var ch = [ 
	'all',						
	'/sys/class/pwm/pwm6/',				// Path to Channel 1 (White)
	'/sys/class/pwm/pwm3/',				// Path to Channel 2 (Red)
	'/sys/class/pwm/pwm1/' ];			// Path to Channel 3 (Blue)

// Loadup Required Node.js Modules
var request = require('request'); 			// npm install request
var SunCalc = require('suncalc');			// npm install suncalc
var moment = require('moment');				// npm install moment
var fs = require('fs');
var times;
var greenLevel;
var redLevel;
var blueLevel;
setupGpio();

// Main Timer
setInterval(function() {
	times = SunCalc.getTimes(new Date(), 39.672635, -104.859177);	// Calculate Sun Movment from Lon/Lat
	start = moment(times.sunrise).add(4,'hours')			// Start 4h After Sunrise
	time = moment(new Date()).diff(start,'seconds');		// Seconds until or after start.
	time = time * 1.5						// Speed up Time 1.5x for ~9h Ramp Period
	level = time - 25000
	level = 25000 - level
	if (isOn(2) < 1) {
		greenLevel = 0
		redLevel = 0
		blueLevel = 0
	} else if (time > 25000 && time < 47000) {			// After Noon
		greenLevel = level
		redLevel = level
		blueLevel = level
	} else if (time >= 47000) {					// Evening
		greenLevel = 0
		redLevel = 1500
		blueLevel = 3000
	} else if (time < 2500) {					// Morning Level 
		greenLevel = 1800
		redLevel = 2500
		blueLevel = 2500
	} else { 							// Pre-Noon
		greenLevel = time 
		redLevel = time 
		blueLevel = time 
	}
	greenLevel = Math.round(greenLevel * maxBright)
	redLevel = Math.round(redLevel * maxBright)
	blueLevel = Math.round(blueLevel * maxBright)
	console.log('Green: ' + greenLevel/250 + '% / Red: ' +redLevel/250+ '% / Blue: ' +blueLevel/250+'%')
	writeDuty(1,greenLevel)
	writeDuty(2,redLevel)
	writeDuty(3,blueLevel)
},20000);								// 20 Seconds
setInterval(updateDomo,60000);						// 60 Seconds

// Functions 

function setupGpio() {					// On first boot or run we might need this.
	var index;
	// Set PWM Period
	for (index = 1; index < ch.length; ++index) {
		fs.writeFile(ch[index] + "period_ns", "25000", function(err) { if(err) { return console.log(err); } }); 
	}
	// Enable Outputs
	//for (index = 1; index < ch.length; ++index) {
	//	fs.writeFile(ch[index] + "run", "1", function(err) { if(err) { return console.log(err); } }); 
	//}
}

function updateDomo() {
	var r1 = readDuty(1);
	var r2 = readDuty(2);
	var r3 = readDuty(3);
	request(baseuri + 'type=command&param=udevice&idx=24&svalue=' + (r1/250))
	request(baseuri + 'type=command&param=udevice&idx=25&svalue=' + (r2/250))
	request(baseuri + 'type=command&param=udevice&idx=26&svalue=' + (r3/250))
}

function isOn(channel) {
	var data = fs.readFileSync(ch[channel] + "run","utf8");
	return(data.replace(/\n$/, ''));
}

function readDuty(channel) {
	var data = fs.readFileSync(ch[channel] + "duty_ns","utf8");
	return(data.replace(/\n$/, ''));
}
function writeDuty(channel,duty) {
	fs.writeFileSync(ch[channel] + "duty_ns", duty)
}

