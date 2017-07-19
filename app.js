var tmi = require("tmi.js");
var fs = require('fs');
var champions;
var obj;
fs.readFile('champions.txt', 'utf8', function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);
    champions = obj.data;
});
var turkish = true;

var flashes = {};

if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) { 
            return typeof args[number] != 'undefined'
                ? args[number]
            : match
            ;
        });
    };
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

var Irelia = require('Irelia');
var irelia =  new Irelia({
    secure: true,
    host: 'api.riotgames.com',
    path: '/lol/',
    key: 'key',
    debug: true
});

var channel = "TR_Actor";

if (process.argv.length > 2) {
    channel = process.argv[2];
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
        password: "oauth:hxsjzk9shg1lgli164eli3mrnyk9ed"
    },
    channels: [channel]
};

var client = new tmi.client(options);
client.connect();

var date = new Date();
var hours = date.getHours();

client.on('connected', function (address, port) {
    "use strict";
    if (hours >= 5 && hours <= 12) {
        client.action(channel, "Herkese günaydın!");
    }
    else {
        client.action(channel, "Herkese günaydın! Saat " + hours + " olsa da ben yeni kalktım :P Komutlar için !help yazın. Yapımcı: @TR_Actor");
    }
});

client.on("chat", function (channel, userstate, message, self) {
    // Don't listen to my own messages..
    "use strict";
    if (self) return;

    if (message.toLowerCase() == "sa" || message.toLowerCase() == "!as" ) {
        msg("Aleyküm Selam Ve Rahmetullahi Ve Berekatuhu Ve Magfiratuhu Ebeden Daimen Dayyiben Mübareken Fi Cennetil Firdevs.");
    }
    else if (message.startsWith("!elo") && message.length > 5) {
        var comma = message.indexOf(",");
        var summName = message.substr(5, comma > 0 ? comma - 5 : message.length - 5);
        var region = comma > 0 ? message.substr(comma + 1) : null;
        region = region == null ? 'tr' : region.toLocaleLowerCase();
        irelia.getSummonerByName(region,summName,function(err,res) {
            if (err) {
                msg(notFoundFormat().format(region,summName));
            }
            else {
                var summ = res;
                irelia.getLeagueEntryBySummonerId(region, summ.id, function(err,_res) {
                    if (err) {
                        msg(notFoundFormat().format(region,summName));
                    }
                    else {
                        var text;
                        var i;
                        for (i = 0; i < _res.length; i++) { 
                            var league = _res[i];
                            if (league != null && league.leaguePoints != undefined) {
                                var str;
                                if (league.leaguePoints == 100) {
                                    str = "Seri: " + seriesFormat(league.miniSeries.progress);
                                }
                                else {
                                    str = "";
                                }
                                text += eloFormat().format(summName, irelia.gametypes[league.queueType], league.tier,league.rank,league.leaguePoints, str, league.leagueName) + " "; 
                                console.log(text + "\r\n");
                            }
                        }
                        
                        if (_res.length == 0) {
                            msg("UNRANKED");
                        }
                        else {
                            msg(text.replaceAll("undefined",""));
                        }
                    }
                } );
            }
        });

    }
    else if (message == "!english") {
        turkish = false;
        msg("You will now see messages in English.");
    }
    else if (message == "!turkish") {
        turkish = true;
        msg("Artık mesajları Türkçe göreceksiniz");
    }
    else if (message.startsWith("!flashed") && message.length > 8) {
        var space = message.indexOf(" ");
        if (space > -1) {
            var champName = message.substr(space + 1);
            flashes[champName] = new Date();
            msg(flashedFormat().format(champName));
        }
    }
    else if (message.startsWith("!flash") && message.length > 6) {
        var space = message.indexOf(" ");
        if (space > -1) {
            var champName = message.substr(space + 1);
            if (flashes[champName] == undefined) {
                msg(flashAvailableFormat().format(champName));
            }
            else {
                var flashDate = flashes[champName];
                var currentDate = new Date();
                var spanSec = (currentDate - flashDate) / 1000;
                if (spanSec >= 300) {
                    msg(flashAvailableFormat().format(champName));
                }
                else {
                    msg(flashLeftTimeFormat().format(champName,(300 - spanSec).toFixed(0)));
                }
            }
        }
    }
    else if (message.startsWith("!mastery") && message.length > 20) {
        var space = message.indexOf(" ");
        var comma = message.indexOf(",");
        var comma2 = message.indexOf(",",comma + 1);
        var id;
        if (space != -1 && comma != -1 && comma2 != -1) {
            var summName = message.substr(space + 1, comma - space - 1);
            var champName = message.substr(comma + 1, comma2 - comma - 1);
            var region = message.substr(comma2 + 1);
            irelia.getSummonerByName(region, summName,function(err,res) {
                if (err) {
                    if (!err.statusCode == 404) {
                        msg(notFoundFormat().format(region,summName));
                    }
                    else {
                        msg(summonerNotFoundFormat().format(region,summName));  
                    }
                }
                else {
                    var summ = res;
                    if (summ == null) {
                        msg(summonerNotFoundFormat().format(region,summName));
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
                    irelia.getChampionMastery(region, id, champId, function(err,res) {
                        if (err) {
                            if (err.statusCode == 404) {
                                msg(championNotFoundFormat().format(summName,champName));
                            }
                            else {
                                msg(masteryNotFoundFormat(region,summName,champName));
                            }
                        }
                        else {
                            msg(masteryFormat().format(summName,champName,res.championPoints,res.championLevel));
                        }
                    });
                }
            });
        }

    }
    else if (message == "!help") {
        msg("Komutlar: Elo bakmak için: !elo OyuncuAdı,Bölge(Bölge yazılmazsa tr olarak alınır.) !as: Uzun bir as mesajı yayınlar. !english ve !turkish: Dili değiştirir. !mastery OyuncuAdı,ŞampiyonAdı,Bölge: Oyuncunun Şampiyon için ustalığını gösterir. !flash ŞampiyonAdı: Şampiyon için sıçra süresi ayarlar. Sıçra süresini görmek için !flash ŞampiyonAdı yazın. Yapımcı: @TR_Actor");
    }
    else if (message == "!akeru") {
        msg("Best mid lane");
    }
});

function msg(message) {
    client.action(channel, message);
}

function seriesFormat(progress) {
    return progress.replaceAll("N","•").replaceAll("W","✔").replaceAll("L","✘");
}

function eloFormat() {
    if (turkish) {
        return "{0}'in {1} sıra ligi: {2} {3} {4} LP {5} Küme Adı: {6}";
    }
    else {
        return "{1} Queue rank for {0} : {2} {3} {4} LP {5} Division Name: {6}";
    }
}

function notFoundFormat() {
    if (turkish) {
        return "{0} sunucusunda {1} oyuncusunun ligine bakarken hata meydana geldi. İngilizce olmayan karakterler ve noktalama işaretleri hata çıkarabilir.";
    }
    else {
        return "An error occurred while getting data for {1} player on {0} server. Non-english characters and punctuation may cause problems.";
    }
}

function summonerNotFoundFormat() {
    if (turkish) {
        return "{0} sunucusunda {1} oyuncusu bulunamadı. İngilizce olmayan karakterler ve noktalama işaretleri hata çıkarabilir.";
    }
    else {
        return "An error occurred while getting data for {1} player on {0} server. Non-english characters and punctuation may cause problems.";
    }
}

function flashedFormat() {
    if (turkish) {
        return "{0} sıçra attı. Sıçrasına kaç saniye kaldığını öğrenmek için !flash {0} yazın.";
    }
    else {
        return "{0} has flashed. Write !flash {0} to learn how many seconds left until his flash.";
    }
}

function flashAvailableFormat() {
    if (turkish) {
        return "{0}'ın sıçrası var.";
    }
    else {
        return "Flash is available for {0}";
    }
}

function flashLeftTimeFormat() {
    if (turkish) {
        return "{0}'ın sıçrasına kalan süre: {1} sn";
    }
    else {
        return "Time left for {0}'s flash: {1} sec";
    }
}

function championNotFoundFormat() {
    if (turkish) {
        return "{0} şampiyonu bulunamadı.";
    }
    else {
        return "Champion {0} not found.";
    }
}

function masteryFormat() {
    if (turkish) {
        return "{0}'ın {1} için ustalık puanı: {2}, Seviye {3}"
    }
    else {
        return "Mastery Points of '{0}' for {1}: {2}, Level {3}"
    }
}

function masteryNotFoundFormat() {
    if (turkish) {
        return "{0} sunucusunda {1} oyuncusunun {2} şampiyonuna bakarken hata meydana geldi.";
    }
    else {
        return "An error occurred while getting data for{1} player's {2} mastery on {0} server.";
    }
}

function championNotPlayedFormat() {
    if (turkish) {
        return "{0} {1} ile hiç oyun oynamamış.";
    }
    else {
        return "{0} hasn't played a game with {1}."
    }
}
