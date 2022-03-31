require("dotenv").config()
const isDev = process.env.NODE_ENV==="development"
import * as express from 'express'
import * as fs from 'fs'
import axios from 'axios'
import { setlog } from './helper'
import { Config, getOrCreateUser, Users } from './Model'
const router = express.Router()

const now = () => Math.round(new Date().getTime()/1000)

const apiUrl = isDev ? 'https://api.telegram.org' : 'https://api.telegram.org'
const botKey = (isDev ? process.env.DEV_BOT_KEY : process.env.BOT_KEY) || ''

export const initTelegram = async () => {

}

export const replyMessage = (uid:number|null, replyToken:string, message:string) => {
	
}

export const pushMessage = (chatId:string, text:string) => {
	
}

export const replyImage = async (replyToken:string, uri:string) => {
	
}

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
	try {
		// fs.appendFileSync(__dirname + '/../response.json', JSON.stringify(req.body, null, '\t') + '\r\n\r\n')
		if (req.body.message!==undefined)  {
			parseMessage(req.body.message)
		} else if (req.body.channel_post!==undefined)  {
		} else if (req.body.my_chat_member!==undefined)  {
		}
	} catch (error) {
		setlog('webhook', error)
	}
	res.status(200).send('')
})

const parseMessage = async (message:any):Promise<boolean> => {
	try {
		const { from, chat, date, forward_from, left_chat_member, text } = message

		const valid = from!==undefined && chat!==undefined && text!==undefined && forward_from===undefined

		if (valid) {
			
		}



		// if (groupId!=='') await insertGroupId(groupId)
		// const user = await getOrCreateUser(userId)
		// const uid = user.id
		
		/* switch (cmd) {
		case GuestCommands.cancel:
			{
				const _round = await checkRound(uid, replyToken)
				if (!_round) return false
				const rows = await Bettings.find({ uid }).toArray()
				if (rows && rows.length) {
					let total = 0
					for (let i of rows) {
						total += i.amount
					}
					await Bettings.deleteMany({ uid })
					await updateUser(userId, { balance:user.balance + total })
					await replyMessage(uid, replyToken, MSG_CANCEL_BET)
				} else {
					await replyMessage(uid, replyToken, ERROR_NOT_BETTED)
				}
			}
			break
		} */
		return true
	} catch (error) {
		setlog("parseCommand", error)
		/* await replyMessage(null, replyToken, ERROR_UNKNOWN_ERROR) */
	}
	return false
}


export default router