#!/bin/bash
# Setup external RTC and set time .
if [ ! -e "/dev/rtc1" ]; then
	echo ds1307 0x68 > /sys/class/i2c-adapter/i2c-1/new_device
fi
if [  -e "/dev/rtc1" ]; then
        echo Setting system time from external RTC
       	hwclock --rtc /dev/rtc1 -s
fi
