const https=require("https");

const getHTML=async (link)=>{
    return new Promise((resolve,reject)=>{
        https.get(link, (res) => {
            let rawHtml = '';
            res.on('data', (chunk) => { rawHtml += chunk; });
            res.on('end', () => {
                    try {
                    resolve(rawHtml)
                    } catch (e) {
                        reject(e.message);
                    }
                });
        });
    });
}


module.exports={
    getHTML
}