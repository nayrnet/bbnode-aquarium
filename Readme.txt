here are the files I used for my automated planted aquarium.

devicetree - contains files to make avilable various GPIO on the BeagleBoneBlack
systemd - contains systemd scripts to start services
bin/light-controller.js - service to ramp up/down lights
bin/fan-controller.js - service to set fan speed based on aquarium temps
bin/status-monitor.js - service to set indicator LED and domoticz

pin mapping:
P8_11 - Dallas 1-Wire Temp Sensor
P8_13 - Lamp CH#1 (Green)
P9_14 - Lamp CH#2 (Red)
P9_21 - Lamp CH#3 (Blue)
P9_42 - Reserved 0-10v output
P8_45 - Status LED (Green)
P8_46 - Status LED (Red)
P8_40 - Drain Valve
P8_42 - Fill Valve
P8_44 - co2 Valve
P8_39 - Pump Relay
P8_41 - Alt Relay
P8_43 - Float Switch 
P8_37 - pH TX
P8_38 - pH RX
