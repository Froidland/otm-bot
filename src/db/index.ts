import { logger } from "@/utils";
import { PrismaClient } from "@prisma/client";

export const tournamentTypes = ["OneVsOne", "TeamBased"] as const;
export const winConditions = ["Accuracy", "MissCount", "Score"] as const;
export const scoringTypes = ["ScoreV1", "ScoreV2"] as const;
export const matchStatuses = ["Pending", "Ongoing", "Completed"] as const;
export const tournamentStages = [
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

const db = getPrismaClient();

export default db;
