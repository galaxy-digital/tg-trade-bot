// require("dotenv").config()
// const isDev = process.env.NODE_ENV==="development";
import websocket from 'websocket';
import {v4 as uuidv4} from 'uuid';

import * as express from 'express'
// import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import { setlog } from './helper'
import { addFile, getConfig, DPosts, setConfig, DUsers, DTmpCrawl, DTmpPosts } from './Model'
import Socket from './lib/Socket';
const tor = require('tor-request');
const cheerio = require('cheerio');
const sizeOf = require('image-size');
const sharp = require('sharp');

const router = express.Router();

const now = () => Math.round((new Date().getTime()) / 1000)


const host = 'xxxxxxxxxs6qbnahsbvxbghsnqh4rj6whbyblqtnmetf7vell2fmxmad.onion';
const headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0',
	'Cookie': 'random=1064; PHPSESSID=df9e9phr8rs444v61482e4ms0f; userid=760330'
};

const state = {
	started: false,
	start: 0
}
/*
用户编号: 760330 761125 

用户密码: Ad.on#@$#124  Ad1on#@$#124

*/
const clients = {} as {[key: string]: {con?: websocket.connection, created: number}};

export const initSocket = async (server: any) => {
	Socket(server, Actions)
	setlog("initialized socket server.")
}

export const Actions = {
	onRequest(ip: string, origin: string, wss: string, cookie: string) {
		return clients[cookie]!==undefined;
	},
	onConnect(con: websocket.connection, ip: string, wss: string, cookie: string) {
		clients[cookie].con = con;
		setlog(`connected socket ${cookie}`, '', true);
	},

	onDisconnect(con: websocket.connection, cookie: string) {
		setlog(`deleted socket ${cookie}`, '', true);
	},

	onData(con: websocket.connection, msg: string, ip: string, cookie: string) {
		try {
			const {method, params} = JSON.parse(msg) as {method: string, params?: string[]};
			const isContinue = method==='start';
			const isRestart = method==='restart';
			if ((isContinue || isRestart) && params!==undefined) {
				const [cookie, pid, count] = params as [cookie: string, pid: number, count: number];
				headers.Cookie = cookie;
				state.started = true;
				crawl(isContinue, pid, count);
			} else if (method==='stop') {
				state.started = false;
			}
		} catch (error) {
			setlog('socket-data', error, false)
		}
	}
}

const sendAll = (data: string) => {
	const timestamp = now();
	for (let k in clients) {
		if (timestamp - clients[k].created > 86400) {
			delete clients[k];
			continue;
		}
		if (clients[k].con!==undefined) {
			clients[k].con.send(data);
		}
	}
}

router.get("/console", async (req: express.Request, res: express.Response)=>{
	const cookie = uuidv4();
	clients[cookie] = {created: now()};
	res.render('console', {cookie});
})

// router.post("/start", async (req: express.Request, res: express.Response)=>{
// 	// const { pid, count } = req.body
// 	// pid : 10001 /// data 
// 	const pid = 10001
// 	const count = 342
// 	crawlIndex(pid, count).then(status=>{
// 		status && crawlPosts()
// 	})
// 	res.json({started:true})
// })


const fetchPost = (url:string) => {
	return new Promise(resolve=>{
		tor.request({url, encoding:null, headers}, (err:any, res:any, body:any)=>{
			if(err) {
				console.log(err);
				return resolve(null);
			}
			resolve(body);
		})
	})
}

const crawl = async (isContinue: boolean, pid:number, count:number) => {
	if (!isContinue) {
		await DTmpCrawl.deleteMany({});
		await DTmpPosts.deleteMany({});
	}
	const d = Array(count).fill(0).map((i, k)=>{
		if (isContinue) {
			return {
				updateOne: {
					filter: {_id: k + 1},
					update: {$setOnInsert: {updated: 0}},
					upsert: true
				}
			}
		}
		return {
			updateOne: {
				filter: {_id: k + 1},
				update: {$set: {updated: 0}},
				upsert: true
			}
		}
	})
	const r = await DTmpCrawl.bulkWrite(d)
	await crawlIndex(pid);
	await crawlPosts();
}

const crawlIndex = async (pid:number):Promise<Array<SchemaPost>|false>=>{
	
	try {
		const rows = await DTmpCrawl.find({updated: 0}).toArray();
		if (rows.length) {
			sendAll("开始数据索引...");
			for (let row of rows) {
				const page = row._id
				//ea.php?ea=10009&pagea=45#pagea
				let url = `http://${host}/ea.php?ea=${pid}${page==1 ? '' : '&pagea=' + page + '#pagea'}`
				for (let k = 1; k < 10; k++) {
					if (!state.started) {
						sendAll("用户停止抓取.");
						sendAll(``);
						state.started = false;
						return false;
					}
					let time = +new Date();
					let res=await fetchPost(url);
					if (res) {
						const $ = cheerio.load(res);
						// let lastId = 0
						
						const result = [] as Array<SchemaPost>;
						$('div.length_500').each((i:any, v:any)=>{
							for(let m of v.children) {
								if(m.tagName=='a') {
									let url=m.attribs.href;
									if (url && url.indexOf('viewtopic.php?tid=')===0) {
										let _id = Number(url.slice(18));
										let title=m.firstChild.data.trim();
										result.push({
											_id,
											pid,
											uid: 0,
											username: '',
											title,
											contents: 	'',
											result: 	'',
											price:		0,
											sales:		0,
											status:		false,
											updated:	0,
											created:	0,
										});
									}
									break;
								}
							}
						});
						if (result.length===0) {
							sendAll(`Failed Page ${page}, seems the cookie expired. change cookie and try again.`);
							sendAll(``);
							return false;
						}
						await DTmpPosts.bulkWrite(result.map(i=>({
							updateOne: {
								filter: {_id: i._id},
								update: {$set: i},
								upsert: true
							}
						})));
						await DTmpCrawl.updateOne({_id: page}, {$set: {updated: now()}});
						sendAll(`Page ${page} record count ${result.length} spent ${+new Date() - time}ms`);
						
						
						state.start = k;
						break;
					} else {
						sendAll(`在 ${page} 页爬网失败 - 重试 ${k}次`);
						await new Promise(resolve=>setTimeout(resolve,100));
					}
				}
			}
			sendAll("完成数据索引.");
		} else {
			sendAll("数据索引已经完成.");
		}
		
	} catch (error) {
		sendAll(`数据索引中未知错误 ${error.message}`);
	}
	return false
}

const crawlPosts = async () => {
	try {
		const rows = await DTmpPosts.find({status: false}).toArray();
		sendAll("开始获取数据详情...");
		for (let i of rows) {
			let time=+new Date();
			let res: any;
			for (let k = 1; k <= 10; k++) {
				if (!state.started) {
					sendAll("用户停止抓取.");
					state.started = false;
					sendAll(``);
					return false;
				}
				res=await fetchPost(`http://${host}/viewtopic.php?tid=${i._id}`);
				if(res) break;
				sendAll(`数据 #${i._id}号 获取失败，重试 ${k+1}次`);
			}
			if(!res) {
				sendAll(`数据 #${i._id}号 获取失败`);
				continue;
			}
			const $=cheerio.load(res);
			let vtr=$('table.v_table_1 tr');
			let tr=vtr[2];
			if(tr) {
				const price = Number(tr.childNodes[3].childNodes[0].firstChild.data);
				const created = Math.round(new Date(tr.childNodes[5].firstChild.data+':00').getTime() / 1000);
				tr = vtr[4];
				const username = tr.childNodes[1].firstChild.data;
				const uid = Number(username);
				
				let lastonline = tr.childNodes[5].firstChild.data;
				if (lastonline=='1970-01-01 08:00') {
					lastonline = null;
				}else{
					lastonline += ':00';
				}
				tr=vtr[6];
				const sales = Number(tr.childNodes[3].firstChild.data);
				let t = $('t').text();
				let r = $('r').text();
				const contents = (t || r).trim();
				/* let imgs = 0; */
				// let is = $('img.attach_image');
				// let c = is.length>2?2:is.length;
				// if (is.length) {
				// 	for(let k = 0; k < c; k++) {
				// 		let v = is[k];
				// 		let name = v.attribs.alt;
				// 		let src = v.attribs.src;
				// 		let buf = null as any;
				// 		let id = i._id*100
				// 		for (let k = 0; k < 10; k++) {
				// 			buf = await fetchPost(src);
				// 			if (!buf) {
				// 				console.log('craw-xx', `page ${i._id} image retry ${k+1}`);
				// 			} else break;
				// 		}
				// 		if (buf) {
				// 			try {
				// 				let filepath = path.normalize(__dirname + '/../files');
				// 				let filename = filepath + '/' + id + '.img';
				// 				if (fs.existsSync(filename)) fs.unlinkSync(filename);
				// 				fs.writeFileSync(filename, buf);
				// 				let dims = sizeOf(filename);
				// 				let w=dims.width,h=dims.height;
				// 				let rx=w/800;
				// 				let ry=h/600;
				// 				if(rx>1 || ry>1) {
				// 					if(rx>ry) {
				// 						w=800; h=Math.round(h/rx);
				// 					}else{
				// 						w=Math.round(w/ry); h=600;
				// 					}
				// 				}
				// 				let tmpfile = filename+'.webp';
				// 				if (fs.existsSync(tmpfile)) fs.unlinkSync(tmpfile);
				// 				await sharp(filename).resize(w,h).toFile(tmpfile);
				// 				fs.unlinkSync(filename);
				// 				if (fs.existsSync(tmpfile)) {
				// 					await addFile(name, id, fs.readFileSync(tmpfile))
				// 					fs.unlinkSync(tmpfile);
				// 				}
				// 			} catch (error) {
				// 				console.log(error);
				// 			}
				// 		}
				// 	}
				// }
				// await DPosts.bulkWrite(items.map(i=>({
				// 	updateOne: {
				// 		filter: {_id: i._id},
				// 		update: {
				// 			$set: {
				// 				pid:		i.pid,
				// 				uid: 		i.uid,
				// 				username: 	i.username,
				// 				title:		i.title,
				// 				contents: 	i.contents,
				// 				result: 	i.result,
				// 				price:		i.price,
				// 				status:		true,
				// 				updated,
				// 			},
				// 			$setOnInsert: {
				// 				sales:		i.sales,
				// 				created:	i.created,
				// 			}
				// 		},
				// 		upsert: true
				// 	}
				// })));
				if (!!contents && !!price && !!uid && !!created) {
					await DTmpPosts.updateOne({
						_id: i._id
					}, {
						$set: {
							contents,
							price,
							uid,
							username,
							sales,
							status: true,
							updated: created,
							created
						}
					});
					sendAll(`数据 #${i._id}号 获取成功 ${+new Date() - time}ms`);
				} else {
					sendAll(`数据 #${i._id}号 是空的 ${+new Date() - time}ms`);
				}
			}else{
				sendAll(`数据 #${i._id}号 是空的 ${+new Date() - time}ms`);
			}
		}
		
		let time=+new Date();
		const items = await DTmpPosts.find({status: true}).toArray();
		const data = items.filter(i=>!!i.contents && !!i.price && i.created > 86400);
		if (data.length!==0) {
			const updated = now();
			const users = {} as {[uid: number]: number};
			for (let i of data) users[i.uid] = i.created - 86400;
	
			await DUsers.bulkWrite(Object.keys(users).map(id=>({
				updateOne: {
					filter: {_id: Number(id)},
					update: {
						$set: {
							username: 		id,
							fullname: 		'',
							updated
						},
						$setOnInsert: {
							balance:		0,
							created:		users[id]
						}
					},
					upsert: true
				}
			})));
			await DPosts.bulkWrite(rows.map(i=>({
				updateOne: {
					filter: {_id: i._id},
					update: {
						$set: {
							pid:		i.pid,
							uid: 		i.uid,
							username: 	i.username,
							title:		i.title,
							contents: 	i.contents,
							price:		i.price,
							status:		i.status,
							updated,
						},
						$setOnInsert: {
							sales:		i.sales,
							created:	i.created,
						}
					},
					upsert: true
				}
			})));
		}
		sendAll(`爬虫成功 - 写入数据 数量 ${items.length} - ${+new Date() - time}ms`);
		sendAll(``);
	} catch (error) {
		sendAll(`获取数据中未知错误 ${error.message}`);
	}
}

export default router