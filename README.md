# epz-crypto-hide-net-v1
v1版本，还有很多地方需要改进。
隐藏 EPZ 格式文件到其他文件格式（比如MP3或者PNG）
可以设置密码
# 格式
EPZ？ 魔法数字 4字节
EPZ HEAD   4字节  告诉文件信息长度a
EPZ INFO  a字节 告诉文件信息
EPZ CONTENT 不定 b字节
详细见 [https://github.com/axutebils74/EPZ](https://github.com/axutebils74/EPZ)
....
# 寻址信息
[0x16,0x45,0x42,0x35] 魔法数字 4字节
[.........]  告诉EPZ在文件中的位置  4字节
[.........]  告诉EPZ文件的大小 4字节
[.........] 告诉EPZ文件的加密方式k1 1字节
[.........] 对前9字节进行CRC校验 4字节
固定 17字节

# 加密方式k1

高四位暂时没用到 固定 0000

低2位
00 不加密
01 使用xor1算法
10 使用xor2算法
11 使用xor3算法

第3位用于判断是否对文件信息进行加密
第4位用于判断是否使用多密码格式

# xor 算法及安全性
## 单密码格式
密码等于 sha-512 (UTF-8文本)
xor3 算法截取前32位
### xor1 算法
类似于RPG加密前16位，该算法将密码与文件信息异或64位
不安全，但可以防文件提取
不增加格外数据
解密速度非常快
### xor2 算法
使用异或密码进行异或整个文件
```javascript
var xor = function (a, buf) {
    for (var i = 0, j = 0; j < buf.length; j++) {
        buf[j] ^= a[i++];
        if (i == a.length) i = 0;
    }
};
```
不安全，除了可以防文件提取，还可以防文件信息检测。
不增加格外数据
解密速度很快
### xor3 算法
使用Daniel J. Bernstein大神的算法，应该是很安全的。[stream_xor](https://github.com/dchest/tweetnacl-js/blob/master/nacl-fast.js#L454)
每个文件大小增加了 24 字节 ，其实感觉可以不增加的，感觉随机数可以按照文件编号递增或者取个hash。下一版 v2进行改进格式
不过3000个文件只格外增加 71kb
解密速度快
**增加的 24 字节放在头部，只是24字节的随机数**
## 多密码格式
你可以生成两个或者多个密码，一个为你熟悉的密码，其他为很长的密码用于分享。当你忘记很长的密码时，可以通过熟悉的密码解压。

密码 等于随机生成个 32 字节
如果使用加密算法为 xor1 或者 xor2 算法 密码等于sha-512(密码)

密码形式
1字节 密码的个数m，最多放 255 个密码
64字节 使用auth来判断是否密码正确
m * (24 + 32) 字节 
使用 xor3 解密密码 后由auth(密码) 判断是否正确

## auth 算法
```javascript
function auth(x){
    var a = new Uint8Array(32);
    for(var i = 0;i < x.length;i++) a[i]^=x[i];
    for(var i = 0;i < 16;i++) a[i]^=0x36
    for(var i = 16;i < 32;i++) a[i]^=0x5c
    return hash512(a);
}
```
感觉 auth 可以只用 16 位，密码校验可以更少，下一版本v2版本改进算法

# 关于大小限制 v1格式
可以生成多个这种文件，需要手动添加，比较麻烦。然后生成一个JSON文件关于每个文件位置的和相关的请求地址，类似于
{
 algo:0,
 "address":["https://example.com/1.png","https://example.com/2.png","https://example.com/3.png"],
 "content":{
 	"index.html":0,
	"data/1.js":0,
	"data/2.js":1,
	"data/1.txt":1,
	"data/3.png":2
 },
 password:["123","","456"]
}
# address
地址
# content 
内容和EPZ格式差不多，只不过一个是二进制，一个是字符串
# algo 
算法
algo 0 和EPZ一样
algo 1 使用sha512 变成128长度的字符串
algo 2 使用sha512 并截取16位 变成32长度的字符串
# password
密码 
如果echnv1设置了密码，则必须提供
或者使用如下JSON
{
“algo”:0
 "info":[{
 	offset:10,
	size:65536,
 	url:"https://example.com/1.png",
 	enc:0
 },{
  	offset:100,
	size:4312,
 	url:"https://example.com/1.png",
 	enc:3,
	password:"16384"
 }],
  "content":{
 	"index.html":0,
	"data/1.js":0,
	"data/2.js":1,
	"data/1.png":1,
 }
}
info 为文件的EPZ的偏移位置
其中的enc是加密方式k1
下一版本v2会改
# 关于寻址信息和EPZ格式位置
EPZ 位置和寻址位置 不必是连续的可以是分开的
一般来说将EPZ位置后放寻址信息

在检测中一般从文件末尾向后检查16384字节
向文件首部检查1024字节
如果没有发现 [0x16,0x45,0x42,0x35] 则认为是不正确的格式
你可以设置首部检查或者末尾的大小，或者不进行末尾检查,但是不太建议
# 引用
### LZMA
[https://github.com/axutebils74/lz](https://github.com/axutebils74/lz)
### MD5
[https://github.com/emn178/js-md5](https://github.com/emn178/js-md5)
### LZString
[https://github.com/pieroxy/lz-string/](https://github.com/pieroxy/lz-string/)
### LZ4JS
[https://github.com/Benzinga/lz4js/](https://github.com/Benzinga/lz4js/)
### JSZIP
[https://github.com/Stuk/jszip](https://github.com/Stuk/jszip)
### TWEETNACL
[https://github.com/dchest/tweetnacl-js](https://github.com/dchest/tweetnacl-js)