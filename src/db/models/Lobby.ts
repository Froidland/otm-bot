import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToMany,
	ManyToOne,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { Tournament } from "./Tournament";
import { Team } from "./Team";

@Entity({
	name: "lobbies",
})
export class Lobby {
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
		enum: ["Pending", "Ongoing", "Completed"],
	})
	status: "Pending" | "Ongoing" | "Completed";

	@Column("enum", {
		enum: [
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
		],
	})
	stage:
		| "Groups"
		| "RoundOf256"
		| "RoundOf128"
		| "RoundOf64"
		| "RoundOf32"
		| "RoundOf16"
		| "Quarterfinals"
		| "Semifinals"
		| "Finals"
		| "GrandFinals";

	@Column("varchar")
	mpLink?: string;

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
