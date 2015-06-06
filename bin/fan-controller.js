#!/usr/bin/nodejs
// Fan Controller
// Keeps my Planted Aquarium cool w/Evaoprative Cooling 
// My tank's Ideal Range: 22-23C (71.6-73.4F)
// Uses 1-Wire Temp Probes & PWM 12v Cooling Fans
// Logs Fan Speed to Domoticz
// License: CC-BY-CC 
// Author: Ryan  Hunt <admin.at.nayr.net>

var request = require('request'); 			// npm install request
var w1bus = require('node-w1bus');			// npm install node-w1bus
var fs = require('fs');
var bus = w1bus.create();

var fan = '/sys/class/pwm/pwm0/';			// Path to FAN
var water = '28-000005e94350';				// ID of 1-Wire Water Sensor
var ambient = '28-000005ea4545';			// ID of 1-Wire Ambient Sensor
var baseuri = 'http://127.0.0.1:8081/json.htm?type=command&param=udevice&idx=34&svalue=';	// Domoticz Base URL for % json update

var duty_max = 25000;					// 25 kHz
var min_duty = 6250;					// Minimum Speed (25%)
var duty = 0;
var max_temp = 24;					// 75.2F
var min_temp = 22;					// 71.6F
var water_temp;
var ambient_temp;

function updateDuty() {
	if (water_temp > max_temp || ambient_temp > (max_temp +4) ) { duty = duty_max; }
	else if (water_temp < min_temp) { duty = 0; }
	else {
		duty = Math.round(((duty_max - min_duty) * (water_temp - min_temp) / (max_temp - min_temp)) + min_duty);

	}
	//console.log(duty);
	fs.writeFileSync(fan + "duty_ns", duty);
}

function readTemp() {
	bus.getValueFrom(water, "temperature")
		.then(function(res){
		    water_temp = res['result']['value']
		});	
	bus.getValueFrom(ambient, "temperature")
		.then(function(res){
		    ambient_temp = res['result']['value']
		});	
}

function setupGpio() {
	fs.writeFile(fan + "period_ns", duty_max, function(err) { if(err) { return console.log(err); } }); 
	fs.writeFile(fan + "run", "1", function(err) { if(err) { return console.log(err); } }); 
}

function updateDomo() {
	request(baseuri + (duty/250));
	console.log('Water: ' + water_temp + 'C / Fan: ' + duty/250 + '%');
}

setupGpio();
readTemp();
setInterval(readTemp, 20000);			// Update every 20s
setInterval(updateDuty, 30000);			// Update every 30s
setInterval(updateDomo, 60000);			// Update every 60s
