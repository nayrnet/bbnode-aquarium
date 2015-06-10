#!/bin/bash
echo 1 > /sys/class/gpio/gpio70/value		# Shut Off Pump
echo 1 > /sys/class/gpio/gpio75/value		# Open Drain
sleep 300					# Wait 5mins
echo 0 > /sys/class/gpio/gpio75/value		# Close Drain
echo 1 > /sys/class/gpio/gpio74/value		# Open Fill
