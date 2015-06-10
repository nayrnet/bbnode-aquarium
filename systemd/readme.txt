systemd service files

install:
	cd /etc/systemd/system
	ln -s ~/bbnode-aquarium/systemd/fan.service 
	ln -s ~/bbnode-aquarium/systemd/light.service 
	ln -s ~/bbnode-aquarium/systemd/aquarium.service 
	ln -s ~/bbnode-aquarium/systemd/domoticz.service 
	ln -s ~/bbnode-aquarium/systemd/rtc.service 
