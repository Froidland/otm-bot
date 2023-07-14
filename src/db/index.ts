import { PrismaClient } from "@prisma/client";

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

const db = new PrismaClient();

export default db;
