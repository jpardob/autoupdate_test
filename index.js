require("dotenv").config()
const {exec} = require("child_process")
const cluster = require("cluster")
const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const axios = require("axios")
const fs = require("fs")

const bot = new Telegraf(process.env.telegramToken)

if(cluster.isWorker){
    bot.hears(/update/i, (ctx) => {
        exec("git pull",(error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                console.log("this is a new version 2")
                process.exit();
                return;
            }
            console.log(`stdout: ${stdout}`);
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