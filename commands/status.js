const Command = require('./command.js');
const PlexServer = require('../plex-server.js');
const TorrentManager = require('../torrent-manager.js');
const { MessageEmbed } = require('discord.js');

class Status extends Command {

  #interaction;
  
  constructor(interaction) {
    super(
      'status',
      'Gets the status of the torrent bot.'
    );

    this.#interaction = interaction;
  }

  async execute() {
    // Defer the reply for later
    await this.#interaction.deferReply();

    const statusMessage = new MessageEmbed({
      title: `Ryan's Plex Bot Status`,
      description: `For more information, message me on Discord.`,
      color: 'BLUE'
    });

    // Get available space for Movies
    const movies = await PlexServer.checkSpace(TorrentManager.Type.MOVIE);
    if(movies != undefined)
      statusMessage.addField('Movie Space Left', `${Math.round(movies.available / 1000000000)} GB`, true);

    // Get space for TV shows
    const shows = await PlexServer.checkSpace(TorrentManager.Type.TV);
    if(shows != undefined)
      statusMessage.addField('TV Space Left', `${Math.round(shows.available / 1000000000)} GB`, true);

    // Get the list of active torrents
    const torrents = await TorrentManager.getActiveTorrents();
    var torrentList = '';
    for(const torrent of torrents) {
      torrentList += `${torrent.name} | [${Math.round(torrent.progress * 100)}% complete]\n`;
    }
    statusMessage.addField('Active Torrents', torrentList != '' ? torrentList : '[NONE]', false);

    this.#interaction.editReply({ embeds: [statusMessage] });
  }

}

module.exports = Status;