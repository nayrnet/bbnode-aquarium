I had to modify universal cape to allow for dallas 1-wire sensor on P8_11
use the following commands to build/install, copy last two lines to rc.local

dtc -O dtb -o cape-unimod-00A2.dtbo -b 0 -@ cape-unimod-00A2.dts
dtc -O dtb -o w1-00A1.dtbo -b 0 -@ w1-00A1.dts
mv *.dtbo /lib/firmware
echo cape-unimod:00A2 > /sys/devices/bone_capemgr.9/slots
echo w1:00A1 > /sys/devices/bone_capemgr.9/slots
