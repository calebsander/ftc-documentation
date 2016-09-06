/*
	Runs multiple asynchronous tasks with a callback for when they have all finished
	Usage:
	let s = new Simultaneity
	s.addTask(() => {
		asynchSomething(() => {
			...
			s.taskFinished()
		})
	})
	...
	s.callback(() => {...})
*/
module.exports = class {
	constructor() {
		this.tasks = new Set
		this.finishedCount = 0
	}
	//Adds a routine to be executed to start an asynchronous task
	addTask(start) {
		this.tasks.add(start)
	}
	//Should be called whenever an asynchronous task completes
	taskFinished() {
		this.finishedCount++
		if (this.finishedCount === this.tasks.size) this.done() //all tasks have ended
	}
	//Set a callback for when all the tasks finish and start all the tasks
	callback(callback) {
		this.done = callback
		try {
			for (const startTask of this.tasks) startTask()
		}
		catch (e) {
			callback()
			throw e
		}
	}
}