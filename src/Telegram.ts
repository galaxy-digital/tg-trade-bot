require("dotenv").config()
import * as express from 'express'
import * as fs from 'fs'
import { setlog } from './helper'
import { Config, getOrCreateUser, Users } from './Model'
const router = express.Router()

const now = () => Math.round(new Date().getTime()/1000)



export const initTelegram = async () => {

}

export const replyMessage = (uid:number|null, replyToken:string, message:string) => {
	
}

export const pushMessage = (chatId:string, text:string) => {
	
}

export const replyImage = async (replyToken:string, uri:string) => {
	/* 
	https://api.telegram.org/bot1183414296:AAH6UESAFVW81Bto07BZtFfSAZQcLRnF3tA/setWebhook
	{
		"url": "https://bac27031.ngrok.io/telegram/7zhTchRHHrHHgTxmQMx5tFpuREpVGJ4q"
	}
	Content-Type : application/json 
	*/
}

router.post("/add/webhook", (req:express.Request, res:express.Response)=>{

})

router.post("/webhook", (req:express.Request, res:express.Response)=>{
	fs.appendFileSync(__dirname + '/../response.json', JSON.stringify(req.body, null, '\t') + '\r\n\r\n')
	/* 
	if (req.body.events && req.body.events.length!==0) {
		const event = req.body.events[0]
		const { message, source } = event
		handleWebHook(event, source, message)
	} 
	*/
	res.status(200).send('')
})

const handleWebHook = async ():Promise<boolean> => {
	try {
		
		/* const replyToken = event.replyToken
		const p = message.text.indexOf(' ')
		let cmd = '', params = ''
		if (p===-1) {
			cmd = message.text.trim()
		} else {
			cmd = message.text.slice(0, p).trim()
			params = message.text.slice(p + 1).trim()
		}
		if (isAdmin(source.userId)) {
			const result = await parseAdminCommand(source.groupId || '', replyToken, cmd, params)
			if (result===true) return true
		} */
		// return await parseCommand(source.groupId || '', source.userId, replyToken, cmd, params)
	} catch (error) {
		console.log(error)
	}
	return false
}

const parseAdminCommand = async (groupId:string, replyToken:string, cmd:string, param:string):Promise<boolean> => {
	try {
		/* switch (cmd) {
		case AdminCommands.start:
			{
				if (currentRound.roundId!==0) {
					await replyMessage(0, replyToken, ERROR_ALREADY_STARTED.replace('{roundId}', String(currentRound.roundId)))
					return false
				}
				await startRound()
				await replyMessage(0, replyToken, MSG_STARTED.replace('{roundId}', String(currentRound.roundId)))
			}
			break
		default: 
			return false
		}
		return true */
	} catch (error) {
		setlog("parseAdminCommand", error)
		/* await replyMessage(null, replyToken, ERROR_UNKNOWN_ERROR) */
	}
	return false
}


const parseCommand = async (groupId:string, userId:string, replyToken:string, cmd:string, param:string):Promise<boolean> => {
	try {
		// if (groupId!=='') await insertGroupId(groupId)
		const user = await getOrCreateUser(userId)
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