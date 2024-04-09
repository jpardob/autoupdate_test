const {getHTML} = require("./web.js")
var cron = require('node-cron');

const link="https://m.animeflv.net";

var episodes = [];

getHTML(link).then(e=>{
    let epi = e.match(/<a href="\/ver\/.*>/g).map(e=>link+e.match(/".*"/g)[0].replace(/"/g,""))
    if (episodes.length==0){
        episodes=epi
    }else{
        let newepis = episodes.filter(e=>!epi.includes(e))
        if(newepis.length>0){
            episodes=epi
            console.log(newepis)
        }
    }
})

cron.schedule('10 * * * *', () => {
    getHTML(link);
});