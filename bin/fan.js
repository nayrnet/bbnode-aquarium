#!/usr/bin/nodejs
// Planted Aquarium FAN Controller Daemon
//
// SUMMARY:
//	Keeps my Planted Aquarium cool w/Evaoprative Cooling 
//	My tank's Ideal Range: 22-23C (71.6-73.4F)
//	Uses 1-Wire Temp Probes & PWM 12v Cooling Fans
//	Logs Fan Speed to Domoticz
//
// AUTHOR: Ryan Hunt <admin@nayr.net>
// LICENSE: CC-BY-NC

// CONFIGURATION
var fan 	= '/sys/class/pwm/pwm0/'		// Path to FAN
var water 	= '28-000005e94350'			// ID of 1-Wire Water Sensor
var ambient 	= '28-000005ea4545'			// ID of 1-Wire Ambient Sensor
var max_duty 	= 25000					// 25 kHz
var min_duty 	= 6250					// Minimum Speed (25%)
var max_temp 	= 24					// 75.2F
var min_temp 	= 22					// 71.6F
var baseuri 	= 'http://127.0.0.1:8081/json.htm?type=command&param=udevice&idx=34&svalue=';	// Domoticz Base URL for % json update

// REQUIRED MODULES
var request	= require('request') 			// npm install request
var w1bus 	= require('node-w1bus')			// npm install node-w1bus
var math 	= require('mathjs')			// npm install mathjs
var fs 		= require('fs')
require('daemon')()					// npm install daemon

// GLOBALS
var water_temp, ambient_temp, duty = 0
var bus = w1bus.create()

// INIT
fs.writeFileSync("/var/run/fan.pid", process.pid)
setupGpio()
readTemp()

// TIMERS
setInterval(readTemp, 10000)			// Update every 10s
setInterval(updateDuty, 10000)			// Update every 10s
setInterval(updateDomo, 60000)			// Update every 60s

// FUNCTIONS
function updateDuty() {
	if (water_temp > max_temp || ambient_temp > (max_temp +4) ) { duty = max_duty }
	else if (water_temp < min_temp) { duty = 0 }
	else {
		steps = math.subtract(max_temp,min_temp)
		step = math.subtract(water_temp,max_temp) + steps
		duty = sWave(1,step,steps,min_duty,max_duty)
		duty = sWave(1,math.round(step*100),math.round(steps*100),min_duty,max_duty)
	}
	fs.writeFileSync(fan + "duty_ns", duty)
}
function readTemp() {
	bus.getValueFrom(water, "temperature")
		.then(function(res){
		    water_temp = res['result']['value']
		})	
	bus.getValueFrom(ambient, "temperature")
		.then(function(res){
		    ambient_temp = res['result']['value']
		})	
}
function sWave(waves,step,steps,min,max) {	// Calculate Position on S-Wave
        return math.round(((max-min)/waves) / math.pi * ( math.pi * step / (steps/waves) - math.cos( math.pi * step / (steps/waves)) * math.sin( math.pi * step / (steps/waves))) +min ,0)
}
function setupGpio() {
	fs.writeFile(fan + "period_ns", max_duty, function(err) { if(err) { return console.log(err) } }) 
	fs.writeFile(fan + "run", "1", function(err) { if(err) { return console.log(err) } })
}
function updateDomo() {
	request(baseuri + (duty/250))
	console.log('Water: ' + water_temp + 'C / Fan: ' + duty/250 + '%')
}

