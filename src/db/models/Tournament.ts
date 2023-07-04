import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Match } from "./Match";

const tournamentTypes = [
	"BattleRoyale",
	"OneVsOne",
	"TeamBased",
	"Tryouts",
	"Custom",
] as const;
const winConditions = ["Accuracy", "MissCount", "Score"] as const;
const scoringTypes = ["ScoreV1", "ScoreV2"] as const;

export type TournamentType = (typeof tournamentTypes)[number];
export type WinCondition = (typeof winConditions)[number];
export type ScoringType = (typeof scoringTypes)[number];

@Entity({
	name: "tournaments",
})
export class Tournament {
	@PrimaryColumn({
		type: "varchar",
	})
	id: string;

	@Column("varchar")
	name: string;

	@Column("varchar")
	acronym: string;

	@Column("varchar")
	serverId: string;

	@Column("timestamp")
	startDate: Date;

	@Column("timestamp")
	registrationEndDate: Date;

	@Column("varchar")
	staffChannelId: string;

	@Column("varchar")
	mappoolerChannelId: string;

	@Column("varchar")
	refereeChannelId: string;

	@Column("varchar")
	scheduleChannelId: string;

	@Column("varchar")
	playerChannelId: string;

	@Column("varchar")
	staffRoleId: string;

	@Column("varchar")
	mappoolerRoleId: string;

	@Column("varchar")
	refereeRoleId: string;

	@Column("varchar")
	playerRoleId: string;

	@ManyToOne(() => User, (user) => user.createdTournaments, {
		cascade: true,
	})
	creator: User;

	@Column("enum", {
		enum: winConditions,
	})
	winCondition: WinCondition;

	@Column("enum", {
		enum: scoringTypes,
	})
	scoring: ScoringType;

	@Column("enum", {
		enum: tournamentTypes,
	})
	type: TournamentType;

	@Column("int")
	teamSize: number;

	@Column("int")
	lobbyTeamSize: number;

	@OneToMany(() => Match, (lobby) => lobby.tournament, {
		cascade: true,
	})
	lobbies: Match[];

	@CreateDateColumn({
		type: "timestamp",
	})
	createdAt: Date;

	@UpdateDateColumn({
		type: "timestamp",
	})
	updatedAt: Date;
}
