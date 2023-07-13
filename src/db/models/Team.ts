import {
	Column,
	CreateDateColumn,
	Entity,
	JoinTable,
	ManyToMany,
	OneToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Match } from "./Match";

export const timezones = [
	"-12UTC",
	"-11UTC",
	"-10UTC",
	"-9UTC",
	"-8UTC",
	"-7UTC",
	"-6UTC",
	"-5UTC",
	"-4UTC",
	"-3UTC",
	"-2UTC",
	"-1UTC",
	"0UTC",
	"1UTC",
	"2UTC",
	"3UTC",
	"4UTC",
	"5UTC",
	"6UTC",
	"7UTC",
	"8UTC",
	"9UTC",
	"10UTC",
	"11UTC",
	"12UTC",
] as const;

export type Timezone = (typeof timezones)[number];

@Entity({
	name: "teams",
})
export class Team {
	@PrimaryColumn("varchar")
	id: string;

	@Column("varchar")
	name: string;

	@Column({
		type: "enum",
		enum: timezones,
	})
	idealTimezone: Timezone;

	@OneToMany(() => User, (user) => user.ownedTeams, {
		cascade: true,
	})
	owner: User;

	@ManyToMany(() => User, (user) => user.joinedTeams)
	@JoinTable()
	members: User[];

	@ManyToMany(() => Match, (lobby) => lobby.teams)
	@JoinTable()
	matches: Match[];

	@CreateDateColumn({
		type: "timestamp",
	})
	createdAt: Date;

	@UpdateDateColumn({
		type: "timestamp",
	})
	updatedAt: Date;
}
