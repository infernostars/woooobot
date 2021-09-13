// Modules
const fs = require("fs").promises;
const {twows} = require("./config.json");
const {getTime, logMessage, sendMessage} = require("./helpers.js");
const technicals = require("./technicals.js");
const twists = require("./twists.js");
// Other variables
const twowPath = twows["Sample TWOW"]; // Only works for a single TWOW.
let status = require(`${twowPath}/status.json`);
const {seasons, channels: {prompts}} = require(`${twowPath}/twowConfig.json`);
const seasonPath = `${twowPath}/${seasons[status.currentSeason - 1]}`;
const {rounds} = require(`${seasonPath}/seasonConfig.json`);
const roundPath = `${seasonPath}/${rounds[status.currentRound - 1]}`;
const {prompt, technicals: roundTechnicals, twists: roundTwists} = require(`${roundPath}/roundConfig.json`);
let responses = require(`${roundPath}/responses.json`);
// Functions
exports.initResponding = function () {
	logMessage("Responding period started.");
	status.phase = "responding";
	fs.writeFile(`${twowPath}/status.json`, JSON.stringify(status, null, '\t'));
	sendMessage(prompts, `Round ${status.currentRound} Prompt:\n${prompt}`, true);
};
exports.logResponse = function (message, user) {
	let messageData = {
		time: getTime(message.createdAt),
		text: message.content,
		technical: roundTechnicals.reduce((passes, name) => {
			return passes && technicals[name].check(message.content);
		}, true),
		twist: roundTwists.reduce((message, name) => {
			return twists[name].execute(message);
		}, message.content)
	};
	if (messageData.technical === false) {
		sendMessage(user.dmChannel, `Your response (\`${message}\`) failed a technical.\nIt has not been recorded; please submit a better one.`);
	}
	responses[user.id] = messageData;
	fs.writeFile(`${roundPath}/responses.json`, JSON.stringify(responses, null, '\t'));
	sendMessage(user.dmChannel, `Your response (\`${message}\`) has been recorded.`);
};