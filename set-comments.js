const fs = require('fs')
const Simultaneity = require(__dirname + '/lib/simultaneity.js')

const ROOT_DIR = __dirname + '/comments'
const COMMENTS_ENDING = '.txt'
const SOURCE_DIR = __dirname + '/sources'
function walkDir(dir) {
	fs.readdir(dir, (err, files) => {
		if (err) throw err
		for (const file of files) {
			const fullPath = dir + '/' + file
			if (file.endsWith(COMMENTS_ENDING)) {
				replaceComments(fullPath.substring(ROOT_DIR.length, fullPath.length - COMMENTS_ENDING.length))
			}
			else walkDir(fullPath)
		}
	})
}
const METHOD_MATCH = /^\.method ([a-zA-Z0-9.\[\]]+) ([a-zA-Z0-9_$]+)\(((?:[a-zA-Z0-9.\[\]]+)(?:, [a-zA-Z0-9.\[\]]+)*)?\)\n/m
const FIELD_MATCH = /^\.field ([a-zA-Z0-9_$]+)\n/m
const CONSTRUCTOR_MATCH = /^.constructor \(((?:[a-zA-Z0-9.\[\]]+)(?:, [a-zA-Z0-9.\[\]]+)*)?\)\n/m
const MODIFIERS = '(?:\\n|^)\\s*(?:(?:(?:@?[A-Z][a-zA-Z]*(?:\\([^)]*\\))?)|(?:[a-z]+))\\s+)*'
RegExp.escape = str => {
	return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}
const WHITESPACE = /^\s$/
function replaceComments(classFileName) {
	const javaFile = SOURCE_DIR + classFileName + '.java'
	const s = new Simultaneity
	let source
	s.addTask(() => {
		fs.readFile(javaFile, 'utf8', (err, data) => {
			if (err) throw err
			source = data
			s.taskFinished()
		})
	})
	let comments
	s.addTask(() => {
		fs.readFile(ROOT_DIR + classFileName + '.txt', 'utf8', (err, data) => {
			if (err) throw err
			comments = data
			s.taskFinished()
		})
	})
	s.callback(() => {
		console.log('Replacing comments for: ' + classFileName)
		const className = classFileName.substring(classFileName.lastIndexOf('/') + 1)
		for (const replacementBlock of comments.split('\n\n')) {
			try {
				let sourceMatch
				const signature = METHOD_MATCH.exec(replacementBlock)
				if (signature) {
					const returnType = signature[1]
					const methodName = signature[2]
					const joinedArguments = signature[3]
					let arguments
					if (joinedArguments) arguments = joinedArguments.split(', ')
					else arguments = []
					let matchString = MODIFIERS +
						RegExp.escape(returnType) +
						'\\s+' +
						RegExp.escape(methodName) +
						'\\s*\\('
					for (let i = 0; i < arguments.length; i++) {
						const argument = arguments[i]
						matchString += '\\s*' +
							RegExp.escape(argument) +
							'\\s+' +
							'[a-zA-Z0-9$_]+\\s*'
						if (i !== arguments.length - 1) matchString += ','
					}
					if (!arguments.length) matchString += '\\s*'
					matchString += '\\)'
					sourceMatch = new RegExp(matchString)
				}
				else if (replacementBlock.substring(0, replacementBlock.indexOf('\n')) === '.class') {
					sourceMatch = new RegExp(
						MODIFIERS + '(?:(?:class)|(?:interface)|(?:enum))\\s+' +
						RegExp.escape(className)
					)
				}
				else {
					const signature = FIELD_MATCH.exec(replacementBlock)
					if (signature) {
						const fieldName = signature[1]
						sourceMatch = new RegExp(
							MODIFIERS +
							'(?:[a-zA-Z0-9.\\[\\]]+)\\s+' +
							RegExp.escape(fieldName) +
							'\\s*[;=]'
						)
					}
					else {
						const signature = CONSTRUCTOR_MATCH.exec(replacementBlock)
						if (signature) {
							const joinedArguments = signature[1]
							let arguments
							if (joinedArguments) arguments = joinedArguments.split(', ')
							else arguments = []
							let matchString = MODIFIERS +
								RegExp.escape(className) +
								'\\s*\\('
							for (let i = 0; i < arguments.length; i++) {
								const argument = arguments[i]
								matchString += '\\s*' +
									RegExp.escape(argument) +
									'\\s+' +
									'[a-zA-Z0-9$_]+\\s*'
								if (i !== arguments.length - 1) matchString += ','
							}
							if (!arguments.length) matchString += '\\s*'
							matchString += '\\)'
							sourceMatch = new RegExp(matchString)
						}
						else throw new Error('Failed to identify comment type')
					}
				}
				sourceMatch = sourceMatch.exec(source)
				const matchIndex = sourceMatch.index
				let testIndex
				for (testIndex = matchIndex - 1; WHITESPACE.test(source[testIndex]); testIndex--);
				const existingJavadoc = source[testIndex - 1] === '*' && source[testIndex] === '/'
				const sourceSignature = sourceMatch[0].substring(1)
				let startIndex
				for (startIndex = 0; WHITESPACE.test(sourceSignature[startIndex]); startIndex++);
				const indentation = sourceSignature.substring(0, startIndex).replace(/\n/g, '')
				const comment = replacementBlock.substring(replacementBlock.indexOf('\n') + 1)
				let javadocText = '\n' + indentation + '/**'
				for (const commentLine of comment.split('\n')) javadocText += '\n' + indentation + ' * ' + commentLine
				javadocText += '\n' + indentation + ' ' + '*/'
				source = source.substring(0, matchIndex) + javadocText + source.substring(matchIndex)
				if (existingJavadoc) {
					const originalJavadocStart = source.lastIndexOf('\n' + indentation + '/**', matchIndex - 1) //go back one more so the new Javadoc isn't caught
					source = source.substring(0, originalJavadocStart) + source.substring(matchIndex)
				}
			}
			catch (e) {
				console.error('Error occurred while parsing block:')
				console.error(replacementBlock)
				throw e
			}
		}
		fs.writeFile(javaFile, source, err => {
			if (err) throw err
		})
	})
}
walkDir(ROOT_DIR)