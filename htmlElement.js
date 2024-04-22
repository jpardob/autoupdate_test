class HtmlElement{
    href;
    src;
    id;
    class=[];
    type;
    innerHtml;
    constructor(type){
        this.type=type;
    }
    keyText(key,val){
        if(val instanceof Array){
            val = val.filter(k=>k&&k.trim()!="")
            return (val.length>0)?` ${key}="${val.join(" ")}"`:""
        }
        return (val&&val.toString().trim()!="")?` ${key}="${val}"`:""
    }
    getText(){
        return this.innerHtml.toString()
    }
    getClass(){
        return this.class
    }
    setClass(...classes){
        this.class=classes;
    }
    toString(){
        return `<${this.type}${this.keyText("id",this.id)}${this.keyText("href",this.href)}${this.keyText("src",this.src)}${this.keyText("class",this.class)}>${this.innerHtml?(this.innerHtml instanceof(Array))?this.innerHtml.join("\n"):this.innerHtml:""}</${this.type}>`
    }
};
module.exports={
    HtmlElement
}