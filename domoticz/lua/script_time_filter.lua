-- script_time_filter.lua
t1 = os.time()
s = otherdevices_lastupdate['Canister Filter']
-- returns a date time like 2013-07-11 17:23:12
 
year = string.sub(s, 1, 4)
month = string.sub(s, 6, 7)
day = string.sub(s, 9, 10)
hour = string.sub(s, 12, 13)
minutes = string.sub(s, 15, 16)
seconds = string.sub(s, 18, 19)
 
commandArray = {}
 
t2 = os.time{year=year, month=month, day=day, hour=hour, min=minutes, sec=seconds}
difference = (os.difftime (t1, t2))

if (otherdevices['Canister Filter'] == 'Off' and difference > 3599 and difference < 3660) then
	commandArray['SendNotification']='Notice#Canister Filter was disabled for more than an hour, automatically turning back on.'
	commandArray['Canister Filter']='On'
end 
 
return commandArray


