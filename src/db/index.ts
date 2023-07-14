import { logger } from "@/utils";
import { Prisma, PrismaClient } from "@prisma/client";

const tournamentTypes = [
	"BattleRoyale",
	"OneVsOne",
	"TeamBased",
	"Tryouts",
	"Custom",
] as const;
const winConditions = ["Accuracy", "MissCount", "Score"] as const;
const scoringTypes = ["ScoreV1", "ScoreV2"] as const;
const matchStatuses = ["Pending", "Ongoing", "Completed"] as const;
const tournamentStages = [
	"Groups",
	"RoundOf256",
	"RoundOf128",
	"RoundOf64",
	"RoundOf32",
	"RoundOf16",
	"Quarterfinals",
	"Semifinals",
	"Finals",
	"GrandFinals",
] as const;

export type MatchStatus = (typeof matchStatuses)[number];
export type TournamentStage = (typeof tournamentStages)[number];
export type TournamentType = (typeof tournamentTypes)[number];
export type WinCondition = (typeof winConditions)[number];
export type ScoringType = (typeof scoringTypes)[number];

const db = getPrismaClient();

if (process.env.NODE_ENV === "development") {
}

export default db;

function getPrismaClient() {
	if (process.env.NODE_ENV === "development") {
		logger.debug("Using prisma client with logging enabled.");
		
		const client = new PrismaClient({
			log: [
				{
					level: "query",
					emit: "event",
				},
				{
					level: "info",
					emit: "event",
				},
				{
					level: "warn",
					emit: "event",
				},
			],
		});

		client.$on("info", (e) => {
			logger.debug(e.message);
		});

		client.$on("warn", (e) => {
			logger.warn(e.message);
		});

		client.$on("query", (e) => {
			logger.debug(e.duration + "ms " + e.query);
		});

		return client;
	}

	return new PrismaClient();
}
