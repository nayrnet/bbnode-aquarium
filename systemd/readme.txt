systemd service files

install:
	cd /etc/systemd/system
	ln -s ~/bbnode-aquarium/systemd/fan-controller.service 
	ln -s ~/bbnode-aquarium/systemd/light-controller.service 
	ln -s ~/bbnode-aquarium/systemd/aquarium-controller.service 
	ln -s ~/bbnode-aquarium/systemd/domoticz.service 
	ln -s ~/bbnode-aquarium/systemd/rtc.service 
