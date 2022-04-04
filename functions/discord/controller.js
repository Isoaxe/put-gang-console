import admin from "firebase-admin";
import { Client, Intents } from "discord.js";
import { GANGSTA_ID, SUPER_GANGSTA_ID } from "./../util/constants.js";

// Test function to get started with Discord.
export async function role(req, res) {
  try {
    // Create a new client instance
    const client = new Client({
      intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS],
    });

    // Login to Discord with your client's token
    client.login(process.env.DISCORD_SECRET_TOKEN);

    // When the client is ready, run this code (only once)
    client.once("ready", () => {
      console.log("Ready!");
    });

    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isCommand()) return;

      const { commandName, member, guild } = await interaction;
      const { username, tag } = interaction.user;

      const now = new Date();
      const db = admin.firestore();
      const usersPath = db.collection("users");
      const hasRole = member._roles.length;

      // Assign Discord role to caller and grant access.
      if (commandName === "enter") {
        const findName = await usersPath.where("discord", "==", username).get();
        const userFromName = findName.docs[0];

        if (hasRole) {
          // User already has a role assigned.
          await interaction.reply({
            content: "You already have access.",
            ephemeral: true,
          });
        } else if (!userFromName) {
          // User not found in Firestore.
          await interaction.reply({
            content: "Access denied. Set username in settings first.",
            ephemeral: true,
          });
        } else {
          // User found in Firestore...
          const userData = userFromName.data();
          const { membLvl, uid, expiryDate } = userData;
          const expiryDateMs = new Date(expiryDate).getTime();
          if (expiryDateMs < now) {
            // ...but subscription has expired.
            await interaction.reply({
              content: "Subscription expired. Please renew.",
              ephemeral: true,
            });
          } else {
            // ...and has paid, so set role.
            usersPath.doc(uid).set({ discord: tag }, { merge: true });
            if (membLvl === "watch") {
              member.roles.add(GANGSTA_ID);
            } else if (membLvl === "join") {
              member.roles.add(SUPER_GANGSTA_ID);
            }
            await interaction.reply({
              content: "Access granted.",
              ephemeral: true,
            });
          }
        }
      }

      // Remove access for users whose subscriptions have lapsed.
      if (commandName === "purge") {
        const findTag = await usersPath.where("discord", "==", tag).get();
        const userFromTag = findTag.docs[0];

        if (!hasRole) {
          // User does not have role.
          await interaction.reply({
            content: "You're not a current subscriber, let alone the admin!",
            ephemeral: true,
          });
        } else {
          // User has role...
          const userData = userFromTag.data();
          const { role } = userData;
          if (role !== "admin") {
            // ...but is not admin.
            await interaction.reply({
              content: "Hey! You need to be an admin to do that.",
              ephemeral: true,
            });
          } else {
            // ...and is admin.
            const expiredUsers = []; // Includes expired but no role.
            const usersRef = await usersPath.get();
            // Go through each Firestore user and check if expired.
            usersRef.forEach((doc) => {
              const { discord, expiryDate } = doc.data();
              const expiryDateMs = new Date(expiryDate).getTime();
              if (expiryDateMs < now) expiredUsers.push(discord);
            });
            const allMembers = await guild.members.fetch();
            const expiredMembers = []; // Same as expiredUsers, but <Member>.
            // Go through each expiredUser to find corresponding <Member>.
            expiredUsers.forEach((user) => {
              const member = allMembers.find((mem) => {
                const tag = `${mem.user.username}#${mem.user.discriminator}`;
                return tag === user;
              });
              expiredMembers.push(member);
            });
            // Filter out members without roles.
            const expiredWithRole = expiredMembers.filter(
              (mem) => mem._roles.length
            );
            const numExpired = expiredWithRole.length;
            // Remove all roles from members with role who have expired.
            expiredWithRole.forEach((mem) => {
              mem.roles.remove([GANGSTA_ID, SUPER_GANGSTA_ID]);
            });
            await interaction.reply({
              content: `Subscriptions removed: ${numExpired}`,
              ephemeral: true,
            });
          }
        }
      }
    });

    res.status(200).send({ success: "Discord bot reset!" });
  } catch (err) {
    handleError(res, err);
  }
}

// Standard error helper function.
function handleError(res, err) {
  return res.status(500).send({ error: `${err}` });
}