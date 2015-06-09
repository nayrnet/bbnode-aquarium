Fully Automated Planted Aquarium
	by Ryan Hunt 'nayr'
	origins: http://www.plantedtank.net/forums/showthread.php?t=845170

HARDWARE:
	Beagle Bone Black
	Four PWM to 0-10V Driver Cape - WebLightingControl.com 
	2 Stainless Steel Float Valves
	1/2in 12v Gravity Valve
	1/2in 12v Pressure Valve
	Large Pressurized RO Water Line
	4x Peristaltic 12v Dosing Pumps
	2x Quad mosFet breakout boards
	2x Computer Fans (140mm & 70mm)
	55 Gallon Aquarium
	48in BuildMyLed MC Series Dutch Lamp
	Much much more..

SOFTWARE:
	Debian Stable	Operating System
	NodeJS		Scripting Language
	Domoticz Beta	Web Interface & Remote Node
	NTPd		Time Sync
	nginx		x509 Authentication

TODO:
	Dosing Pumps
	co2 System
	pH monitoring

BBB PIN MAPPING: 
	P8_11	Dallas 1-Wire Temp Sensor
	P8_13	Lamp CH#1 (Green)
	P9_14	Lamp CH#2 (Red)
	P9_21	Lamp CH#3 (Blue)
	P9_42	Reserved 0-10v output
	P8_45	Status LED (Green)
	P8_46	Status LED (Red)
	P8_40	Drain Valve
	P8_42	Fill Valve
	P8_44	co2 Valve
	P8_39	Pump Relay
	P8_41	Alt Relay
	P8_43	Float Switch 
	P8_37	pH TX
	P8_38	pH RX
	*** OUT OF DATE NEEDS UPDATING ***
