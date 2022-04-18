require('dotenv').config()
const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// Initialize commands
const commands = new Map([
  ['status', require('./commands/status.js')],
  ['movie', require('./commands/movie.js')],
  ['tv', require('./commands/tv.js')]
]);

client.on('ready', () => {
  // Check for our commands and add them if they don't exist
  client.guilds.fetch().then((guilds) => {
    for(const [snowflake, guild] of guilds.entries()) {
        client.application.commands.set([
          {
            name: 'status',
            description: 'Bot/Plex health check and status.'
          },
          {
            name: 'movie',
            description: 'Adds a movie to the Plex server.',
            options: [
                {
                    type: 3,
                    name: 'magnet',
                    description: 'Magnet link for the torrent.',
                    required: true
                }
            ]
          }, 
          {
            name: 'tv',
            description: 'Adds a TV show to the Plex server.',
            options: [
                {
                    type: 3,
                    name: 'magnet',
                    description: 'Magnet link for the torrent.',
                    required: true
                }
            ],
          }
        ], guild.id).then().catch();
    }
  });
  console.log('Bot started successfully!');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  // Make sure user has permission to download torrents
  if(!hasRole(interaction.member, 'plex')) {
    await interaction.reply(`You don't have permission to torrent files.`);
    return;
  }

  // Check for missing command handler - we should never really get here
  if(!commands.has(interaction.commandName)) {
    await interaction.reply(`I'm not sure how to handle that command.`);
    return;
  }

  try {
    const command = new (commands.get(interaction.commandName))(interaction);
    command.execute();
  } catch(exception) {
    interaction.reply(`Something went wrong. Please try again later!`);
    console.log(exception);
  }
});

client.login(process.env.DISCORD_TOKEN);


/**
 * UTILITY FUNCTIONS
 */
function hasRole(member, roleName) {
  for(const [snowflake, role] of member.roles.cache.entries()) {
    if(role.name.toLowerCase() == roleName.toLowerCase()) return true;
  }
  return false;
}