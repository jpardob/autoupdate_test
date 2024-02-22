require("dotenv").config()
const {exec} = require("child_process")
const cluster = require("cluster")
const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const axios = require("axios")
const fs = require("fs")

const bot = new Telegraf(process.env.telegramToken)

parseHeadAttrib=(str,attr)=>{
    let info = str.split("\n");
    let reg = RegExp(attr+":?","i")
    let attrM = info.filter(l=>l.match(reg))
    return attrM && attrM.length>0 ?attrM[0].replace(reg).trim():"no set";
}

if(cluster.isWorker){
    bot.hears(/versi(o|ó)n/i,(ctx)=>{
        exec("git show HEAD",(error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stdout) {
                let info = stdout.split("\n");
                let commit = parseHeadAttrib("commit");
                let autor = parseHeadAttrib("autor");
                let date = parseHeadAttrib("date");
                let versn ={date,commit,autor}
                ctx.reply(JSON.stringify(versn))
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
    })    
    bot.launch()
    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
}
if(cluster.isMaster){
    cluster.fork();
    cluster.on('exit', function(worker, code, signal) {
        cluster.fork();
    });
}