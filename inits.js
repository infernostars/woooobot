// Modules
const fs = require("fs").promises;
const {execSync} = require("child_process");
const {logMessage, toTimeString, toUnixTime, save} = require("./helpers.js");
// Data
const {twowPath} = require("./config.json"); // TODO: Add support for multiple TWOWs
const status = require(twowPath + "status.json");
let {currentSeason, currentRound, seasonPath, roundPath} = status;
const {seasons} = require(twowPath + "twowConfig.json");
const {nextSeason = {}, nextRound = {}} = require(twowPath + "new.json");
// Season-specific
const seasonConfig = require(seasonPath + "seasonConfig.json");
const {rounds} = seasonConfig;
const seasonContestants = require(seasonPath + "seasonContestants.json");
// Round-specific
const roundConfig = require(roundPath + "roundConfig.json");
const contestants = require(roundPath + "contestants.json");
exports.initRound = async function (newRoundName) {
	// If final round
	if (contestants.prize.length + contestants.alive.length <= 1) {
		logMessage("No rounds needed, starting new season");
		await exports.initSeason();
	}
	// Start new round
	currentRound = newRoundName ?? Object.keys(rounds)[Object.keys(rounds).indexOf(currentRound) + 1];
	if (currentRound == null) {
		// A sensible default; breaks after in-between rounds, but survives extra-descriptive round names
		currentRound = "Round " + (Object.keys(rounds).length + 1);
		seasonConfig.rounds[currentRound] = currentRound + "/";
		await save(seasonPath + "seasonConfig.json", seasonConfig);
	}
	roundPath = seasonPath + rounds[currentRound];
	status.currentRound = currentRound;
	status.roundPath = roundPath;
	await save(twowPath + "status.json", status);
	logMessage("New round started: " + currentRound);
	// Create new files
	await fs.mkdir(roundPath);
	await fs.mkdir(roundPath + "results/");
	await fs.mkdir(roundPath + "screens/");
	Object.assign(roundConfig, {
		round: currentRound,
		prompt: "",
		rDeadline: toTimeString(toUnixTime(roundConfig.vDeadline) + seasonConfig.deadlines[0] * 86400),
		vDeadline: toTimeString(toUnixTime(roundConfig.rDeadline) + seasonConfig.deadlines[1] * 86400)
	}, nextRound);
	await save(roundPath + "roundConfig.json", roundConfig);
	contestants.responseCount = {};
	contestants.dead = [];
	contestants.dnp = [];
	await save(roundPath + "contestants.json", contestants);
	await save(roundPath + "responses.json", []);
	await save(roundPath + "votes.json", {});
	await save(roundPath + "screens.json", {
		version: 1,
		sectionScreens: {},
		screenSections: {},
		screenResponses: {}
	});
};
exports.initSeason = async function () { // Export unused, kept for consistency
	// Start new season
	const oldPath = seasonPath;
	const seasonNames = Object.keys(seasons);
	currentSeason = seasonNames[seasonNames.indexOf(currentSeason) + 1];
	seasonPath = twowPath + seasons[currentSeason];
	status.currentSeason = currentSeason;
	status.seasonPath = seasonPath; // Maybe combine last few lines with double assignments?
	await save(twowPath + "status.json", status);
	logMessage("New season started: " + currentSeason);
	// Create new files
	await fs.mkdir(seasonPath);
	await fs.mkdir(seasonPath + "books/");
	await fs.copyFile(oldPath + "graphics.js", seasonPath + "graphics.js");
	Object.assign(seasonConfig, {
		season: currentSeason,
		rounds: {
			"Round 1": "Round 1/"
		}
	}, nextSeason);
	await save(seasonPath + "seasonConfig.json", seasonConfig);
	seasonContestants.names = {};
	seasonContestants.bookPaths = {};
	await save(seasonPath + "seasonContestants.json", seasonContestants);
	// Build graphics.js
	if (fs.exists(oldPath + "package.json")) {
		await fs.copyFile(oldPath + "package.json", seasonPath + "package.json");
		try {
			execSync("pnpm i", {stdio: "inherit"}); // TODO: Allow npm
		} catch (e) {
			logMessage(`[E] Failed to install ${e}`, true);
		}
	}
};