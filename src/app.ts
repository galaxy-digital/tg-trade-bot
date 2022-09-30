require("dotenv").config();

import * as http from 'http';
import * as express from 'express';
import * as cors from 'cors'

import Api, {initTelegram} from './bot'
import Crawling from './Crawling'
import {setlog} from './helper';
import Model from './Model'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const port = Number(process.env.HTTP_PORT || 80)

process.on("uncaughtException", (error) => setlog('exception', error));
process.on("unhandledRejection", (error) => setlog('rejection', error));

Date.now = () => Math.round((new Date().getTime()) / 1000);

Model.connect().then(async ()=>{
	try {
		await initTelegram();
		const app = express()
		const server = http.createServer(app);
		app.use(cors({
			origin: function(origin, callback){
				return callback(null, true)
			}
		}))
		
		
		app.use(express.urlencoded()) // {limit: '200mb'}
		app.use(express.json())

		app.get('/', (req,res) => {
			res.send(`this is hua's website`)
		})

		app.use('/api/crawling', Crawling);
		app.use('/api/telegram', Api);
		/* app.use(express.static(__dirname + '/../images')) */
		app.get('*', (req,res) => {
			res.status(404).send('')
		})
		let time = +new Date()
		await new Promise(resolve=>server.listen({ port, host:'0.0.0.0' }, ()=>resolve(true)))
		setlog(`Started HTTP service on port ${port}. ${+new Date()-time}ms`)
	} catch (error) {
		setlog("init", error)
		process.exit(1)
	}
})