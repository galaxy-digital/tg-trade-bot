declare interface SchemaConfig {
	key: 			string
	value: 			string
}

/* declare interface SchemaCrawlClasses {
	id: 			number
	uid: 			number
	title: 			string
	contents: 		string
	result: 		string
	price:			number
	sales:			number
	updated:		number
	created:		number
} */

declare interface SchemaUsers {
	id: 			number
	username: 		string
	displayName: 	string
	balance:		number
	updated:		number
	created:		number
}

declare interface SchemaPosts {
	id: 			number
	pid: 			number
	uid: 			number
	username: 		string
	title: 			string
	contents: 		string
	result: 		string
	price:			number
	sales:			number
	status:			number
	updated:		number
	created:		number
}


declare interface SchemaFile {
	length: 			number
	chunkSize: 			number
	uploadDate: 		string
	filename: 			string
	metadata: 			{
		id: 			string
	}
}
declare interface  UploadFileType {
	id:				string
	name:			string
	size:			number
}

declare interface FindPostType {
	id: 			number
	title: 			string
}