const fs = require('fs')
const https = require('https')
const ProgressBar = require('progress')
const rmdir = require('rmdir')
const unzip = require('unzip2')
const zlib = require('zlib')

const REPO_URL = 'https://github.com/ftctechnh/ftc_app/archive/beta.zip'
const REPO_ZIP_PATH = __dirname + '/ftc_app.zip'
const REPO_PATH = __dirname + '/ftc_app'
const DISPLAY_UPDATE_INTERVAL = 500 //millis

rmdir(REPO_PATH, err => {
	console.log('Making request to ' + REPO_URL)
	https.get(REPO_URL, res => {
		https.get(res.headers.location, res => {
			const length = Number(res.headers['content-length'])
			const bar = new ProgressBar('Downloading repo [:bar] :current/:total (:percent) :etas', {total: length})
			let receivedBytes = 0
			let lastDisplayedBytes = 0
			let lastTime = new Date().getTime()
			res.on('data', chunk => {
				const thisTime = new Date().getTime()
				receivedBytes += chunk.length
				if (receivedBytes === length || thisTime - lastTime > DISPLAY_UPDATE_INTERVAL) {
					bar.tick(receivedBytes - lastDisplayedBytes)
					lastDisplayedBytes = receivedBytes
					lastTime = thisTime
				}
			})
			res.pipe(fs.createWriteStream(REPO_ZIP_PATH)).on('finish', () => {
				console.log('Unzipping repo')
				fs.createReadStream(REPO_ZIP_PATH).pipe(unzip.Extract({path: REPO_PATH})).on('finish', () => {
					console.log('Unzipped')
					fs.unlink(REPO_ZIP_PATH, err => {
						if (err) throw err
					})
				})
			})
		})
	})
})