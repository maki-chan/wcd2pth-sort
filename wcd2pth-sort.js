const fs = require('fs');
const path = require('path');
const prompt = require('readline-sync');
const Gazelle = require('gazelle-api');
const parseTorrent = require('parse-torrent');
const cp = require('child_process');
const mv = require('mv');
const imgur = require('imgur-node-api');
const rimraf = require('rimraf');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();
const config = require('./config.json');
const pth = new Gazelle(config.username, config.password, config.domain);
const folder = config.torrentfolder;
const datadir = config.musicfolder;
const re = /(.*?) - (.*?) - (.*?) \((.*?) - (.*?) - (.*?)\).*?.torrent/;
var si = 0
if (config.imgurapi != "") {
  imgur.setClientID(config.imgurapi);
}

makeDir();
if (!fs.existsSync(path.join(__dirname, 'out/upload.html'))) {
  writeHead();
}
var a = matchTorrents(fs.readdirSync(folder));
start();

function start() {
  if (si < a.length) {
    searchForReleases(a[si], function() {
      si++
      start();
      console.log("Moving on...")
    });
  }
}

function makeDir() {
  var paths = [
    './out',
    './out/upload',
    './out/download',
    './out/upload/trump'
  ]
  for (i = 0; i < paths.length; i++) {
    try {
      fs.mkdirSync(paths[i]);
    } catch (err) {
      //console.log(err);
    }
  }
}

function matchTorrents (arr) {
  var a = [];
  for (var i = 0, l = arr.length; i < l; i++) {
    var c = arr[i].match(re);
    try {
      if (c[5] == 'FLAC') {
        var r = new Release(c, arr[i]);
        var st = r.artist + ' - ' + r.album + ' - ' + r.year + ' (' + r.media + ' - ' + r.format + ' - ' + r.quality + ').torrent';
        if (fs.existsSync(path.join(datadir, r.torrentdata.name))) {
          if (!fs.existsSync(path.join(__dirname, 'out/download/', st))) {
            a.push(r);
          }
        }
      }
    } catch (err) {
      //console.log(arr[i]+' is an invalid torrent file');
    }
  }
  return a;
}

function searchForReleases(t, cb) {
  try {
    pth.action('browse', {
      searchstr: t.artist + ' ' + t.album
    }).then(response => {
      var r = response.body.response.results;
      if (r.length == 0) {
        console.log('No torrent groups found for \'' + t.artist + ' ' + t.album + '\', making torrent.');
        makeTorrent(t, 0, (tor) => {
          toUpload(t, null, tor, () => cb())
        });
      } else {
        promptTorrentGroups(r, t, () => cb());
      }
    });
  } catch (err) {
    console.log("Error on api call. Skipping.")
    setTimeout(cb(), 3000);
  }
}

function makeTorrent(release, trump, cb) {
  if (config.upload == 0) {
    console.log("Upload mode is off. Skipping...")
    cb(null);
  } else {
    var outPath = (trump == 0) ? 'out/upload' : './out/upload/trump';
    var outFile = path.join(outPath, release.torrentfile);
    var inPath = path.join(datadir, release.torrentdata.name);
    var arg = ['-p', '-s', 'PTH', '-a', config.tracker + config.passkey + '/announce', '-o', entities.decode(outFile), inPath];
    try {
      cp.execFile('mktorrent', arg, () => {
        console.log('Created file ' + outFile);
        rimraf(path.join(folder, release.torrentfile), (err) => {
          console.log('Deleted file ' + path.join(folder, release.torrentfile));
          cb(path.join(__dirname, outFile));
        });
      });
    } catch (err) {
      console.log(err);
      console.log("Failed to execute mktorrent");
      console.log("Is mktorrent on the path?");
      cb(null);
    }
  }
}

function toUpload(release, gid, tor, cb) {
  var log = '';
  var img = '';
  var tracks = '';
  if (config.upload == 0) {
    cb();
  }
  else {
    findLog(release, (l) => {
      log = l;
      findCover(release, (c) => {
        if (c == null || c == 'null' || c == undefined) {
          img == 'null';
          findTracks(release, (t) => {
            tracks = t;
            writeRow(release.artist, release.album, release.media, gid, tor, log, img, tracks, release.year, () => cb());
          });
        } else {
          imgurUpload(c, (i) => {
            img = i;
            console.log(i);
            findTracks(release, (t) => {
              tracks = t;
              writeRow(release.artist, release.album, release.media, gid, tor, log, img, tracks, release.year, () => cb());
            });
          });
        }
      });
    });
  }
}

function imgurUpload(image, cb) {
  if (config.imgurapi == "") {
    cb(image);
  } else {
    imgur.upload(image, (err, res) => {
      if (res.data == undefined || res.data.link == undefined) {
        console.log("Imgur rate limiting reached, trying again in 10 minutes.");
        console.log(res.data)
        setTimeout(() => {imgurUpload(image, (i) => cb(i));}, 600000);
      } else {
        cb(res.data.link);
      }
    });
  }
}

function promptTorrentGroups(results, release, cb) {
  console.log('Your torrent file: ' + release.torrentfile);
  var msg = [];
  var selected;
  if (results.length > 1) {
    for (var i = 0, l = results.length; i < l; i++) {
      msg.push('['+ (i+1) + '] (' + results[i].groupYear + ' ' + results[i].releaseType + ') ' + results[i].artist + ' - ' + results[i].groupName)
    }
    msg.push('Enter the number that matches your torrent group, or 0 for none of them:');
    selected = promptSelection(results, msg);
  } else {
    console.log('Only one torrent group: (' + results[0].groupYear + ' ' + results[0].releaseType + ') ' + results[0].artist + ' - ' + results[0].groupName);
    selected = 0;
  }
  if (selected == -1) {
    console.log("No torrent group exists for this torrent, making a new torrent.")
    makeTorrent(release, 0, (tor) => {
      toUpload(release, null, tor, () => cb())
    });
  } else {
    var flacTorrents = filterFLAC(results[selected].torrents);
    if (flacTorrents.length == 0) {
      console.log("No FLAC releases for this torrent group found, making torrent.");
      makeTorrent(release, 0, (tor) => {
        toUpload(release, results[selected].groupId, tor, () => cb())
      });
    } else {
      getTorrentsFromID(flacTorrents, results[selected].groupId, release, 0, () => cb());
    }
  }
}

function getTorrentsFromID(flacTorrents, gid, release, index, cb) {
  if (index < flacTorrents.length) {
    searchForTorrentMatches(flacTorrents[index], release, function(c){
      if (c == 0) {
        index++;
        getTorrentsFromID(flacTorrents, gid, release, index, () => cb());
      } else {
        cb();
      }
    });
  } else {
    console.log("No matches found in this torrent group. Making a new torrent.");
    makeTorrent(release, 0, (tor) => {
      toUpload(release, gid, tor, () => cb())
    });
  }
}

function searchForTorrentMatches(group, release, cb) {
  try {
    pth.action('torrent', {
      id: group.torrentId
    }).then(response => {
      try {
      var r = response.body.response.torrent;
      if(r.fileCount == release.torrentdata.files.length && entities.decode(r.filePath) == entities.decode(release.torrentdata.name) && r.media == release.media) {
        findExactMatches(release.torrentdata.files, r.fileList, release.torrentdata.name, r.filePath, (c) => {
          if (c == 1) {
            console.log("This torrent exists already at torrent ID: " + r.id + ". Downloading to ./out/download")
            try {
              pth.download(r.id, './out/download').then(rimraf(path.join(folder, release.torrentfile), (err) => {
                console.log('Deleted file ' + path.join(folder, release.torrentfile));
                cb(1);
              }));
            } catch (err) {
              console.log(err)
              setTimeout(cb(1), 3000);
            }
          } else if (c == 0) {
            if (r.logScore < parseInt(100, 10) && r.media == "CD") {
              if (config.trump == 0) {
                console.log("Trumpable release found with " + r.logScore + "% log, but trump mode not enabled.");
                cb(1);
              } else {
                var msg = [];
                msg.push("This torrent exists at torrent ID " + r.id + ", but with a " + r.logScore + "% log. Trump?");
                msg.push("[1] Yes");
                msg.push("[2] No");
                var selected = promptSelection([0, 1], msg);
                if (selected == 0) {
                  console.log("Making torrent to trump torrent ID " + r.id +"...")
                  makeTorrent(release, 1, () => cb(1))
                } else {
                  console.log("Not trumping.")
                  cb(1);
                }
              }
            } else {cb(0);}
          } else if (c == -1) {
            rimraf(path.join(folder, release.torrentfile), (err) => {
              console.log('Deleted file ' + path.join(folder, release.torrentfile));
              cb(1);
            });
          }
        });
      } else if (r.fileCount == release.torrentdata.files.length && r.media == release.media) {
        console.log("Possible match found, folder names do not match though. Investigating...")
        findExactMatches(release.torrentdata.files, r.fileList, release.torrentdata.name, r.filePath, (c) => {
          if (c == 0) {
            cb(1)
          } else {
            try {
              pth.download(r.id, './out/download').then(rimraf(path.join(folder, release.torrentfile), (err) => {
                console.log('Deleted file ' + path.join(folder, release.torrentfile));
                cb(1);
              }));
            }
            catch (err) {
              console.log(err)
              setTimeout(cb(1), 3000);
            }
          }
        });
      } else { cb(0) }
    } catch (err) {
      console.log(err);
      cb(0);
    }});
  } catch (err) {
    console.log("Error sending API request. Skipping.");
    setTimeout(cb(1), 3000);
  }
}

function findExactMatches(local, remote, localfolder, remoteFolder, cb) {
  if (config.download == 0) {
    console.log("Downloading is turned off. Skipping.")
    cb(-1);
  } else {
    var a = remote.replace(/}}}/g, '').split("|||");
    var matches = 0;
    for (var i = 0; i < a.length; i++) {
      a[i] = entities.decode(a[i]);
      a[i] = a[i].split("\{\{\{");
    }
    for (var i = 0; i < local.length; i++) {
      for (var k = 0; k < a.length; k++) {
        if (a[k][0] == local[i].name && a[k][1] == local[i].length) {
          matches++;
        }
      }
    }
    if (matches == a.length) {
      if (localfolder == remoteFolder) {
        cb(1);
      } else {
        msg = [];
        msg.push("Exact match found! Only folder names differ.")
        if (config.renameFolders == 1) {
          mv(path.join(datadir, localfolder), path.join(datadir, entities.decode(remoteFolder)), (err) => {
            if (err) {
              console.log(err);
            }
            console.log("Renaming folder from "+localfolder+" to "+remoteFolder+" and downloading torrent file.");
            cb(1);
          });
        } else {
          console.log("renameFolders is 0. Doing nothing.")
          cb(0);
        }
      }
    } else {
      console.log("Not an exact match.")
      cb(0);
    }
  }
}

function findLog(release, cb) {
  var p = path.join(datadir, release.torrentdata.name);
  findInDir(p, /.*?.log$/i, result => {
    try {cb(path.join(p, result[0]));}
    catch (err) {cb(null);}
  });
}

function findTracks(release, cb) {
  var p = path.join(datadir, release.torrentdata.name);
  findInDir(p, /.*?.flac$/i, result => {
    try{cb(result.length);}
    catch(err){console.log("No flac files found, something is very wrong.");}
  });
}

function findCover(release, cb) {
  var p = path.join(datadir, release.torrentdata.name);
  var found = false;
  findInDir(p, /.*?.(png|jpeg|jpg)$/i, result => {
    if (result.length == 1) {
      try{cb(path.join(p, result[0]));}
      catch (err) {cb(null);}
    } else if (result.length > 1) {
      for (var i = 0; i < result.length; i++) {
        if (/.*?(cover|front|folder).*?/.test(result[i])) {
          try {cb(path.join(p, result[i]));}
          catch (err) {cb(null);}
          found = true;
        }
      }
      if (found == false) {
        try {cb(path.join(p, result[0]));}
        catch (err) {cb(null);}
      }
    } else {
      cb(null);
    }
  });
}

function findInDir(dir, reg, cb) {
  var result = [];
  fs.readdir(dir, (err, files) => {
    for (var i = 0; i < files.length; i++) {
      if (reg.test(files[i])) {
        result.push(files[i]);
      }
    }
    cb(result);
  });

}

function filterFLAC(arr) {
  var a = [];
  for (var i = 0, l = arr.length; i < l; i++) {
    if (arr[i].format == 'FLAC') {
      a.push(arr[i]);
    }
  }
  return a;
}

function promptSelection (arr, msg) {
  if (config.prompt == 0) { return -1; }
  for (var i = 0, l = msg.length; i < l; i++) {
    console.log(msg[i]);
  }
  var p = prompt.question('Selection: ');
  var selected = parseInt(p, 10) - 1;
  if (selected == -1) {
    return selected;
  } else if (arr[selected] != null) {
    return selected;
  } else {
    console.log("Invalid selection!");
    return promptSelection(arr, msg);
  }
}

function Release(arr, filename) {
  this.artist = arr[1];
  this.album = arr[2];
  this.year = arr[3];
  this.media = arr[4];
  this.format = arr[5];
  this.quality = arr[6];
  this.torrentfile = filename;
  try {
    this.torrentdata = parseTorrent(fs.readFileSync(path.join(folder, filename)));
  } catch (err) {
    console.log(err);
  }
}

function writeRow(artist, album, media, gid, tor, log, img, tracks, year, cb) {
  var t = (config.linuxToWin == 0) ? path.normalize(tor.replace(config.replacePathFrom, config.replacePathTo)) : path.win32.normalize(tor.replace(config.replacePathFrom, config.replacePathTo));
  if (log != null) {
    var l = (config.linuxToWin == 0) ? path.normalize(log.replace(config.replacePathFrom, config.replacePathTo)) : path.win32.normalize(log.replace(config.replacePathFrom, config.replacePathTo));
  } else {
    var l = null;
  }
  var str = '<div>';
  str += '<div class=\'artist\' style=\'display: inline-block\'><input type=\'text\' value=\"' + artist + '\"></input></div>';
  str += '<div class=\'album\' style=\'display: inline-block\'><input type=\'text\' value=\"' + album + '\"></input></div>';
  str += '<div class=\'media\' style=\'display: inline-block\'><input type=\'text\' value=\"' + media + ' - ' + year + ' - ' + tracks + '\"></input></div>';
  str += '<div class=\'group\' style=\'display: inline-block\'><a href=\'' + config.domain + 'torrents.php?id=' + gid + '\'>' + gid + '</a></div>';
  str += '<div class=\'tor\' style=\'display: inline-block\'><input type=\'text\' maxlength=\'1000\' value=\"' + t + '\"></input></div>';
  str += '<div class=\'log\' style=\'display: inline-block\'><input type=\'text\' value=\"' + l + '\"></input></div>';
  str += '<div class=\'img\' style=\'display: inline-block\'><input type=\'text\' value=\"' + img + '\"></input></div>';
  str += '</div>'
  fs.appendFile(path.join(__dirname,'out/upload.html'), str, (err) => {
    if (err) {
      console.log(err);
    }
    cb();
  });
}

function writeHead() {
  var str = '<html><head><style>'
  str += '.group{width: 80px;}'
  str += '</style><head><body>'
  fs.writeFileSync(path.join(__dirname, 'out/upload.html'), str);
  writeRow('Artist','Album','Media - Year - Tracks','Group','Torrent File','Log File','Image', 'x', '20xx', () => {});
}
