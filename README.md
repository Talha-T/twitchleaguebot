# twitchleaguebot
A League Of Legends Bot For Twitch

## What is this?
A bot that can look for given player's elo, his mastery point of a champion, you can set flash timers and more..

## Can I see it working?
![Non-Owner Only Mode](/ss.PNG?raw=true)

## Great, can I download and use this directly?
Yes, but you need to install node.js first. After you install it; shift right click on file explorer and click 'Open Cmd Here', then type `npm install irelia` first, after it installs; type 'npm install tmi.js'.

Alright, now you installed it. 

## How do I run it?

Open cmd as told above in bot's directory, then type:

`node app.js` -> This will run app.js(bot) file in node.
It is running now on default channel, which is `TR_Actor`(If you wanna change it, set channel variable to your channel name)
If you want to run it on another channel:
`node app.js channelname`

## Options

`node app.js channelname english` -> Run bot in English instead of Turkish. You probably always need this!
>Channel name casing doesn't matter.

`node app.js channelname english silent` -> Do not show bot is running message.

`node app.js channelname english |silent| "Hide on bush" kr` -> Bot will response with summoner's elo and mastery points, regular use cannot use this to see his elo, given summoner only.


