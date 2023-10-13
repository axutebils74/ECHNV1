var config = {

}
function utf8encode(str){
    return new TextEncoder().encode(str);
}
function xor1(u8,pwd){
    var len = Math.min(u8.length,pwd.length);
    for (var i = 0;i < len; i++) {
        u8[i] ^= pwd[i];
    }
    return u8
}
function xor2(u8,pwd){
    for (var i = 0, j = 0; j < u8.length; j++) {
        u8[j] ^= pwd[i++];
        if (i == pwd.length) i = 0;
    }
    return u8
}
function xor3d(u8,pwd){
    var nonce = u8.subarray(0,24);
    var data = u8.subarray(24);
    nacl.lowlevel.crypto_stream_xor(data,0,data,0,data.length,nonce,pwd);
    return data
}
function xor3e(data,pwd){
    var nonce = nacl.randomBytes(24);
    nacl.lowlevel.crypto_stream_xor(data,0,data,0,data.length,nonce,pwd);
    var t = new Uint8Array(data.length + 24);
    t.set(nonce)
    t.set(data,24);
    return t;
}
function auth(x){
    var a = new Uint8Array(32);
    for(var i = 0;i < x.length;i++) a[i]^=x[i];
    for(var i = 0;i < 16;i++) a[i]^=0x36
    for(var i = 16;i < 32;i++) a[i]^=0x5c
    return nacl.hash(a);
}
function getKey(str){
    if(config.allowPlain){
        return [...new Set(str.split("\n"))];
    }else{
        return [...new Set(str.split("\n").filter(function(v){ return v!=""}))]
    }
}
function keyTable(str){
    var pwds = getKey(str);
    if(pwds.length == 0 || pwds.length > 256){
        div.innerHTML = "请输入密码，换行为分界符，不能超过255个";
        throw new Error("请输入密码，换行为分界符，不能超过255个");
    } 
    var t = new Uint8Array(1 + 64 + 56 * pwds.length);
    t[0] = pwds.length;
    var sk = nacl.randomBytes(32);
    config.sk = new Uint8Array(sk);
    config.key = nacl.hash(sk);
    var verify = auth(sk);
    t.set(verify,1);
    for(var i=65,j = 0;j<pwds.length;i+=56,j++){
        t.set(xor3e(new Uint8Array(sk),nacl.hash(utf8encode(pwds[j]))),i);
    }
    config.table = t;
}
function singleKey(str){
    var pwd = getKey(str)[0];
    if(!pwd){
        div.innerHTML = "请输入密码,不需要换行";
        throw new Error("请输入密码,不需要换行");
    } 
    config.key = nacl.hash(utf8encode(pwd))
    config.sk = config.key.subarray(0,32);
}


function encodeA(data){
    if(config.enc == 0) return data;
    if(config.enc == 1) return xor1(data,config.key)  
    if(config.enc == 2) return xor2(data,config.key)
    if(config.enc == 3) return xor3e(data,config.sk)
}
function decodeA(data){
    if(config.enc == 0) return data;
    if(config.enc == 1) return xor1(data,config.key)  
    if(config.enc == 2) return xor2(data,config.key)
    if(config.enc == 3) return xor3d(data,config.sk)
}