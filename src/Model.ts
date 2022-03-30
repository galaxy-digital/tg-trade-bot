require('dotenv').config()
import { MongoClient } from 'mongodb';
import { setlog } from './helper';
const dbname = process.env.DB_NAME || 'dice'
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db(dbname);

export const Config = 	db.collection<SchemaConfig>('config');
export const Users = 	db.collection<SchemaUsers>('users');

const connect = async () => {
	try {
		await client.connect()
		setlog('connected to MongoDB')
		Config.createIndex( {key: 1}, { unique: true })
		Users.createIndex( {userId: 1}, { unique: true })
		Users.createIndex( {id: 1}, { unique: true })

	} catch (error) {
		console.error('Connection to MongoDB failed', error)
		process.exit()
	}
}


export const getConfig = async (key:string):Promise<string> => {
	const row = await Config.findOne({ key })
	if (row) return row.value
	return ''
}

export const setConfig = async (key:string, value:string) => {
	await Config.updateOne({ key }, { $set:{ key, value } }, { upsert:true })
}

export const getOrCreateUser = async (userId:string) => {
	let row = await Users.findOne({userId})
	if (row===null) {
		/* let id = 1001
		const rows = await Users.aggregate([{$group: {_id: null, max: { $max : "$id" }}}]).toArray();
		if (rows.length>0) id = rows[0].max + 1
		let displayName = ''
		try {
			const profile = await client.getProfile(userId)
			displayName = profile.displayName
			console.log('profile', profile)
		} catch (error) {
			console.log(error)
		}
		const user = {
			id,
			userId,
			displayName,
			balance: 		0,
			updated: 		0,
			created: 		now()
		} as SchemaUsers
		names[id] = displayName
		await Users.insertOne(user)
		return user */
	}
	return row
}

export const updateUser = async (userId:string|number, params:Partial<SchemaUsers>) => {
	if (typeof userId==="string") {
		await Users.updateOne({ userId }, {$set:params})
	} else {
		await Users.updateOne({ id:userId }, {$set:params})
	}
	return true
}

export default { connect };