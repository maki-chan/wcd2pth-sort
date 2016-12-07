# wcd2pth-sort
This script finds FLAC releases uploaded to PTH that match releases you snatched from WCD and downloads them to re-seed (even if the folder name has changed, and optionally renames your folder to match).  
This script also finds FLAC releases you've snatched from WCD that don't yet exist on PTH, and compiles the metadata, torrent file, log file, and image into a list for easier uploading.  
It accomplishes this by using the original torrents you snatched from WCD and comparing them against the torrents on PTH, which means you need to have kept your torrent files.  

This script does NOT automate uploading in any way.  
This script also only cares about FLAC releases, and ignores all others.

Support for finding trumpable torrents coming ~~soon~~ maybe.

## Requirements

+ NodeJS
+ mktorrent
+ Your torrent files from WCD, with their original names (in the format of `Artist - Album - Year (Media - Format - Lossless).*?.torrent`). So unfortunately, only torrents snatched post-2012 will be checked.
+ Your music folders can not have been renamed since you snatched them from WCD.

I realize these are some pretty significant caveats, but this was still able to get the majority of my collection either reseeded or reuploaded to PTH. Hopefully it can do the same for yours.

## Installation

Clone this repo.
`npm install`

## Usage

First, *__MAKE A COPY OF YOUR WCD TORRENT FOLDER!__*  
*This script deletes torrents out of that folder to keep track of what has already been done, in case of interruption.*  
*__MAKE A COPY OF YOUR WCD TORRENT FOLDER!__*

Then open up config.json and fill it out.  
`"username":` string: PTH username.  

`"password":` string: PTH password.  

`"domain":` string: Do not change.  

`"tracker":` string: Do not change.  

`"passkey":` string: You personal announce passkey, from your user profile.  

`"torrentfolder":` string: The folder path with all your wcd torrents in it. You made a copy, right?  

`"musicfolder":` string: Your music folder path.  

`"replacePathFrom":` string: Original path to be replaced by replacePathTo in the final output. Can be left blank.  

`"replacePathTo":` string: Substring that gets replaced by replacePathFrom. Can be left blank. Useful if you're running this script from a machine different than the one you will be uploading from. e.g. turns /mnt/drive1 into D:\  

`"linuxToWin":` int: Are you running this script on linux, but doing your uploading on windows? 1, otherwise 0  

`"trump":` int: Not yet implemented. Leave as 0.  

`"upload":` int: Want the script to try and find things to upload, and generate an *incredibly robust* html file? 1, otherwise 0  

`"download":` int: Want the script to try and find things that already exist on PTH, and download them? 1, otherwise 0  

`"prompt":` int: 1 prompts the user anytime the script is unsure about anything. 0 errs on the side of the torrent file not existing on the site, and adds it to the upload list for you to look at. Setting this as 0 not recommended with download == 1, as you'll miss out on things you can re-seed!  

`"renameFolders":` int: If the script finds a torrent on PTH that has the exact same files, but the folder name has been changed, 1 changes the folder name to match the folder name of the torrent on PTH for easier reseeding. 0 disallows this script from modifying anything in your musicfolder.  

`"imgurapi":` string: Imgur api key. If set, the script uses this api key to convert the local file paths of all images to imgur urls in upload.html, for less manual labor. Note that imgur has an hourly limit of 50 uploads per IP. This will significantly slow down the script, but ~~is useful if you have download and prompt set to 0 and just want to let it run overnight.~~ Imgur also imposes a daily limit on uploads, which I hit pretty quickly. Leaving this blank is recommended, but I won't remove it.

After your config has been filled out, simply run `node wcd2pth-sort.js`.  
If prompt is 1, you will be prompted to answer questions. Entering 0 is always a safe default answer.  
If download is 1, torrents the script finds will be downloaded to wcd2pth-sort/out/download  
If upload is 1, torrents the script makes will be uploaded to wcd2pth-sort/out/upload and an html file will be generated at wcd2pth-sort/out/upload.html that will hopefully make your life easier. This gets appended as the script runs so you can upload while you run the script (just refresh the page to update).

*__IMPORTANT:__* The upload.html should not be interpreted as a list of things to blindly upload. Instead, it should be interpreted as a list of things to investigate. The script always errs on the side of the torrent not existing on the site (to account for different release editions among other things), so the default action is to make a new torrent and add it to upload.html. Your upload.html *will* have some dupes in it, it is up to you to determine what to upload and what to not upload.

## Contribute

W̶̸̘̜̥̼͚͈͔̤̠̔͐͛ͮ̉̽Ȇ̅ͦ̅̀͏̶̙̪̬͚͕͉̟̖͞ͅL͐̈̍̇ͧ̋͂̔͏̸̶̢͇̺̱̺͓̦̞̹̘̖͢Ć̷̢̆̍̌̎ͣ̆͂ͮ̃͛͌́ͭ͗̓̃̉͆͘͠҉͕̼̝̝̱͍̫̫̯̹̣̜̟̳̖̯͇̖O̶̶͍̖͔͖͇̼͖̖͕͑͆̏̋̋͛̃ͬͧ̋̽͛̌͊̄̈́ͩͧ̀̀͠ͅM̵̺͍̗̪͎̰̤̻̞͙̼̗͒ͨ̄́͌̒ͭ͡Eͤͫͦ̎̽͒ͩ̎͋͌҉̧̜̪̝̠̘͚̬ ͬ͒͛ͦͬ̈́͗̋̔̄ͦ̔͆ͨ͗ͨ̿ͬ̕҉͉̼̲͓̝ͅT̷̸̶̰̼͚̘̭̬̯̦͚͎̳̺̅̅̓̅̍͗͛̈ͧ͊̔̔̇͊͌͑̅ͧ͘̕ͅǑ̢̞͕̠͍̖̭̦̣̺̻̭̪͔̼̝̺͙͆̅̅̉ ̨̧̮̟͖͇͓͔̤͍͔̹̪̭̗ͪ̎ͯͫ̅̏ͮ̒ͩͯ̿̊̐́͡͠ͅͅH̵̶̛͓̙̬̮͇̞ͣ̏ͩ̑͐ͤ͊̇̀̚Ë̸̴̛̱̦̼̬̻͓̰̩̜̥́͌ͪͩͫ͆̓ͭ̎̔̎̿͡L̵̨̮͈̼̤͍̘̠̜̥̖͖̱͕̻͕̒̋̄͢͡͝ͅL̛͈͙̖̰̃ͧ̅̽͒ͣ́͞
