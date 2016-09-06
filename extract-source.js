const fernflower = require('fernflower')
const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')
const rmdir = require('rmdir')
const Simultaneity = require(__dirname + '/lib/simultaneity.js')
const unzip = require('unzip2')

const LIBRARY_PREFIX = __dirname + '/ftc_app/ftc_app-beta/libs/'
const LIBRARIES = ['FtcCommon', 'Hardware', 'RobotCore']
const COMPILED_LIBARIES = ['FtcCommon', 'Hardware', 'ModernRobotics', 'RobotCore', 'WirelessP2p']
const LIBRARY_SUFFIX = '-release-sources.jar'
const COMPILED_SUFFIX = '-release.aar'
const SOURCES_PATH = __dirname + '/sources/'
const DECOMPILED_PATH = __dirname + '/decompiled/'

function handleEntry(entry) {
	const isDirectory = entry.path.endsWith('/')
	if (isDirectory) entry.autodrain()
	else {
		if (entry.path.endsWith('.java')) {
			const outputPath = SOURCES_PATH + entry.path
			mkdirp(path.dirname(outputPath), err => {
				if (err) throw err
				entry.pipe(fs.createWriteStream(outputPath))
			})
		}
		else entry.autodrain()
	}
}
rmdir(SOURCES_PATH, err => {
	console.log('Decompiling')
	const s = new Simultaneity
	for (const fileName of COMPILED_LIBARIES) {
		const file = LIBRARY_PREFIX + fileName + COMPILED_SUFFIX
		s.addTask(() => {
			fernflower(file, DECOMPILED_PATH + fileName)
				.then(decompiledDir => {
					fs.createReadStream(decompiledDir + '/classes.jar').pipe(unzip.Parse())
						.on('entry', handleEntry)
						.on('close', () => {
							console.log('Decompiled ' + fileName)
							s.taskFinished()
						})
				})
		})
	}
	s.callback(() => {
		console.log('Unzipping sources on top of decompiled files')
		for (const fileName of LIBRARIES) {
			const file = LIBRARY_PREFIX + fileName + LIBRARY_SUFFIX
			fs.createReadStream(file).pipe(unzip.Parse())
				.on('entry', handleEntry)
		}
	})
})