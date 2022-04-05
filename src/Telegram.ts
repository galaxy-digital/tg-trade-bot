require("dotenv").config()
const isDev = process.env.NODE_ENV==="development"
import * as express from 'express'
import { Filter, ObjectId } from 'mongodb'
import * as fs from 'fs'
import axios from 'axios'
import { setlog } from './helper'
import { Config, getOrCreateUser, Posts, Users } from './Model'
/* import jieba, { cut } from 'jieba-js'; */
// const cut = require("jieba-js").cut
// const jieba = require("jieba-js");
const router = express.Router()

const now = () => Math.round(new Date().getTime()/1000)

const apiUrl = isDev ? 'https://api.telegram.org' : 'https://api.telegram.org'
const botKey = (isDev ? process.env.DEV_BOT_KEY : process.env.BOT_KEY) || ''
const botName = (isDev ? process.env.DEV_BOT_NAME : process.env.BOT_NAME) || ''


router.post("/set-webhook", async (req:express.Request, res:express.Response)=>{
	try {
		const { url } = req.body
		const response = await axios.post(`${apiUrl}/bot${botKey}/setWebhook`, { url: url + "/api/telegram/webhook" })
		res.json(response.data)
	} catch (error) {
		res.json(error)
	}
})

router.post("/webhook", (req:express.Request, res:express.Response)=>{
	parseMessage(req.body)
	res.status(200).send('')
})

export const initTelegram = async () => {

}
const replyBot = async (api:string, json:any) => {
	// let url = `${apiUrl}/bot${botKey}/${api}`
	// let options = { url, method: "POST", headers: {'Content-Type': 'application/json'}, json };
	try {
		const response = await axios.post(`${apiUrl}/bot${botKey}/${api}`, json)
		if (response.data) {
			console.log(response.data)
		}
		return true
	} catch (error) {
		console.error(error)
	}
	return false
}

const api = {
	channel: (text:string) => {
		if(process.env.TELEGRAMCHANNEL) {
			api.send({
				chat_id:process.env.TELEGRAMCHANNEL,
				text,
				parse_mode:'html',
				disable_web_page_preview:true
			})
		}
	},
	none: (chat_id:string|number)=>{
		api.send({
			chat_id,
			text:`由于部分商品失效或自动发货链接失效 下单交易请 @${process.env.TELEGRAMADMIN} 检索发送文字给机器人（机器人只是搜索 登录暗网交易）`,
			parse_mode:'html',
			disable_web_page_preview:true
		})
	},
	remove: (json:any) => replyBot('deleteMessage',json),
	send: (json:any) => replyBot('sendMessage',json),
	edit: (json:any) => replyBot('editMessageText',json),
	forward: (json:any) => replyBot('forwardMessage',json),
	answer: (callback_query_id:number, text:string) => replyBot('answerCallbackQuery',{callback_query_id,text,show_alert:true}),
}

const parseMessage = async (body:any):Promise<boolean> => {
	try {
		if (body.message!==undefined)  {
			const { message_id, from, chat, date, forward_from, left_chat_member, text } = body.message
			const valid = text!==undefined && forward_from===undefined
			if (valid) {
				await findPosts(text, chat.id, message_id, 0, 0)
			}
		} else if (body.channel_post!==undefined)  {

		} else if (body.my_chat_member!==undefined)  {

		} else if (body.callback_query!==undefined)  {

		}
		return true
	} catch (error) {
		setlog("parseCommand", error)
		/* await replyMessage(null, replyToken, ERROR_UNKNOWN_ERROR) */
	}
	return false
}

const findPosts = async (query:string, chat_id:number, message_id:number, page?:number, count?:number)=>{
	try {
		const keywords = [ query ] //await jieba.cut(query)
		const where = { $or:[] } as any
		if (keywords.length) {
			for (let i of keywords) {
				where.$or.push({ title: {$regexp: new RegExp(i)} })
			}
		}
		if (where.$or.length>5) where.$or = where.$or.slice(0,5)
		
		if ( count===0 ) count = Number(await Posts.count(where))
		const limit = 20
		let total = 0
		if (count) {
			total = Math.ceil(count / limit)
			if ( page >= total ) page = total - 1
			if ( page < 0 ) page = 0
			const rows = await Posts.find(where).sort({ created:-1 }).skip(page * limit).limit(limit).toArray()

			const lists = [] as string[]
			const cmds = [] as Array<{ text:string, url?:string, callback_data?:string }>
			for(let i of rows) {
				lists.push(`<a href="https://t.me/${ botName }?start=${ i._id }">🎁${ i.title }</a>`)
			}
			let json = { chat_id, text:lists.join('\r\n'), parse_mode:'html', disable_web_page_preview:true } as any
			if( total==1 ) {
				json.reply_to_message_id = message_id;
			} else {
				json.message_id = message_id;
				if ( page > 0 ) 	cmds.push({ text: "⬅️上翻", callback_data: [ 'find', query, count, page ].join('-') });
				if ( page < total ) cmds.push({ text: "下翻➡",  callback_data: [ 'find', query, count, page + 2 ].join('-') });
			}
			json.reply_markup={
				resize_keyboard: true,
				one_time_keyboard: false,
				force_reply: true,
				inline_keyboard:[
					cmds,
					[{ text: "查看电报账户", url: `https://t.me/${ botName }?start=profile` }]
				]
			}
			if (page===0) {
				api.send(json)
			} else {
				api.edit(json)
			}
		}
	} catch (error) {
		setlog('find', error);
	}
}

const showPost = async (chat_id:number, message_id:number, callback_query_id:number, token:string)=>{
	try {
		let row = await Posts.findOne({ _id: new ObjectId(token), status:100 });
		if ( row!==null ) {
			let lists = [] as string[]
			let re = /(<([^>]+)>)/ig
			lists.push( '🎁' + row.title.replace(re, '') )
			lists.push( row.contents.replace(re, '').replace(/\r\n\r\n/g, '\r\n').replace(/\r\n\r\n/g, '\r\n').replace(/\r\n\r\n/g, '\r\n') )
			lists.push(`价格: US$ ${row.price}`)
			
			let inline_keyboard=[];
			inline_keyboard.push([{ text: "购买", callback_data: ['buy', token].join('-')}])
			inline_keyboard.push([{ text: "↩️ 返回个人中心", callback_data: "profile" }])
			let json = {
				chat_id,
				text: lists.join('\r\n'),
				parse_mode:'html',
				disable_web_page_preview:true,
				reply_markup:{
					resize_keyboard: true,
					one_time_keyboard: false,
					force_reply: true,
					inline_keyboard
				}
			}
			api.send(json)
		}else{
			let json={
				chat_id,
				text:'💡 对不起，没找到发布详情，已下架❌',
				parse_mode:'html',
				disable_web_page_preview:true
			};
			api.send(json)
		}
	} catch (error) {
		setlog('telegram-view', error);
	}
}

export default router