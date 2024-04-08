require("dotenv").config()
const {exec} = require("child_process")
const cluster = require("cluster")
const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const axios = require("axios")
const fs = require("fs")
const path = require("path")
const express = require('express');
const {HtmlElement} = require("./htmlElement");
const URL = require("url").URL;
const URLparse = require("url").parse;
const https = require("https")

const app = express();
const port = process.env.PORT || 80;

const urlfilepath=path.join(__dirname,"links.txt")
const jsondataname="jsondata.json"

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

getLinks =async()=>{
  let rawlinks = fs.readFileSync(urlfilepath,{encoding:"utf-8"}).split(/\r\n|\n/).filter(l=>l.trim()!="")
  let s=await Promise.all(rawlinks.map(async rl=>{
    let img=new HtmlElement("img")
    img.src= await getCover(rl)

    let card=new HtmlElement("div")
    card.setClass("card")
    let divimg=new HtmlElement("div")
    divimg.setClass("image")
    let divtit=new HtmlElement("div")
    divtit.setClass("title")
    let divdesc=new HtmlElement("div")
    divdesc.setClass("descript")

    divimg.innerHtml=[img]

    let a=new HtmlElement("a")
    a.href=rl

    let n=rl.match(/\/(\w|\_|\-)+$/g)
    divtit.innerHtml=(n && n[0])?n[0].replace(/\//g,"").replace(/\_|\-/g," "):`[${rl}]`

    card.innerHtml=[divimg,divtit,divdesc]

    a.innerHtml=[card]
    
    return `${a.toString()}\n`
  }))
  return s.join("")
}

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
            return new Promise((resolve,reject)=>{
                https.get(link, (res) => {
                let rawHtml = '';
                res.on('data', (chunk) => { rawHtml += chunk; });
                res.on('end', () => {
                        try {
                        let cover = rawHtml.match(/\/uploads\/animes\/covers\/\w+\.jpg/)[0];
                        resolve(`https://m.animeflv.net/${cover}`)
                        } catch (e) {
                            reject(e.message);
                        }
                    });
                });
            })
        }},
        {match:/monoschinos2\.com/i, finder:async(link)=>{
            return new Promise((resolve,reject)=>{
                https.get(link, (res) => {
                let rawHtml = '';
                res.on('data', (chunk) => { rawHtml += chunk; });
                res.on('end', () => {
                        try {
                        let cover = rawHtml.match(/(?<=<div class="chapterpic">[\S,\s]*<img src=")(.*)\.jpg/g)[0];
                        resolve(`${cover}`)
                        } catch (e) {
                            reject(e.message);
                        }
                    });
                });
            })
        }}
    ]
    let strat = strategies.filter(stra=>link.match(stra.match))
    if(strat.length>0){
        return strat[0].finder(link)
    }
}

//getCover("https://m.animeflv.net/anime/tensei-kizoku-no-isekai-boukenroku-jichou-wo-shiranai-kamigami-no-shito")

var links = getLinks()

// sendFile will go here
app.get('/', async function(req, res) {
  links = await getLinks()
  //res.sendFile(path.join(__dirname, '/index.html'));
  let page= render(fs.readFileSync(path.join(__dirname,"index.html"),{encoding:"utf-8"}),{test:"elemento de prueba",links})
  res.send(page)
});

const bot = new Telegraf(process.env.telegramToken)

const createDir=(dir)=>{
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir)
    }
}

createDir(path.join(__dirname,"files"));

appendToFile=(filepath,dat)=>{
    if(fs.existsSync(filepath)){
        let rawtxt = fs.readFileSync(filepath,{encoding:"utf-8"})
        fs.writeFileSync(filepath,`${rawtxt}\n${dat}`,{encoding:"utf-8"})
    }else{
        fs.writeFileSync(filepath,dat,{encoding:"utf-8"})
    }
}

formatJson = (json) =>{
    let count=0;

    return JSON.stringify(json).replace(/{|}|"(\\"|[^"])*"(:|,)?/g,e=>{
    if(e=="}")count--; 
    let pad = [...Array(count).keys()].map(e=>"   ").join("")
    if(e=="{")count++; 
    return pad+e+"\n"}).replace(/(?<=:)\n\s*(?=({|"(\\"|[^"])*"|(\d+)))/g," ")

}

parseHeadAttrib=(str,attr)=>{
    let info = str.split("\n");
    let reg = RegExp(attr+":?","i")
    let attrM = info.filter(l=>l.match(reg))
    return attrM && attrM.length>0 ?attrM[0].replace(reg,"").trim():"no set";
}

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
        exec("git pull",(error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                console.log("exit the old version")
                ctx.reply("updated")
                process.exit();

            }
            if (stdout && stdout.match(/Updating/i)) {
                console.log(`stdout: ${stdout}`);
                console.log("exit the old version")
                ctx.reply("updated")
                process.exit();

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
    bot.on(message("document"),(ctx)=>{
        let document = ctx.update.message.document;
        ctx.telegram.getFileLink(document.file_id).then(url => {    
            axios({url, responseType: 'stream'}).then(response => {
                return new Promise((resolve, reject) => {
                    response.data.pipe(fs.createWriteStream(`${__dirname}/files/${document.file_name}`))
                                .on('finish', () => {
                                    console.log("saved");
                                    ctx.reply("saved")
                            })
                                .on('error', e => console.log(e))
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
if(cluster.isMaster){
    cluster.fork();
    cluster.on('exit', function(worker, code, signal) {
        cluster.fork();
    });
}