require("dotenv").config()
const { Sequelize } = require('sequelize');
const {exec} = require("child_process")
const cluster = require("cluster")
const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const axios = require("axios")
const fs = require("fs")
const path = require("path")
const express = require('express');
const bodyParser = require('body-parser')
const {HtmlElement} = require("./htmlElement");
const URL = require("url").URL;
const URLparse = require("url").parse;
const https = require("https")
const {getHTML} = require("./web.js")
var cron = require('node-cron');
const QRCode = require('qrcode')

const app = express();

const port = process.env.PORT || 80;

const urlfilepath=path.join(__dirname,"links.txt")
const jsondataname="jsondata.json"

const { Op } = require("sequelize")


const sequelize = new Sequelize(
    process.env.DB,
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT
}
);

const models={
    anime:require('./models/anime'),
    temp:require('./models/temp'),
    episode:require('./models/episode')
}

getTempLink=(linkEpisode)=>{
    return linkEpisode.replace(/\/ver\//,"/anime/").replace(/-\d+$/,"");
}

addEpisodeToDB=async({linkEpisode})=>{
    try {
        await sequelize.authenticate();
        //const anime = await models.anime(sequelize);
        const temporada = await models.temp(sequelize);
        const episode = await models.episode(sequelize);
    
        let linkTemp = getTempLink(linkEpisode);
        
        dbtempsmatch = (await temporada.findAll({where:{link:linkTemp}})).map(e => e.dataValues)

        let imageLink
        let title
        let idtemp
    
        if(dbtempsmatch.length>0){
            imageLink = dbtempsmatch[0].image;
        
            title = dbtempsmatch[0].name;
    
            idtemp=dbtempsmatch[0].id;
        }else{
            imageLink = await getCover(linkTemp);
        
            title = await getTitle(linkTemp);
    
            newtemp = temporada.build({name:title,image:imageLink,link:linkTemp})
    
            await newtemp.save();
    
            idtemp=newtemp.dataValues.id;
        }
    
        let epinum = getEpisodeNumber(linkEpisode);
    
        dbepimatch=(await episode.findAll({where:{link:linkEpisode}})).map(e=>e.dataValues)
    
        if(dbepimatch.length==0){
           let  newepi = episode.build({temp:idtemp,number:epinum,link:linkEpisode});
    
           await newepi.save()
        }
        
    } catch (error) {
        console.log(error)
    }
}

/* try {
    (async()=>{
        await sequelize.authenticate();
        const anime = await models.anime(sequelize);
        let test = anime.build({name:"test"});
        test.save();
    })()
} catch (error) {
    console.log("error "+ error)
} */

render = (template,objs)=>{
    return template.replace(/\{\{\w+\}\}/g,o=>{
        return objs[o.replace(/\}|\{/g,"")]
    })
}

setJson=(obj)=>{
    fs.writeFileSync(path.join(__dirname,jsondataname),JSON.stringify(obj),{encoding:"utf-8"})
}
getJson=()=>{
    return JSON.parse(fs.readFileSync(path.join(__dirname,jsondataname),{encoding:"utf-8"}))
}

////////////specific web code////////////

const link="https://m.animeflv.net";

var episodes = JSON.parse(process.env.currentepisodes||"[]");

const notify = ()=>{
    getHTML(link).then(async e=>{
        let epi = e.match(/<a href="\/ver\/.*>/g).map(e=>link+e.match(/".*"/g)[0].replace(/"/g,""))
        if (episodes && episodes.length==0){
            episodes=epi
            for(const ep of epi.reverse()){
                await addEpisodeToDB({linkEpisode:ep})
            }
        }else{
            let newepis = epi.filter(e=>!episodes.includes(e))
            if(newepis.length>0){
                episodes=epi
                console.log(newepis)
                if(process.env.user){
                    for(const ep of newepis.reverse()){
                        await addEpisodeToDB({linkEpisode:ep})
                    }
                    newepis.forEach(ep=>{
                        bot.telegram.sendMessage(parseInt(process.env.user),ep)
                    })
                }
            }
        }
    })
}

var ipv4Regex=/(\d{1,3}\.){3}(\d{1,3})/;
var ipv6Regex=/([0-9a-f]+:)+[0-9a-f]*/;

const getPublicLink=async()=>{
    ip=await getHTML({ hostname: 'ifconfig.me',  headers: {  'Accept': 'application/json' }})
    if(ip.match(ipv4Regex)){
        return "http://"+ip+"/episodes"
    }
    if(ip.match(ipv6Regex)){
        return "http://["+ip+"]/episodes"
    }
    return "can't get ip"
}
///getPublicLink()
//////////end specific web code//////////

let crc32 =(r)=>{for(var a,o=[],c=0;c<256;c++){a=c;for(var f=0;f<8;f++)a=1&a?3988292384^a>>>1:a>>>1;o[c]=a}for(var n=-1,t=0;t<r.length;t++)n=n>>>8^o[255&(n^r.charCodeAt(t))];return(-1^n)>>>0};

getLinks =async()=>{
  let rawlinks = fs.readFileSync(urlfilepath,{encoding:"utf-8"}).split(/\r\n|\n/).filter(l=>l.trim()!="")
  let s=await Promise.all(rawlinks.map(async rl=>{
    let img=new HtmlElement("img")
    img.src= await getCover(rl)

    let card=new HtmlElement("div")
    card.setClass("card")
    card.id=crc32(rl)
    let divimg=new HtmlElement("div")
    divimg.setClass("image")
    let divtit=new HtmlElement("div")
    divtit.setClass("title")
    let divdesc=new HtmlElement("div")
    divdesc.setClass("descript")

    divimg.innerHtml=[img]

    let switchdiv=new HtmlElement("div")
    switchdiv.setClass("switch")
    let switchseldiv=new HtmlElement("div")
    switchseldiv.setClass("switchselec")
    switchdiv.innerHtml=switchseldiv

    let a=new HtmlElement("a")
    a.href=rl

    let n=rl.match(/\/(\w|\_|\-)+$/g)
    divtit.innerHtml=(n && n[0])?n[0].replace(/\//g,"").replace(/\_|\-/g," "):`[${rl}]`

    card.innerHtml=[divimg,divtit,divdesc,switchdiv]

    a.innerHtml=[card]
    
    return `${a.toString()}\n`
  }))
  return s.join("")
}

getEpiCard=({link,imagelink,number,title,view})=>{
    let listel=new HtmlElement("li");
    if (view){
        listel.setClass("Episode","visto");
    } else {
        listel.setClass("Episode");
    }

    let alink = new HtmlElement("a");
    alink.href="/videos?epi="+link

    let figure=new HtmlElement("figure");
    figure.setClass("Image")

    let img = new HtmlElement("img");
    img.src=(imagelink.replace(/\/covers\//,"/thumbs/"))

    figure.innerHtml=[img]

    let h2 = new HtmlElement("h2");
    h2.setClass("Title")
    h2.innerHtml=title

    let p = new HtmlElement("p");
    let span = new HtmlElement("span");
    span.innerHtml=number

    p.innerHtml=["episodio",span]

    alink.innerHtml=[figure,h2,p]

    listel.innerHtml=[alink]

    return listel.toString()
}

getEpisodes=async(mindate, maxdate)=>{
    await sequelize.authenticate();
    //const anime = await models.anime(sequelize);
    const temp = await models.temp(sequelize);
    const episode = await models.episode(sequelize);

    let epis

    if(mindate && maxdate){
        epis=(await episode.findAll({where:{created_at:{[Op.between]:[mindate,maxdate]}}})).map(e=>e.dataValues);
    }else if(mindate){
        epis=(await episode.findAll({where:{created_at:{[Op.gte]:mindate}}})).map(e=>e.dataValues);
    }else {
        epis=(await episode.findAll()).map(e=>e.dataValues);
    }

    let temps=(await temp.findAll()).map(e=>e.dataValues);

    episobjs = epis.map(ep=>{
        tempmatch = temps.filter(tem=>tem.id==ep.temp)
        if(tempmatch && tempmatch.length>0){
            return {
                link:ep.link,
                imagelink:tempmatch[0].image,
                number:ep.number,
                title:tempmatch[0].name,
                view:ep.view
            }
        }else{
            return {
                link:ep.link,
                imagelink:"",
                number:ep.number,
                title:"",
                view:false
            }
        }
    })

    return episobjs.reverse().map(e=>getEpiCard(e)).join("")

}

getVideolinks=async(episodeLink)=>{
    let rawHtml = await getHTML(episodeLink);
    let jsonvids= rawHtml.match(/(?<=var videos = ){.*}(?=;)/)[0]
    let vids = false
    try {
        vids = JSON.parse(jsonvids)
    } catch (error) {
        console.log("cant parse json:  "+jsonvids)    
    }
    return vids
}

getVideoCard=(vid,epinum)=>{
    let listel=new HtmlElement("li");
    listel.setClass("Video");

    let alink = new HtmlElement("a");
    alink.href=vid.code

    let h2 = new HtmlElement("h2");
    h2.setClass("Title")
    h2.innerHtml=vid.title
    let p = new HtmlElement("p");
    let span = new HtmlElement("span");
    span.innerHtml=epinum

    p.innerHtml=["episodio",span]

    alink.innerHtml=[h2,p]

    listel.innerHtml=[alink]

    return listel.toString()
}

getVideoOptions=async(epilink)=>{
    let vids = await getVideolinks(epilink);
    let epinum = getEpisodeNumber(epilink)
    return vids.SUB.map(vid=>getVideoCard(vid,epinum)).join("")
}

toggleViewStatus=async(epilink)=>{
    await sequelize.authenticate();
    const episode = await models.episode(sequelize);
    let episodeObj = (await episode.findAll({where:{link:epilink}}))[0];
    episodeObj.view=!episodeObj.view;
    await episodeObj.save();
}

capitalize=(str)=>str.replace(/\w+/g,e=>e.toLowerCase().replace(/^\w/,f=>f.toUpperCase()))

checkurl=(str)=>{
    try {
        new URL(str)
        return true
    } catch (error) {
        return false
    }
}

getCover = async(link) =>{
    let strategies = [
        {match:/m\.animeflv\.net/i, finder:async(link)=>{
                let rawHtml = await getHTML(link)
                let cover = rawHtml.match(/\/uploads\/animes\/covers\/\w+\.jpg/)[0];
                return `https://m.animeflv.net${cover}`
        }},
        {match:/monoschinos2\.com/i, finder:async(link)=>{
                let rawHtml = await getHTML(link)
                let cover = rawHtml.match(/(?<=<img class="lazy bg-secondary[\S,\s]* data-src=")(.*)\.jpg/g);
                return (cover && cover[0])?`${cover[0]}`:""
        }},
        {match:/jkanime\.net/i, finder:async(link)=>{
                let rawHtml = await getHTML(link)
                let cover = rawHtml.match(/(?<=<div class="anime__details__pic[\S,\s]* data-setbg=")(.*)\.jpg/g);
                return (cover && cover[0])?`${cover[0]}`:""
        }}
    ]
    let strat = strategies.filter(stra=>link.match(stra.match))
    if(strat.length>0){
        return strat[0].finder(link)
    }
}

getTitle = async(link) =>{
    let strategies = [
        {match:/m\.animeflv\.net/i, finder:async(link)=>{
                let rawHtml = await getHTML(link)
                let title = rawHtml.match(/(?<=\<h1 class="Title"\>).*(?=\<\/h1\>)/g)[0];
                return title
        }}
    ]
    let strat = strategies.filter(stra=>link.match(stra.match))
    if(strat.length>0){
        return strat[0].finder(link)
    }
}

getEpisodeNumber = (link)=> parseInt(link.match(/\d+$/g)[0])

getDateAWeekAgo=()=>{
    var date = new Date();
    date.setDate(date.getDate() - 7);
    return date.getFullYear()+"-"+(("0"+(date.getMonth()+1)).slice(-2))+"-"+date.getDate();
}

//getCover("https://m.animeflv.net/anime/tensei-kizoku-no-isekai-boukenroku-jichou-wo-shiranai-kamigami-no-shito")


// sendFile will go here
app.get('/', async function(req, res) {
  links_render = await getLinks()
  //res.sendFile(path.join(__dirname, '/index.html'));
  let page= render(fs.readFileSync(path.join(__dirname,"index.html"),{encoding:"utf-8"}),{test:"elemento de prueba",links:links_render})
  res.send(page)
});
app.get('/episodes', async function(req, res) {
    let mindate = req.query.min?req.query.min.match(/^\d{4}-\d{2}-\d{2}$/g):null
    let maxdate = req.query.max?req.query.max.match(/^\d{4}-\d{2}-\d{2}$/g):null
    episodes_render = await getEpisodes(mindate?mindate[0]:getDateAWeekAgo(),maxdate?maxdate[0]:null)
    //res.sendFile(path.join(__dirname, '/index.html'));
    let page= render(fs.readFileSync(path.join(__dirname,"episodes.html"),{encoding:"utf-8"}),{test:"elemento de prueba",episodes:episodes_render})
    res.send(page)
});
app.get('/episodes/all', async function(req, res) {
    episodes_render = await getEpisodes();
    let page= render(fs.readFileSync(path.join(__dirname,"episodes.html"),{encoding:"utf-8"}),{test:"elemento de prueba",episodes:episodes_render})
    res.send(page)
});
app.get('/videos', async function(req, res) {
    let epilink = req.query.epi
    let videoOptions=""
    let title = await getTitle(getTempLink(epilink))
    if(checkurl(epilink)){
        videoOptions = await getVideoOptions(epilink)
    };
      //res.sendFile(path.join(__dirname, '/index.html'));
    let page= render(fs.readFileSync(path.join(__dirname,"videos.html"),{encoding:"utf-8"}),{originallink:epilink,videos:videoOptions,title})
    res.send(page);
});
app.get('/markasview', async function(req, res) {
    let epilink = req.query.epi
    if(checkurl(epilink)){
        await toggleViewStatus(epilink)
    }
  //res.sendFile(path.join(__dirname, '/index.html'))
  res.redirect('/episodes/all');
});

app.get('/genQR', async function(req,res){
    let data = req.query.data||"no data";
    try{
        const qrcode = await QRCode.toDataURL(data);
        res.setHeader("Content-Type","image/png");
        const base64data= qrcode.replace(/^data:image\/png;base64,/,"")
        const imagebuff = Buffer.from(base64data,"base64");
        res.send(imagebuff);
    }catch{
        res.status(500).send("error")
    }
})

app.get('/scan', async function(req,res){
    let page= render(fs.readFileSync(path.join(__dirname,"scan.html"),{encoding:"utf-8"}),{})
    res.send(page);
})

app.get('/counter', async function(req, res) {
    let page= render(fs.readFileSync(path.join(__dirname,"counter.html"),{encoding:"utf-8"}),{})
    res.send(page)
});

app.get('/getlink',async function(req,res){
    let externallink=getPublicLink();
    res.redirect(externallink);
})

var jsonParser = bodyParser.json()
//var urlencodedParser = bodyParser.urlencoded({ extended: false })
 
app.post('/anime/', jsonParser, async function(req, res) {
    console.log(req.body)
  res.send(true)
});



appendToFile=(filepath,dat)=>{
    if(fs.existsSync(filepath)){
        let rawtxt = fs.readFileSync(filepath,{encoding:"utf-8"})
        fs.writeFileSync(filepath,`${rawtxt}\n${dat}`.replace(/^\n/,""),{encoding:"utf-8"})
    }else{
        fs.writeFileSync(filepath,dat,{encoding:"utf-8"})
    }
}

var superlistpath = path.join(__dirname,"superlist.csv")


app.get("/super",async function(req,res) {
    if(req.query.data!="list"){
       let page= render(fs.readFileSync(path.join(__dirname,"super.html"),{encoding:"utf-8"}),{})
        res.send(page); 
    }else{
        let superlist={}
        if(fs.existsSync((superlistpath))){
            superlist=fs.readFileSync(superlistpath,{encoding:"utf-8"}).split(/\n/).map(e=>{
            let s=e.split(",")
            return {name:s[0],state:s[1]}}) .filter(e=>e.name!="")
        }
        
        res.json(superlist)
    }
    
})
app.post("/super",jsonParser,async function(req,res) {
    if(req.body.name){
        appendToFile(superlistpath,`${req.body.name},created`)
    }
    res.send("ok")
})
app.delete("/super",jsonParser,async function(req,res) {
    if(req.body.name && fs.existsSync(superlistpath)){
        let content = fs.readFileSync(superlistpath,{encoding:"utf-8"}).split(/\n/).filter(e=>!e.match(RegExp("^"+req.body.name+","))).join("\n")
        fs.writeFileSync(superlistpath,content,{encoding:"utf-8"})
    }
    res.send("ok")
})

const bot = new Telegraf(process.env.telegramToken)

const createDir=(dir)=>{
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir)
    }
}

createDir(path.join(__dirname,"files"));


formatJson = (json) =>{
    let count=0;
    return JSON.stringify(json).replace(/{},|\[\]|{}|\[|\]|{|(}|true|false|"(\\"|[^"])*")(:|,)?|}/g,e=>{
    if(e=="}" || e=="]" || e=="}," )count--; 
    let pad = [...Array(count).keys()].map(e=>"   ").join("")
    if(e=="{" || e=="[")count++; 
    return pad+e+"\n"}).replace(/(?<=:)\n\s*(?=({|\[|false|true|"(\\"|[^"])*"|(\d+)))/g," ")
}

parseHeadAttrib=(str,attr)=>{
    let info = str.split("\n");
    let reg = RegExp(attr+":?","i")
    let attrM = info.filter(l=>l.match(reg))
    return attrM && attrM.length>0 ?attrM[0].replace(reg,"").trim():"no set";
}

createDir(path.join(__dirname,"public"))
app.use(express.static(path.join(__dirname,'public')))

if(cluster.isWorker){
    bot.hears(/versi(o|ó)n/i,(ctx)=>{
        exec("git show HEAD",(error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stdout) {
                let commit = parseHeadAttrib(stdout,"commit");
                let author = parseHeadAttrib(stdout,"author");
                let date = parseHeadAttrib(stdout,"date");
                let versn ={date,commit,author}
                ctx.reply(formatJson(versn))
            }
        });
    })
    bot.hears(/update/i, (ctx) => {
        exec("git pull;npm install",(error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                console.log("exit the old version");
                ctx.reply("updated").then(e=>{
                    process.exit();
                });
                return;
            }
            if (stdout && stdout.match(/Updating/i)) {
                console.log(`stdout: ${stdout}`);
                console.log("exit the old version");
                ctx.reply("updated").then(e=>{
                    process.exit();
                });
                return;
            }
            console.log(`stdout: ${stdout}`);
            ctx.reply("already updated")
        });
        
    })
    bot.hears(/addlink/i,(ctx)=>{
        let rlink = ctx.match.input.replace(/addlink/i,"").trim();
        if(checkurl(rlink)){
            appendToFile(urlfilepath,rlink);
            ctx.reply("added")
        }
        
    })
    bot.hears(/givemecontext/i,(ctx)=>{
            ctx.reply(JSON.stringify(ctx.chat))
    })
    bot.hears(/givemethelink/i,async(ctx)=>{
        let ip = await getPublicLink()
            ctx.reply(ip)
    })
    /////////specific code////////
    cron.schedule('*/5 * * * *', () => {
        notify(link);
    });
    ///////end specific code//////
    bot.on(message("document"),(ctx)=>{
        let document = ctx.update.message.document;
        ctx.telegram.getFileLink(document.file_id).then(url => {    
            axios({url, responseType: 'stream'}).then(response => {
                return new Promise((resolve, reject) => {
                    response.data.pipe(fs.createWriteStream(`${__dirname}/files/${document.file_name}`))
                                .on('finish', () => {
                                    console.log("saved");
                                    ctx.reply("saved")
                                    resolve(true)
                            })
                                .on('error', e =>{ 
                                    console.log(e);
                                    reject(false)
                                })
                        });
                    })
        }) 
    });
    bot.launch()
    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))

    app.listen(port);
    console.log('Server started at http://localhost:' + port);
}
if(cluster.isPrimary){
    cluster.fork();
    cluster.on('exit', function(worker, code, signal) {
        cluster.fork({currentepisodes:JSON.stringify(episodes)});
    });
}
