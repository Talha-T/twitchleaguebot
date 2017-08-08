var tmi = require("tmi.js");
var fs = require('fs');
var champions;
var obj;
var say = false;
fs.readFile('champions.txt', 'utf8', function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);
    champions = obj.data;
});
var turkish = true;

var defaultRegion = "tr";

var flashes = {};

function contains(a, obj) {
    for (var i = 0; i < a.length; i++) {
        if (a[i] === obj) {
            return true;
        }
    }
    return false;
}

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined' ?
                args[number] :
                match;
        });
    };
}

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

var Irelia = require('Irelia');
var irelia = new Irelia({
    secure: true,
    key: 'key',
    debug: true
});

var channel = "TR_Actor";
var showOpening = true;
var ownerOnly = false;
var defSum;

if (process.argv.length > 2) {
    channel = process.argv[2];
    if (process.argv[3] == "english") {
        turkish = false;
        defaultRegion = "euw";
        if (process.argv.length > 4 && process.argv[4] == "silent")
            showOpening = false;
        if (process.argv.length > 5) {
            ownerOnly = true;
            var defSum = process.argv[5];
            defaultRegion = process.argv[6];
        }
    } else if (process.argv[3] == "silent") {
        showOpening = false;
        if (process.argv.length > 4) {
            ownerOnly = true;
            var defSum = process.argv[4];
            defaultRegion = process.argv[5];
        }
    } else if (process.argv.length > 3) {
        defSum = process.argv[3];
        defaultRegion = process.argv[4];
        ownerOnly = true;
    }

}

if (contains(process.argv, "say")) {
    say = true;
}

var options = {
    options: {
        debug: true
    },
    connection: {
        cluster: "aws",
        reconnect: true
    },
    identity: {
        username: "LigBot",
        password: "oauthpasshere"
    },
    channels: [channel]
};

var client = new tmi.client(options);
client.connect();

var date = new Date();
var hours = date.getHours();

client.on('connected', function (address, port) {
    "use strict";
    //client.color("channel", "Chocolate");
    if (showOpening) {
        if (hours >= 5 && hours <= 12) {
            client.action(channel, openingFormat2());
        } else {
            client.action(channel, openingFormat().format(hours));
        }
    }
});

client.on("chat", function (channel, userstate, message, self) {
    // Don't listen to my own messages..
    "use strict";
    if (self) return;
    var masteryCommand = !turkish ? "!mastery" : "!ustalık";
    if (message.startsWith("!elo")) {
        if (!ownerOnly && message.length > 5) {
            var comma = message.indexOf(",");
            var summName = message.substr(5, comma > 0 ? comma - 5 : message.length - 5);
            var region = comma > 0 ? message.substr(comma + 1) : null;
            region = region == null ? defaultRegion : region.toLocaleLowerCase();
            irelia.getSummonerByName(region, summName, function (err, res) {
                if (err) {
                    msg(notFoundFormat().format(region, summName));
                } else {
                    var summ = res;
                    irelia.getLeagueEntryBySummonerId(region, summ.id, function (err, _res) {
                        if (err) {
                            msg(notFoundFormat().format(region, summName));
                        } else {
                            var text;
                            var i;
                            for (i = 0; i < _res.length; i++) {
                                var league = _res[i];
                                if (league != null && league.leaguePoints != undefined) {
                                    var str;
                                    if (league.leaguePoints == 100) {
                                        str = "Seri: " + seriesFormat(league.miniSeries.progress);
                                    } else {
                                        str = "";
                                    }
                                    text += eloFormat().format(summName, irelia.gametypes[league.queueType], league.tier, league.rank, league.leaguePoints, str) + " ";
                                }
                            }

                            if (_res.length == 0) {
                                msg("UNRANKED");
                            } else {
                                msg(text.replaceAll("undefined", ""));
                            }
                        }
                    });
                }
            });
        } else {
            irelia.getSummonerByName(defaultRegion, defSum, function (err, res) {
                var summ = res;
                if (!err) {
                    irelia.getLeagueEntryBySummonerId(defaultRegion, summ.id, function (e, r) {
                        if (!err) {
                            var text;
                            var i;
                            for (i = 0; i < r.length; i++) {
                                var league = r[i];
                                if (league != null && league.leaguePoints != undefined) {
                                    var str;
                                    if (league.leaguePoints == 100) {
                                        str = "Seri: " + seriesFormat(league.miniSeries.progress);
                                    } else {
                                        str = "";
                                    }
                                    text += eloFormat().format(summ.name, irelia.gametypes[league.queueType], league.tier, league.rank, league.leaguePoints, str) + " ";
                                }
                            }

                            if (r.length == 0) {
                                msg("UNRANKED");
                            } else {
                                msg(text.replaceAll("undefined", ""));
                            }
                        }
                    });
                }
            });
        }
    } else if (message == "!english") {
        turkish = false;
        msg("You will now see messages in English.");
    } else if (message == "!turkish") {
        turkish = true;
        msg("Artık mesajları Türkçe göreceksiniz");
    } else if (message.startsWith("!flashed") && message.length > 8) {
        var space = message.indexOf(" ");
        if (space > -1) {
            var champName = message.substr(space + 1);
            flashes[champName] = new Date();
            msg(flashedFormat().format(champName));
        }
    } else if (message.startsWith("!flash") && message.length > 6) {
        var space = message.indexOf(" ");
        if (space > -1) {
            var champName = message.substr(space + 1);
            if (flashes[champName] == undefined) {
                msg(flashAvailableFormat().format(champName));
            } else {
                var flashDate = flashes[champName];
                var currentDate = new Date();
                var spanSec = (currentDate - flashDate) / 1000;
                if (spanSec >= 300) {
                    msg(flashAvailableFormat().format(champName));
                } else {
                    msg(flashLeftTimeFormat().format(champName, (300 - spanSec).toFixed(0)));
                }
            }
        }
    } else if (message.startsWith(masteryCommand)) {
        if (!ownerOnly) {
            var space = message.indexOf(" ");
            var comma = message.indexOf(",");
            var comma2 = message.indexOf(",", comma + 1);
            var id;
            if (space != -1 && comma != -1 && comma2 != -1) {
                var summName = message.substr(space + 1, comma - space - 1);
                var champName = message.substr(comma + 1, comma2 - comma - 1);
                var region = message.substr(comma2 + 1);
                var summErr = false;
                irelia.getSummonerByName(region, summName, function (err, res) {
                    if (err) {
                        if (!err.statusCode == 404) {
                            msg(notFoundFormat().format(region, summName));
                            summErr = true;
                        } else {
                            msg(summonerNotFoundFormat().format(region, summName));
                            summErr = true;
                        }
                    } else {
                        var summ = res;
                        if (summ == null) {
                            msg(summonerNotFoundFormat().format(region, summName));
                            return;
                        }
                        id = summ.id;
                        var champId = -100;
                        for (var champIndex in champions) {
                            var champ = champions[champIndex];
                            if (champ.name.toLocaleLowerCase() == champName.toLocaleLowerCase()) {
                                champId = champ.id;
                            }
                        }
                        if (champId == -100) {
                            msg(championNotFoundFormat().format(champName));
                        }
                        irelia.getChampionMastery(region, id, champId, function (err, res) {
                            if (err && !summErr) {
                                if (err.statusCode == 404) {
                                    msg(championNotPlayedFormat().format(summName, champName));
                                } else {
                                    msg(masteryNotFoundFormat(region, summName, champName));
                                }
                            } else {
                                msg(masteryFormat().format(summName, champName, res.championPoints, res.championLevel));
                            }
                        });
                    }
                });
            }

        } else {
            var id;
            var summName = defSum;
            var champName = message.substr(message.indexOf(" ") + 1);
            var region = defaultRegion;
            var summErr = false;
            irelia.getSummonerByName(region, summName, function (err, res) {
                if (!err) {
                    var summ = res;
                    if (summ == null) {
                        msg(summonerNotFoundFormat().format(region, summName));
                        return;
                    }
                    id = summ.id;
                    var champId = -100;
                    for (var champIndex in champions) {
                        var champ = champions[champIndex];
                        if (champ.name.toLocaleLowerCase() == champName.toLocaleLowerCase()) {
                            champId = champ.id;
                        }
                        else summErr = true;
                    }
                    if (champId == -100) {
                        msg(championNotFoundFormat().format(champName));
                    }
                    irelia.getChampionMastery(region, id, champId, function (err, res) {
                        if (err && !summErr) {
                            if (err.statusCode == 404) {
                                msg(championNotPlayedFormat().format(summName, champName));
                            } else {
                                msg(masteryNotFoundFormat(region, summName, champName));
                            }
                        } else if (!err) {
                            msg(masteryFormat().format(summName, champName, res.championPoints, res.championLevel));
                        }
                    });
                }
            });

        }
    } else if (message == "!help") {
        msg(helpFormat());
    } else if (message == "!source") {
        msg("https://github.com/Talha-T/twitchleaguebot");
    }
});

function msg(message) {
    if (say)
        client.say(channel, message);
    else
        client.action(channel, message);
}

function helpFormat() {
    if (turkish)
        return "Elo bakmak için: !elo, Şampiyon ustalığı için !mastery ŞampiyonAdı. !english ve !turkish: Anla bi zahmet. !source: Kaynak kodu gösterir. Yapımcı: @TR_Actor";
    else
        return "Look for elo: !elo, Look for champion mastery: !mastery ŞampiyonAdı. !english ve !turkish: Isn't it obvious?. !source: Source code. Author: @TR_Actor"
}

function openingFormat() {
    if (turkish)
        return "Herkese günaydın! Saat {0} olsa da ben yeni kalktım :P Komutlar için !help yazın. Yapımcı: @TR_Actor";
    else
        return "Hello everyone! Even if time is {0} I just woked up. P Type !help for commands. Developer: @TR_Actor"
}

function openingFormat2() {
    if (turkish)
        return "Herkese günaydın. Komutlar için !help yazın. Yapımcı: @TR_Actor";
    else
        return "Good morning everyone. Type !help for commands. Developer: @TR_Actor"
}

function seriesFormat(progress) {
    return progress.replaceAll("N", "•").replaceAll("W", "✔").replaceAll("L", "✘");
}

function eloFormat() {
    if (turkish) {
        return "{0}'in {1} sıra ligi: {2} {3} {4} LP {5}";
    } else {
        return "{1} Queue rank for {0} : {2} {3} {4} LP {5}";
    }
}

function notFoundFormat() {
    if (turkish) {
        return "{0} sunucusunda {1} oyuncusunun ligine bakarken hata meydana geldi. İngilizce olmayan karakterler ve noktalama işaretleri hata çıkarabilir.";
    } else {
        return "An error occurred while getting data for {1} player on {0} server. Non-english characters and punctuation may cause problems.";
    }
}

function summonerNotFoundFormat() {
    if (turkish) {
        return "{0} sunucusunda {1} oyuncusu bulunamadı. İngilizce olmayan karakterler ve noktalama işaretleri hata çıkarabilir.";
    } else {
        return "An error occurred while getting data for {1} player on {0} server. Non-english characters and punctuation may cause problems.";
    }
}

function flashedFormat() {
    if (turkish) {
        return "{0} sıçra attı. Sıçrasına kaç saniye kaldığını öğrenmek için !flash {0} yazın.";
    } else {
        return "{0} has flashed. Write !flash {0} to learn how many seconds left until his flash.";
    }
}

function flashAvailableFormat() {
    if (turkish) {
        return "{0}'ın sıçrası var.";
    } else {
        return "Flash is available for {0}";
    }
}

function flashLeftTimeFormat() {
    if (turkish) {
        return "{0}'ın sıçrasına kalan süre: {1} sn";
    } else {
        return "Time left for {0}'s flash: {1} sec";
    }
}

function championNotFoundFormat() {
    if (turkish) {
        return "{0} şampiyonu bulunamadı.";
    } else {
        return "Champion {0} not found.";
    }
}

function masteryFormat() {
    if (turkish) {
        return "{0}'ın {1} için ustalık puanı: {2}, Seviye {3}"
    } else {
        return "Mastery Points of '{0}' for {1}: {2}, Level {3}"
    }
}

function masteryNotFoundFormat() {
    if (turkish) {
        return "{0} sunucusunda {1} oyuncusunun {2} şampiyonuna bakarken hata meydana geldi.";
    } else {
        return "An error occurred while getting data for{1} player's {2} mastery on {0} server.";
    }
}

function championNotPlayedFormat() {
    if (turkish) {
        return "{0} {1} ile hiç oyun oynamamış.";
    } else {
        return "{0} hasn't played a game with {1}."
    }
}

