const fs = require('fs')
const rmdir = require('rmdir')
const unzip = require('unzip')

const LIBRARY_PREFIX = __dirname + '/ftc_app/ftc_app-beta/libs/'
const LIBRARIES = ['FtcCommon', 'Hardware', 'RobotCore']
const LIBRARY_SUFFIX = '-release-sources.jar'
const SOURCES_PATH = __dirname + '/sources/'

rmdir(SOURCES_PATH, err => {
	fs.mkdir(SOURCES_PATH, err => {
		if (err) throw err
		for (const library of LIBRARIES) {
			fs.createReadStream(LIBRARY_PREFIX + library + LIBRARY_SUFFIX).pipe(unzip.Parse())
				.on('entry', entry => {
					const isDirectory = entry.path.endsWith('/')
					const outputPath = SOURCES_PATH + entry.path
					if (isDirectory) {
						if (!entry.path.startsWith('META-INF')) {
							try {
								fs.mkdirSync(outputPath)
							}
							catch (e) {
								if (!e.message.startsWith('EEXIST: file already exists, mkdir')) throw e
							}
						}
						else entry.autodrain()
					}
					else {
						if (entry.path.endsWith('.java')) entry.pipe(fs.createWriteStream(outputPath))
						else entry.autodrain()
					}
				})
		}
	})
})