import { GridFSBucket, MongoClient } from 'mongodb';
import { Readable } from 'stream';
import { setlog } from './helper';
import config from './config.json';

const client = new MongoClient('mongodb://localhost:27017');
const db = client.db(config.database);

export const DConfig = 		db.collection<SchemaConfig>('config');
export const DUsers = 		db.collection<SchemaUser>('users');
export const DPosts = 		db.collection<SchemaPost>('posts');
export const bucketUploads =new GridFSBucket(db, { bucketName: 'uploads' });
const uploadFiles = 		db.collection<SchemaFile>('uploads.files')

/* export const CrawlClasses = db.collection<SchemaCrawlClasses>('crawl_classes'); */

const connect = async () => {
	try {
		await client.connect()
		setlog('connected to MongoDB')
		DConfig.createIndex( {key: 1}, { unique: true })
		DUsers.createIndex( {userId: 1}, { unique: true })
		DUsers.createIndex( {id: 1}, { unique: true })
		DPosts.createIndex( {id: 1}, { unique: true })

	} catch (error) {
		console.error('Connection to MongoDB failed', error)
		process.exit()
	}
}

export const addFile = async (name:string, id:number, buffer:Buffer):Promise<boolean> => {
	return new Promise(resolve=>{
		const readable = new Readable()
		const uploadStream = bucketUploads.openUploadStream(name, {
			chunkSizeBytes: buffer.length,
			metadata: { id }
		})
		readable._read = () => {} // _read is required but you can noop it
		readable.push(buffer)
		readable.push(null)
		readable.pipe(uploadStream)
		uploadStream.on('finish', ()=>resolve(true))
		uploadStream.on('error', (error)=>{
			console.log(error)
			resolve(false)
		})
	})
}

export const queryFiles = async (id:number):Promise<Array<UploadFileType>> => {
	const rows = await uploadFiles.find({"metadata.id":String(id)}).toArray();
	const result = [] as UploadFileType[];
	for (let i of rows) {
		result.push({
			id:		i._id.toHexString(),
			name:	i.filename,
			size:	i.length
		});
	}
	return result;
}

export type KeyType = 'CRAWL_LAST'|'CHANNEL'

export const getConfig = async (key: string):Promise<string> => {
	const row = await DConfig.findOne({ key });
	if (row) return row.value;
	return '';
}

export const setConfig = async (key: string, value:string|number) => {
	await DConfig.updateOne({ key }, { $set:{ key, value:String(value) } }, { upsert:true });
}

// export const getOrCreateUser = async (userId:string) => {
// 	let row = await Users.findOne({userId})
// 	if (row===null) {
// 		/* let id = 1001
// 		const rows = await Users.aggregate([{$group: {_id: null, max: { $max : "$id" }}}]).toArray();
// 		if (rows.length>0) id = rows[0].max + 1
// 		let displayName = ''
// 		try {
// 			const profile = await client.getProfile(userId)
// 			displayName = profile.displayName
// 			console.log('profile', profile)
// 		} catch (error) {
// 			console.log(error)
// 		}
// 		const user = {
// 			id,
// 			userId,
// 			displayName,
// 			balance: 		0,
// 			updated: 		0,
// 			created: 		now()
// 		} as SchemaUser
// 		names[id] = displayName
// 		await Users.insertOne(user)
// 		return user */
// 	}
// 	return row
// }

// export const updateUser = async (userId:string|number, params:Partial<SchemaUser>) => {
// 	if (typeof userId==="string") {
// 		await Users.updateOne({ userId }, {$set:params})
// 	} else {
// 		await Users.updateOne({ id:userId }, {$set:params})
// 	}
// 	return true
// }

export default { connect };