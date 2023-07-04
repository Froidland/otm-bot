import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToMany,
	ManyToOne,
	OneToOne,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { Tournament } from "./Tournament";
import { Team } from "./Team";

const matchStatuses = ["Pending", "Ongoing", "Completed"] as const;
const tournamentStages = [
	"Tryouts", // This is a special case for Tryouts type of tournament.
	"Qualifiers",
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

@Entity({
	name: "matches",
})
export class Match {
	@PrimaryColumn("varchar")
	id: string;

	@ManyToOne(() => Tournament, (tournament) => tournament.lobbies)
	tournament: Tournament;

	@Column("varchar")
	customId: string;

	@Column("timestamp")
	schedule: Date;

	@Column("enum", {
		default: "Pending",
		enum: matchStatuses,
	})
	status: MatchStatus;

	@Column("enum", {
		enum: tournamentStages,
	})
	stage: TournamentStage;

	@Column("varchar", {
		nullable: true,
	})
	mpLink?: string;

	@ManyToOne(() => Team, (team) => team.id)
	team1: Team;

	@ManyToOne(() => Team, (team) => team.id)
	team2: Team;

	@ManyToMany(() => Team, (team) => team.joinedLobbies)
	teams: Team[];

	@CreateDateColumn({
		type: "timestamp",
	})
	createdAt: Date;

	@UpdateDateColumn({
		type: "timestamp",
	})
	updatedAt: Date;
}
