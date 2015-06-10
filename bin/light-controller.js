#!/usr/bin/nodejs
// Planted Aquarium Light Controller Daemon
//
// SUMMARY:
//	Lighs adjust dynamically throughout the day to simulate outdoor lighting.
//	Photoperiod ends at sunset, then lights enter dynamic evening programming 
//	until it shuts off at a pre-determined time.
//
// AUTHOR: Ryan Hunt <admin@nayr.net>
// LICENSE: CC-BY-NC

// CONFIGURATION
var rampUpTime 		= 30720				// Ramp up in seconds
var rampDownTime 	= 10800				// Ramp down in seconds
var noonTime 		= 60				// Time at Max Duty in Seconds
var dutyCycle 		= 25000				// Max Duty 
var offHour 		= 22				// What time to end evening lights
var offMin 		= 45
var ch 			= [ '/dev/null',						
			'/sys/class/pwm/pwm6/',		// Path to Channel 1 (White)
			'/sys/class/pwm/pwm3/',		// Path to Channel 2 (Red)
			'/sys/class/pwm/pwm1/' ]	// Path to Channel 3 (Blue)
var baseuri 	= 'http://127.0.0.1:8081/json.htm?'	// Base URL for JSON Updates

// REQUIRED MODULES 
require('daemon')();					// npm install daemon
var request 		= require('request')		// npm install request
var SunCalc 		= require('suncalc')		// npm install suncalc
var moment 		= require('moment')		// npm install moment
var math 		= require('mathjs')		// npm install mathjs
var fs 			= require('fs')

// GLOBALS
var overRide = 0

// INIT
fs.writeFileSync("/var/run/light-controller.pid", process.pid)
setupGpio()
lightCalc()
updateDomo()

// TIMERS
setInterval(lightCalc,20000)				// 20 Seconds
setInterval(updateDomo,60000)				// 60 Seconds

// FUNCTIONS
function lightCalc() {
	times = SunCalc.getTimes(new Date(), 39.672635, -104.859177)			// Calculate Sun Movment from Long/Lat
	t = moment(times.sunset).subtract(rampUpTime+rampDownTime+noonTime,'seconds')	// Calculate time to begin
	start = moment(new Date()).diff(t,'seconds')					// Seconds since start
	end = moment(times.sunset).diff(new Date(),'seconds')				// Seconds until sunset
	level = [ 0, 0, 0, 0 ]
	if (start > 0 && start <= rampUpTime) {					// Ramp Up
		var l = sWave(2, start, rampUpTime, 0, dutyCycle)
		level = [ l, l, l, l ]
		if(!isOn(2)) { powerToggle(1) }
	} else if (end > 0 && end <= rampDownTime) {				// Ramp Down
		var l = sWave(1, end, rampDownTime, 3000, dutyCycle)
		level = [ l, l, l, l ]
	} else if (end <= 0) {							// Evening
		m = new Date(), m.setHours(offHour), m.setMinutes(offMin), m.setSeconds(0), m.setMilliseconds(0)
		off = moment(m).diff(new Date(),'seconds')			// Seconds until off
		duration = moment(m).diff(times.sunset,'seconds')		// Length of Evening
		if(off<1) { 
			powerToggle(0) 
		} else {
			level[1] = sWave(1, off, duration, 0, 1000)
			level[2] = sWave(2, off, duration, 0, 2500)
			level[3] = sWave(1, off, duration, 600, 3000)
		}
	} else if (start>rampUpTime && end>rampDownTime) {			// Noon
		level = [ dutyCycle, dutyCycle, dutyCycle, dutyCycle ]
	}
	if(!overRide) {
		console.log('Start: ' + start + ' End: ' + end + ' Green: ' + level[1]/250 + '% / Red: ' +level[2]/250+ '% / Blue: ' +level[3]/250+'%')
        	for (var i=1;i<ch.length;++i) { writeDuty(i,level[i]) }
	}
}
function sWave(waves,step,steps,min,max) { 					// Calculate Position on S-Wave
        return math.round(((max-min)/waves) / math.pi * ( math.pi * step / (steps/waves) - math.cos( math.pi * step / (steps/waves)) * math.sin( math.pi * step / (steps/waves))) +min ,0)
}
function powerToggle(state) {							// Power ON/OFF Light
	for (var i=1; i<ch.length;++i) {
		fs.writeFileSync(ch[i] + 'run', state)
	}
}
function setupGpio() {								// On first run we might need this.
	for (var i=1;i< ch.length;++i) {
		fs.writeFile(ch[i] + "period_ns", dutyCycle, function(err) { if(err) { return console.log(err); } })
	}
}
function updateDomo() {								// Update Devices in Domoticz
	request(baseuri + 'type=command&param=udevice&idx=24&svalue=' + (readDuty(1)/250))
	request(baseuri + 'type=command&param=udevice&idx=25&svalue=' + (readDuty(2)/250))
	request(baseuri + 'type=command&param=udevice&idx=26&svalue=' + (readDuty(3)/250))
}
function isOn(channel) {							// Return Channel Power
	var data = fs.readFileSync(ch[channel] + "run","utf8")
	return(parseInt(data.replace(/\n$/, '')))
}
function readDuty(channel) {							// Return Channel Duty
	var data = fs.readFileSync(ch[channel] + "duty_ns","utf8")
	return(parseInt(data.replace(/\n$/, '')))
}
function writeDuty(channel,duty) {
	if(duty<600) { duty = 0 }						// Minimum without flickering
	fs.writeFileSync(ch[channel] + "duty_ns", duty)
}
// END
